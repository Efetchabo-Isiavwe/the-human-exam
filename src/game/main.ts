import { AUTO, Events, Game as PhaserGame, Scale, Scene } from 'phaser';
import { CANDIDATES, CandidateData, GAME_CONFIG, GAME_HEIGHT, GAME_WIDTH, ROOM_OBJECTS, RoomObjectData } from './config';
import { DESK_POSITIONS, CINEMATIC_CAMERA_WAYPOINTS } from './levels';
import { playSFX } from './audio';

export { GAME_CONFIG, GAME_WIDTH, GAME_HEIGHT };

// ---------------------------------------------------------------------------
// EVENT BUS — shared React <-> Phaser bridge (named export)
// ---------------------------------------------------------------------------
export const EventBus = new Events.EventEmitter();

// Event Name Constants
export const EVENTS = {
    PHASE_CHANGED: 'phase-changed',
    TIME_TICK: 'time-tick',
    CANDIDATE_INTERACT: 'candidate-interact',
    ROOM_INVESTIGATE: 'room-investigate',
    CLUE_DISCOVERED: 'clue-discovered',
    RELATIONSHIP_UPDATED: 'relationship-updated',
    SUBMIT_EXAM: 'submit-exam',
    GAME_RESTART: 'game-restart',
    TOGGLE_UV: 'toggle-uv',
    SCENE_READY: 'current-scene-ready'
} as const;

export class Game extends Scene {
    private remainingSeconds: number = GAME_CONFIG.examDurationSeconds;
    private timerEvent?: Phaser.Time.TimerEvent;
    private isPaused: boolean = false;
    private isUVMode: boolean = false;
    private isCinematic: boolean = true;
    private currentWaypointIndex: number = 0;

    // Visual Game Object containers
    private deskContainers: Map<string, Phaser.GameObjects.Container> = new Map();
    private candidateSprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private roomObjectContainers: Map<string, Phaser.GameObjects.Container> = new Map();
    private uvOverlayGraphics!: Phaser.GameObjects.Graphics;
    private roomTimerDisplay?: Phaser.GameObjects.Text;
    private ambientDustParticles!: Phaser.GameObjects.Graphics;
    private alarmLightGraphics!: Phaser.GameObjects.Graphics;
    private isAlarmActive: boolean = false;

    constructor() {
        super('Game');
    }

    preload() {
        // Pre-packaged audio if present
        if (this.load) {
            this.load.audio('sfx_button', 'assets/audio/sfx_button.mp3');
            this.load.audio('sfx_win', 'assets/audio/sfx_win.mp3');
            this.load.audio('sfx_gameover', 'assets/audio/sfx_gameover.mp3');
        }
    }

    create() {
        this.cameras.main.setBackgroundColor('#07090e');
        this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Build Visual Examination Chamber
        this.drawChamberFloorAndWalls();
        this.drawObservationWindow();
        this.drawCeilingLightingFixtures();
        this.drawCentralDigitalBoard();
        this.drawRoomInteractiveObjects();
        this.drawDesksAndCandidates();
        this.drawSecurityCameras();

        // Overlay Layers
        this.ambientDustParticles = this.add.graphics().setDepth(25);
        this.uvOverlayGraphics = this.add.graphics().setDepth(28).setAlpha(0);
        this.alarmLightGraphics = this.add.graphics().setDepth(29).setAlpha(0);

        // Setup Countdown Timer
        this.setupExamTimer();

        // Setup React <-> Phaser EventBus listeners
        this.setupEventBusListeners();

        // Notify React that Game Scene is mounted and ready
        EventBus.emit(EVENTS.SCENE_READY, this);

        // Start Cinematic sequence if in cinematic mode
        this.startCinematicSequence();

        // Shutdown Cleanup
        this.events.once('shutdown', () => {
            if (this.timerEvent) this.timerEvent.remove();
            this.time.removeAllEvents();
            this.tweens.killAll();
            this.input.removeAllListeners();
            EventBus.removeAllListeners();
        });
    }

    private drawChamberFloorAndWalls() {
        const g = this.add.graphics().setDepth(1);

        // Main floor with subtle geometric grid lines
        g.fillStyle(0x0c101c, 1);
        g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Geometric executive floor tiling pattern
        g.lineStyle(1, 0x161e32, 0.4);
        for (let x = 0; x < GAME_WIDTH; x += 48) {
            g.lineBetween(x, 0, x, GAME_HEIGHT);
        }
        for (let y = 0; y < GAME_HEIGHT; y += 48) {
            g.lineBetween(0, y, GAME_WIDTH, y);
        }

        // Central circular emblem on floor (Executive Council seal — geometric West African motif)
        g.lineStyle(2, 0xd4af37, 0.25);
        g.strokeCircle(512, 384, 180);
        g.lineStyle(1, 0x1e1b4b, 0.35);
        g.strokeCircle(512, 384, 160);
        g.strokeCircle(512, 384, 200);

        // Outer chamber boundary walls
        g.lineStyle(4, 0x1f2a44, 1);
        g.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);

        // Vignette shadows at corners
        const vignette = this.add.graphics().setDepth(26);
        vignette.fillStyle(0x000000, 0.35);
        vignette.fillRect(0, 0, GAME_WIDTH, 50);
        vignette.fillRect(0, GAME_HEIGHT - 50, GAME_WIDTH, 50);
        vignette.fillRect(0, 0, 50, GAME_HEIGHT);
        vignette.fillRect(GAME_WIDTH - 50, 0, 50, GAME_HEIGHT);
    }

    private drawObservationWindow() {
        const container = this.add.container(512, 35).setDepth(5);
        const g = this.add.graphics();

        // Dark reflective glass frame
        g.fillStyle(0x05070a, 0.95);
        g.fillRect(-220, -25, 440, 50);
        g.lineStyle(2, 0x24324f, 1);
        g.strokeRect(-220, -25, 440, 50);

        // Subtle gold glow along mirror frame
        g.lineStyle(1, 0xd4af37, 0.35);
        g.lineBetween(-215, 23, 215, 23);

        // Guard silhouettes behind one-way glass
        g.fillStyle(0x0c1322, 0.85);
        // Guard 1 (Invigilator seated with clipboard)
        g.fillCircle(-80, -2, 10);
        g.fillRect(-92, 8, 24, 16);

        // Guard 2 (Security standing)
        g.fillCircle(80, -5, 11);
        g.fillRect(66, 6, 28, 18);

        // Blinking monitor screens in observation room
        g.fillStyle(0x00e676, 0.6);
        g.fillRect(-120, 2, 8, 6);
        g.fillStyle(0x00f0ff, 0.6);
        g.fillRect(115, 0, 10, 8);

        const text = this.add.text(0, -14, 'OBSERVATION DECK // LIVE BIOMETRIC EVALUATION', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#8e9bb0'
        }).setOrigin(0.5);

        // Lagos harbor skyline silhouette faintly visible through the tinted glass
        const skyline = this.add.graphics();
        skyline.fillStyle(0x0f172a, 0.55);
        const towers = [
            { x: -195, w: 10, h: 14 }, { x: -178, w: 14, h: 22 }, { x: -158, w: 9, h: 12 },
            { x: -140, w: 16, h: 26 }, { x: -115, w: 11, h: 16 }, { x: -95, w: 13, h: 20 },
            { x: 100, w: 12, h: 18 }, { x: 120, w: 15, h: 24 }, { x: 145, w: 10, h: 14 },
            { x: 165, w: 13, h: 20 }, { x: 185, w: 9, h: 12 }, { x: 200, w: 14, h: 22 }
        ];
        towers.forEach(t => skyline.fillRect(t.x, 25 - t.h, t.w, t.h));
        skyline.fillStyle(0xd4af37, 0.35);
        towers.forEach((t, i) => { if (i % 3 === 0) skyline.fillRect(t.x + 2, 25 - t.h + 3, 2, 2); });
        container.add([skyline, g, text]);

        // Interactive click on Observation Window
        const hitZone = this.add.rectangle(0, 0, 440, 50, 0x000000, 0.001)
            .setInteractive({ cursor: 'pointer' })
            .on('pointerdown', () => {
                playSFX('click');
                const obj = ROOM_OBJECTS.find(o => o.id === 'obj_observation_mirror');
                if (obj) EventBus.emit(EVENTS.ROOM_INVESTIGATE, obj);
            });
        container.add(hitZone);
    }

    private drawCeilingLightingFixtures() {
        const g = this.add.graphics().setDepth(2);

        // Conical lighting beams down onto each desk
        DESK_POSITIONS.forEach(desk => {
            g.fillStyle(0xfff8e1, 0.04);
            g.beginPath();
            g.moveTo(desk.x, 20);
            g.lineTo(desk.x - 70, desk.y + 40);
            g.lineTo(desk.x + 70, desk.y + 40);
            g.closePath();
            g.fillPath();

            // Spotlight soft circle around desk
            g.fillStyle(0xd4af37, 0.05);
            g.fillCircle(desk.x, desk.y, 60);
        });
    }

    private drawCentralDigitalBoard() {
        const container = this.add.container(512, 115).setDepth(6);
        const g = this.add.graphics();

        // Digital display backing
        g.fillStyle(0x090d18, 0.95);
        g.fillRect(-190, -45, 380, 90);
        g.lineStyle(2, 0xd4af37, 0.8);
        g.strokeRect(-190, -45, 380, 90);

        // Gold corner brackets
        g.lineStyle(2, 0xffe57f, 1);
        g.lineBetween(-190, -35, -190, -45);
        g.lineBetween(-190, -45, -175, -45);
        g.lineBetween(190, -35, 190, -45);
        g.lineBetween(190, -45, 175, -45);
        g.lineBetween(-190, 35, -190, 45);
        g.lineBetween(-190, 45, -175, 45);
        g.lineBetween(190, 35, 190, 45);
        g.lineBetween(190, 45, 175, 45);

        const headerText = this.add.text(0, -30, 'THE HUMAN EXAM // CASE 01 — THE ROOM', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#d4af37'
        }).setOrigin(0.5);

        const timerDisplay = this.add.text(0, -5, 'TIME REMAINING: 60:00', {
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#f1f5f9'
        }).setOrigin(0.5);

        const statusText = this.add.text(0, 22, 'RULE 05: WHEN TIME EXPIRES, THE EXAMINATION ENDS.', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#e11d48'
        }).setOrigin(0.5);

        container.add([g, headerText, timerDisplay, statusText]);

        // Single authoritative timer source: keep a reference so the room
        // board always mirrors the exact same remaining time as the top HUD.
        this.roomTimerDisplay = timerDisplay;

        // Interactivity
        const hitZone = this.add.rectangle(0, 0, 380, 90, 0x000000, 0.001)
            .setInteractive({ cursor: 'pointer' })
            .on('pointerdown', () => {
                playSFX('click');
                const obj = ROOM_OBJECTS.find(o => o.id === 'obj_central_display');
                if (obj) EventBus.emit(EVENTS.ROOM_INVESTIGATE, obj);
            });
        container.add(hitZone);

        // Pulsing glow tween on timer text
        this.tweens.add({
            targets: timerDisplay,
            alpha: { from: 1, to: 0.75 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }

    private drawRoomInteractiveObjects() {
        ROOM_OBJECTS.forEach(obj => {
            if (obj.id === 'obj_central_display' || obj.id === 'obj_observation_mirror' || obj.id === 'obj_player_desk') {
                return; // Drawn separately with specialized visuals
            }

            const container = this.add.container(obj.x, obj.y).setDepth(8);
            const g = this.add.graphics();

            // Base object chassis
            g.fillStyle(0x131929, 0.95);
            g.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
            g.lineStyle(2, 0x2b3858, 1);
            g.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);

            // Object specific styling
            if (obj.interactionType === 'TERMINAL') {
                // CRT glowing screen
                g.fillStyle(0x041812, 1);
                g.fillRect(-35, -35, 70, 45);
                g.lineStyle(1, 0x00e676, 0.8);
                g.strokeRect(-35, -35, 70, 45);
                // Green prompt lines
                g.fillStyle(0x00e676, 0.8);
                g.fillRect(-30, -25, 30, 3);
                g.fillRect(-30, -15, 45, 3);
                g.fillRect(-30, -5, 20, 3);
            } else if (obj.interactionType === 'CABINET') {
                // Steel locker slats & brass rotary dial
                g.lineStyle(1, 0x3d4e73, 0.8);
                g.lineBetween(-35, -20, 35, -20);
                g.lineBetween(-35, 0, 35, 0);
                g.lineBetween(-35, 20, 35, 20);
                g.fillStyle(0xd4af37, 1);
                g.fillCircle(0, 5, 8);
            } else if (obj.id === 'obj_emergency_panel') {
                // Emergency breaker red switch
                g.fillStyle(0x8a1c27, 0.9);
                g.fillRect(-20, -20, 40, 40);
                g.lineStyle(1, 0xff3344, 1);
                g.strokeRect(-20, -20, 40, 40);
                g.fillStyle(0xffffff, 1);
                g.fillRect(-6, -12, 12, 24);
            } else if (obj.id === 'obj_water_dispenser') {
                // Water cooler bottle & tap
                g.fillStyle(0x1e88e5, 0.8);
                g.fillCircle(0, -20, 16);
                g.fillStyle(0xffffff, 0.6);
                g.fillRect(-4, 0, 8, 12);
            } else if (obj.id === 'obj_exit_door') {
                // Dual magnetic lock lights
                g.fillStyle(0xff3344, 0.9);
                g.fillCircle(-50, 0, 6);
                g.fillCircle(50, 0, 6);
            }

            const label = this.add.text(0, obj.height / 2 - 12, obj.name.toUpperCase(), {
                fontFamily: 'monospace',
                fontSize: '9px',
                color: '#8e9bb0'
            }).setOrigin(0.5);

            const iconText = this.add.text(0, -obj.height / 2 + 14, obj.iconSvg, {
                fontSize: '16px'
            }).setOrigin(0.5);

            container.add([g, label, iconText]);

            // Interactive Hover & Click
            const hitZone = this.add.rectangle(0, 0, obj.width, obj.height, 0x000000, 0.001)
                .setInteractive({ cursor: 'pointer' });

            hitZone.on('pointerover', () => {
                g.lineStyle(2, 0xd4af37, 1);
                g.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                label.setColor('#d4af37');
            });

            hitZone.on('pointerout', () => {
                g.lineStyle(2, 0x2b3858, 1);
                g.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                label.setColor('#8e9bb0');
            });

            hitZone.on('pointerdown', () => {
                playSFX('click');
                EventBus.emit(EVENTS.ROOM_INVESTIGATE, obj);
            });

            container.add(hitZone);
            this.roomObjectContainers.set(obj.id, container);
        });
    }

    private drawDesksAndCandidates() {
        DESK_POSITIONS.forEach(desk => {
            const isPlayer = desk.candidateNumber === 9;
            const candidateData = CANDIDATES.find(c => c.number === desk.candidateNumber);

            const container = this.add.container(desk.x, desk.y).setDepth(10);
            container.setRotation(desk.rotation);

            const g = this.add.graphics();

            // Desk Surface (Polished Dark Walnut with Gold Border)
            g.fillStyle(isPlayer ? 0x1a233a : 0x141a29, 0.98);
            g.fillRect(-desk.deskWidth / 2, -desk.deskHeight / 2, desk.deskWidth, desk.deskHeight);
            g.lineStyle(2, isPlayer ? 0xd4af37 : 0x273554, 1);
            g.strokeRect(-desk.deskWidth / 2, -desk.deskHeight / 2, desk.deskWidth, desk.deskHeight);

            // Pristine Blank Exam Paper on Desk
            const paperW = isPlayer ? 42 : 34;
            const paperH = isPlayer ? 54 : 44;
            g.fillStyle(0xf8fafc, 0.98);
            g.fillRect(-paperW / 2, -paperH / 2 + 2, paperW, paperH);
            g.lineStyle(1, 0xcfd8dc, 0.8);
            g.strokeRect(-paperW / 2, -paperH / 2 + 2, paperW, paperH);

            // Sleek Archival Pen beside paper
            g.fillStyle(0x111827, 1);
            g.fillRect(paperW / 2 + 5, -16, 4, 32);
            g.fillStyle(0xd4af37, 1);
            g.fillRect(paperW / 2 + 5, -16, 4, 4);

            // Candidate Nameplate & Number Badge
            const nameplate = this.add.text(0, desk.deskHeight / 2 - 10, desk.label, {
                fontFamily: 'monospace',
                fontSize: isPlayer ? '11px' : '9px',
                fontStyle: isPlayer ? 'bold' : 'normal',
                color: isPlayer ? '#d4af37' : '#94a3b8'
            }).setOrigin(0.5);

            container.add([g, nameplate]);

            // Candidate Seated Silhouette / Avatar
            if (!isPlayer && candidateData) {
                const charContainer = this.add.container(0, -desk.deskHeight / 2 - 16);
                const charG = this.add.graphics();

                // Candidate silhouette shoulders & head
                const colorVal = parseInt(candidateData.color.replace('#', ''), 16);
                charG.fillStyle(colorVal, 0.9);
                // Torso
                charG.fillRect(-18, 0, 36, 24);
                // Head
                charG.fillCircle(0, -10, 14);

                // Avatar Symbol / Nation Badge
                const avatarText = this.add.text(0, -10, candidateData.avatarSymbol, {
                    fontSize: '14px'
                }).setOrigin(0.5);

                charContainer.add([charG, avatarText]);
                container.add(charContainer);

                // Idle breathing & subtle shifting animation
                this.tweens.add({
                    targets: charContainer,
                    y: { from: -desk.deskHeight / 2 - 16, to: -desk.deskHeight / 2 - 19 },
                    duration: 1800 + (desk.candidateNumber * 150),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.candidateSprites.set(candidateData.id, charContainer);
            } else if (isPlayer) {
                // Glowing pulsating border on Player Desk to guide user
                this.tweens.add({
                    targets: container,
                    scaleX: { from: 1, to: 1.02 },
                    scaleY: { from: 1, to: 1.02 },
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            // Interactive Hitbox
            const hitZone = this.add.rectangle(0, 0, desk.deskWidth, desk.deskHeight + 40, 0x000000, 0.001)
                .setInteractive({ cursor: 'pointer' });

            hitZone.on('pointerover', () => {
                g.lineStyle(2, isPlayer ? 0x00e676 : 0xd4af37, 1);
                g.strokeRect(-desk.deskWidth / 2, -desk.deskHeight / 2, desk.deskWidth, desk.deskHeight);
                nameplate.setColor(isPlayer ? '#00e676' : '#d4af37');
            });

            hitZone.on('pointerout', () => {
                g.lineStyle(2, isPlayer ? 0xd4af37 : 0x273554, 1);
                g.strokeRect(-desk.deskWidth / 2, -desk.deskHeight / 2, desk.deskWidth, desk.deskHeight);
                nameplate.setColor(isPlayer ? '#d4af37' : '#94a3b8');
            });

            hitZone.on('pointerdown', () => {
                playSFX('click');
                if (isPlayer) {
                    const playerObj = ROOM_OBJECTS.find(o => o.id === 'obj_player_desk');
                    if (playerObj) EventBus.emit(EVENTS.ROOM_INVESTIGATE, playerObj);
                } else if (candidateData) {
                    EventBus.emit(EVENTS.CANDIDATE_INTERACT, {
                        candidateId: candidateData.id,
                        profile: candidateData
                    });
                }
            });

            container.add(hitZone);
            this.deskContainers.set(desk.candidateId, container);
        });
    }

    private drawSecurityCameras() {
        const corners = [
            { x: 25, y: 25, angle: 45 },
            { x: GAME_WIDTH - 25, y: 25, angle: 135 },
            { x: 25, y: GAME_HEIGHT - 25, angle: -45 },
            { x: GAME_WIDTH - 25, y: GAME_HEIGHT - 25, angle: -135 },
        ];

        corners.forEach(corner => {
            const container = this.add.container(corner.x, corner.y).setDepth(20);
            const g = this.add.graphics();

            // Camera mount & dome
            g.fillStyle(0x1a2233, 1);
            g.fillCircle(0, 0, 10);
            g.lineStyle(2, 0x3b4d75, 1);
            g.strokeCircle(0, 0, 10);

            // Blinking red recording LED
            const led = this.add.circle(0, 0, 3, 0xff1744);
            container.add([g, led]);

            this.tweens.add({
                targets: led,
                alpha: { from: 1, to: 0.1 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Stepped'
            });
        });
    }

    private setupExamTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.isPaused && !this.isCinematic) {
                    this.remainingSeconds = Math.max(0, this.remainingSeconds - GAME_CONFIG.timerSpeedMultiplier);
                    // Sync the central room board with the authoritative countdown
                    if (this.roomTimerDisplay) {
                        this.roomTimerDisplay.setText(`TIME REMAINING: ${this.formatClock(this.remainingSeconds)}`);
                    }
                    EventBus.emit(EVENTS.TIME_TICK, {
                        remainingSeconds: this.remainingSeconds,
                        isPaused: this.isPaused
                    });

                    if (this.remainingSeconds <= 0) {
                        EventBus.emit(EVENTS.PHASE_CHANGED, 'CONCLUSION');
                        EventBus.emit(EVENTS.SUBMIT_EXAM, {
                            answerPayload: '',
                            endingKey: 'OUT_OF_TIME'
                        });
                    }
                }
            },
            loop: true
        });
    }

    /** MM:SS formatting shared by the room board so it matches the HUD exactly. */
    private formatClock(totalSeconds: number): string {
        const s = Math.max(0, Math.floor(totalSeconds));
        const mm = Math.floor(s / 60).toString().padStart(2, '0');
        const ss = (s % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    }

    private setupEventBusListeners() {
        EventBus.on(EVENTS.TOGGLE_UV, (active: boolean) => {
            this.toggleUVMode(active);
        });

        EventBus.on('set-timer-pause', (paused: boolean) => {
            this.isPaused = paused;
        });

        EventBus.on('skip-cinematic', () => {
            this.skipCinematic();
        });

        EventBus.on('trigger-alarm', () => {
            this.triggerAlarm();
        });

        EventBus.on(EVENTS.GAME_RESTART, () => {
            this.scene.restart();
        });
    }

    public startCinematicSequence() {
        this.isCinematic = true;
        this.currentWaypointIndex = 0;
        this.playNextWaypoint();
    }

    private playNextWaypoint() {
        if (this.currentWaypointIndex >= CINEMATIC_CAMERA_WAYPOINTS.length) {
            this.finishCinematic();
            return;
        }

        const wp = CINEMATIC_CAMERA_WAYPOINTS[this.currentWaypointIndex];
        playSFX('intercom_chime', 0.5);

        this.cameras.main.pan(wp.x, wp.y, wp.duration, 'Sine.easeInOut');
        this.cameras.main.zoomTo(wp.zoom, wp.duration, 'Sine.easeInOut');

        this.time.delayedCall(wp.duration + 200, () => {
            this.currentWaypointIndex++;
            this.playNextWaypoint();
        });
    }

    public skipCinematic() {
        this.isCinematic = false;
        this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.cameras.main.setZoom(1.0);
        EventBus.emit(EVENTS.PHASE_CHANGED, 'PLAYING');
    }

    private finishCinematic() {
        this.isCinematic = false;
        this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 800, 'Sine.easeOut');
        this.cameras.main.zoomTo(1.0, 800, 'Sine.easeOut');
        EventBus.emit(EVENTS.PHASE_CHANGED, 'PLAYING');
    }

    public toggleUVMode(active: boolean) {
        this.isUVMode = active;
        playSFX('uv_switch');

        this.uvOverlayGraphics.clear();
        if (this.isUVMode) {
            // Ultraviolet wash over room
            this.uvOverlayGraphics.fillStyle(0x3a0ca3, 0.45);
            this.uvOverlayGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            // Luminescent glow on player paper and ceiling fixtures
            this.uvOverlayGraphics.fillStyle(0xc59b27, 0.3);
            this.uvOverlayGraphics.fillCircle(512, 580, 50);

            this.tweens.add({
                targets: this.uvOverlayGraphics,
                alpha: { from: 0, to: 1 },
                duration: 400
            });
        } else {
            this.tweens.add({
                targets: this.uvOverlayGraphics,
                alpha: 0,
                duration: 400
            });
        }
    }

    public triggerAlarm() {
        this.isAlarmActive = true;
        playSFX('alarm', 1.0);

        this.alarmLightGraphics.clear();
        this.alarmLightGraphics.fillStyle(0xe11d48, 0.4);
        this.alarmLightGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        this.tweens.add({
            targets: this.alarmLightGraphics,
            alpha: { from: 0, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.isAlarmActive = false;
                this.alarmLightGraphics.setAlpha(0);
            }
        });
    }

    update(time: number, delta: number) {
        // Ambient dust particle jittering under ceiling spotlights
        this.ambientDustParticles.clear();
        this.ambientDustParticles.fillStyle(0xffffff, 0.25);

        for (let i = 0; i < 20; i++) {
            const px = (Math.sin(time * 0.001 + i * 1.5) * 200 + GAME_WIDTH / 2);
            const py = (Math.cos(time * 0.0008 + i * 2.1) * 150 + GAME_HEIGHT / 2);
            this.ambientDustParticles.fillCircle(px, py, 1.5);
        }
    }
}

const StartGame = (parent: string) => {
    const config: Phaser.Types.Core.GameConfig = {
        type: AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent,
        backgroundColor: '#07090e',
        scale: {
            mode: Scale.FIT,
            autoCenter: Scale.CENTER_BOTH,
        },
        input: {
            activePointers: 3,
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                fps: 60,
                fixedStep: true,
            },
        },
        scene: [Game],
    };

    const game = new PhaserGame(config);
    if (typeof window !== 'undefined') {
        (window as any).__PHASER_GAME__ = game;
        (window as any).__PHASER_EVENT_BUS__ = EventBus;
    }
    return game;
};

export default StartGame;
import Phaser from 'phaser';
// @ts-ignore - Rex virtual joystick plugin
import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

export interface PlayerInput {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    action: boolean;
    force: number;
    angle: number;
}

export interface ControlsOptions {
    joystickRadius?: number;
    joystickX?: number;
    joystickY?: number;
    hasActionButton?: boolean;
    actionButtonText?: string;
}

/**
 * Universal Mobile & Desktop Controller.
 * Automatically unifies Keyboard (WASD + Arrows + Space) with Rex Virtual Joystick.
 * Guaranteed to work on mobile touchscreens and desktop browsers alike.
 */
export class GameControls {
    private scene: Phaser.Scene;
    private joystick: any = null;
    private joystickCursors: any = null;
    private keyboardKeys: any = null;
    private actionButton: Phaser.GameObjects.Container | null = null;
    private isActionPressed: boolean = false;
    private isJumpPressed: boolean = false;

    constructor(scene: Phaser.Scene, options: ControlsOptions = {}) {
        this.scene = scene;

        // 1. Setup Desktop Keyboard
        if (scene.input && scene.input.keyboard) {
            this.keyboardKeys = scene.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.UP,
                down: Phaser.Input.Keyboard.KeyCodes.DOWN,
                left: Phaser.Input.Keyboard.KeyCodes.LEFT,
                right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
                w: Phaser.Input.Keyboard.KeyCodes.W,
                s: Phaser.Input.Keyboard.KeyCodes.S,
                a: Phaser.Input.Keyboard.KeyCodes.A,
                d: Phaser.Input.Keyboard.KeyCodes.D,
                space: Phaser.Input.Keyboard.KeyCodes.SPACE,
                enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
                shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            });
        }

        // 2. Setup Mobile Touch Joystick
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const width = scene.scale.width;
        const height = scene.scale.height;

        const radius = options.joystickRadius ?? 60;
        const jx = options.joystickX ?? radius + 30;
        const jy = options.joystickY ?? height - radius - 30;

        // Base & Thumb graphics
        const base = scene.add.circle(0, 0, radius, 0x888888, 0.4);
        base.setStrokeStyle(2, 0xffffff, 0.6);
        base.setScrollFactor(0);
        base.setDepth(9999);

        const thumb = scene.add.circle(0, 0, radius * 0.45, 0xcccccc, 0.8);
        thumb.setStrokeStyle(2, 0xffffff, 0.9);
        thumb.setScrollFactor(0);
        thumb.setDepth(10000);

        this.joystick = new VirtualJoystickPlugin(scene, {
            x: jx,
            y: jy,
            radius,
            base,
            thumb,
            dir: '8dir',
            fixed: true,
            forceMin: 10,
        });

        this.joystickCursors = this.joystick.createCursorKeys();

        // 3. Optional Mobile Action/Jump Button (Bottom-Right)
        const hasAction = options.hasActionButton ?? true;
        if (hasAction) {
            const btnRadius = 38;
            const btnX = width - btnRadius - 35;
            const btnY = height - btnRadius - 35;

            const btnBg = scene.add.circle(0, 0, btnRadius, 0x028af8, 0.6);
            btnBg.setStrokeStyle(2, 0xffffff, 0.8);

            const btnText = scene.add.text(0, 0, options.actionButtonText ?? 'A', {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#ffffff',
                fontStyle: 'bold',
            }).setOrigin(0.5);

            this.actionButton = scene.add.container(btnX, btnY, [btnBg, btnText]);
            this.actionButton.setScrollFactor(0);
            this.actionButton.setDepth(10000);
            this.actionButton.setSize(btnRadius * 2, btnRadius * 2);
            this.actionButton.setInteractive(
                new Phaser.Geom.Circle(0, 0, btnRadius),
                Phaser.Geom.Circle.Contains
            );

            this.actionButton.on('pointerdown', () => {
                this.isActionPressed = true;
                this.isJumpPressed = true;
                btnBg.setFillStyle(0x0ec3c9, 0.9);
            });

            const releaseAction = () => {
                this.isActionPressed = false;
                this.isJumpPressed = false;
                btnBg.setFillStyle(0x028af8, 0.6);
            };

            this.actionButton.on('pointerup', releaseAction);
            this.actionButton.on('pointerout', releaseAction);
        }

        // Hide touch controls on non-touch desktop unless touched
        if (!isTouch) {
            this.setVisible(false);
            // If user ever touches screen, reveal mobile controls
            scene.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (pointer.wasTouch) {
                    this.setVisible(true);
                }
            });
        }

        // Auto cleanup on scene shutdown
        scene.events.once('shutdown', () => {
            this.destroy();
        });
    }

    /**
     * Poll unified input state. Call this inside your scene or entity update() loop.
     */
    public getInput(): PlayerInput {
        const k = this.keyboardKeys;
        const j = this.joystickCursors;

        const kLeft = (k?.left?.isDown || k?.a?.isDown) ?? false;
        const kRight = (k?.right?.isDown || k?.d?.isDown) ?? false;
        const kUp = (k?.up?.isDown || k?.w?.isDown) ?? false;
        const kDown = (k?.down?.isDown || k?.s?.isDown) ?? false;
        const kJump = (k?.space?.isDown || kUp) ?? false;
        const kAction = (k?.space?.isDown || k?.enter?.isDown || k?.shift?.isDown) ?? false;

        const jLeft = j?.left?.isDown ?? false;
        const jRight = j?.right?.isDown ?? false;
        const jUp = j?.up?.isDown ?? false;
        const jDown = j?.down?.isDown ?? false;

        return {
            left: kLeft || jLeft,
            right: kRight || jRight,
            up: kUp || jUp,
            down: kDown || jDown,
            jump: kJump || this.isJumpPressed,
            action: kAction || this.isActionPressed,
            force: this.joystick?.force ?? 0,
            angle: this.joystick?.angle ?? 0,
        };
    }

    public setVisible(visible: boolean): void {
        if (this.joystick) {
            this.joystick.setVisible(visible);
            this.joystick.setEnable(visible);
        }
        if (this.actionButton) {
            this.actionButton.setVisible(visible);
        }
    }

    public destroy(): void {
        if (this.joystick) {
            this.joystick.destroy();
            this.joystick = null;
            this.joystickCursors = null;
        }
        if (this.actionButton) {
            this.actionButton.destroy();
            this.actionButton = null;
        }
        this.keyboardKeys = null;
    }
}

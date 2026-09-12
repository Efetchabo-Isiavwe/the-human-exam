import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import StartGame, { EventBus, EVENTS, Game } from './game/main';
import {
    CANDIDATES,
    CandidateData,
    CLUE_SYNTHESIS_RECIPES,
    ClueItem,
    ENDINGS,
    GAME_CONFIG,
    INITIAL_CLUES,
    ROOM_OBJECTS,
    RoomObjectData
} from './game/config';
import { isSoundMuted, playSFX, setSoundMuted } from './game/audio';

type GamePhase =
    | 'BOOT'
    | 'CINEMATIC'
    | 'PLAYING'
    | 'DIALOGUE'
    | 'CLUE_BOARD'
    | 'TERMINAL'
    | 'CABINET'
    | 'PAPER_INSPECTION'
    | 'RULES_MODAL'
    | 'SUBMISSION'
    | 'CONCLUSION'
    | 'LEADERBOARD';

interface ToastMessage {
    id: string;
    text: string;
    type: 'info' | 'clue' | 'trust' | 'suspicion' | 'warning';
}

interface LeaderboardEntry {
    name: string;
    score: number;
    endingTitle: string;
    grade: string;
    timeRemaining: string;
    date: string;
}

export function App() {
    const phaserRef = useRef<{ game: Phaser.Game | null; scene: Phaser.Scene | null }>({
        game: null,
        scene: null,
    });

    const [phase, setPhase] = useState<GamePhase>('BOOT');
    const [remainingSeconds, setRemainingSeconds] = useState<number>(GAME_CONFIG.examDurationSeconds);
    const [isMuted, setIsMutedState] = useState<boolean>(isSoundMuted());
    const [isUVActive, setIsUVActive] = useState<boolean>(false);

    const [candidates, setCandidates] = useState<CandidateData[]>(CANDIDATES);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateData | null>(null);
    const [dialogueHistory, setDialogueHistory] = useState<string[]>([]);

    const [clues, setClues] = useState<ClueItem[]>(INITIAL_CLUES);
    const [clueTab, setClueTab] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED' | 'CONTRADICTED'>('ALL');
    const [synthesisSlotA, setSynthesisSlotA] = useState<string | null>(null);
    const [synthesisSlotB, setSynthesisSlotB] = useState<string | null>(null);
    const [synthesisFeedback, setSynthesisFeedback] = useState<string>('');

    const [terminalInput, setTerminalInput] = useState<string>('');
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        'LAGOS CENTRAL EXECUTIVE TESTING FACILITY // SECTOR 01',
        'STATUS: ALL 9 CANDIDATES SEATED // 60:00 TIMER RUNNING',
        'ENTER 3-DIGIT SUPERVISOR ACCESS PIN...'
    ]);

    const [cabinetDial, setCabinetDial] = useState<[number, number, number]>([0, 0, 0]);
    const [submissionChoice, setSubmissionChoice] = useState<'CONSCIENCE' | 'BRIBE' | 'SPOIL' | 'CUSTOM'>('CONSCIENCE');
    const [customAnswerText, setCustomAnswerText] = useState<string>('');
    const [currentEnding, setCurrentEnding] = useState<typeof ENDINGS[keyof typeof ENDINGS] | null>(null);
    const [finalScore, setFinalScore] = useState<number>(0);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
        try {
            const saved = localStorage.getItem('human_exam_leaderboard');
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return [
            { name: 'Candidate 09 (Architect)', score: 9850, endingTitle: 'THE ARCHITECT’S APPOINTMENT', grade: 'RANK S', timeRemaining: '38:45', date: '2026-03-01' },
            { name: 'Candidate 03 (Naliaka)', score: 7400, endingTitle: 'INCONCLUSIVE ANALYSIS', grade: 'RANK B', timeRemaining: '12:10', date: '2026-02-28' },
            { name: 'Candidate 08 (Chief Obi)', score: 1200, endingTitle: 'DISQUALIFIED & DETAINED', grade: 'RANK F', timeRemaining: '45:00', date: '2026-02-25' }
        ];
    });

    const addToast = (text: string, type: ToastMessage['type'] = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev.slice(-4), { id, text, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };

    const unlockClue = (clueId: string) => {
        setClues(prev => {
            const found = prev.find(c => c.id === clueId);
            if (found && !found.discovered) {
                playSFX('clue_discovered');
                addToast(`NEW CLUE: ${found.title}`, 'clue');
                return prev.map(c => c.id === clueId ? { ...c, discovered: true } : c);
            }
            return prev;
        });
    };

    useLayoutEffect(() => {
        const game = StartGame('game-container');
        phaserRef.current.game = game;
        return () => {
            if (phaserRef.current.game) {
                phaserRef.current.game.destroy(true);
                phaserRef.current.game = null;
                phaserRef.current.scene = null;
            }
        };
    }, []);

    useEffect(() => {
        const handleSceneReady = (scene: Phaser.Scene) => { phaserRef.current.scene = scene; };
        const handlePhaseChanged = (newPhase: GamePhase) => { setPhase(newPhase); };
        const handleTimeTick = ({ remainingSeconds: sec }: { remainingSeconds: number }) => { setRemainingSeconds(sec); };

        const handleCandidateInteract = ({ profile }: { candidateId: string; profile: CandidateData }) => {
            setSelectedCandidate(profile);
            setDialogueHistory([profile.dialogueTree.initial]);
            setPhase('DIALOGUE');
            EventBus.emit('set-timer-pause', true);
            playSFX('paper_flip');
        };

        const handleRoomInvestigate = (obj: RoomObjectData) => {
            EventBus.emit('set-timer-pause', true);
            if (obj.interactionType === 'TERMINAL') {
                setPhase('TERMINAL');
            } else if (obj.interactionType === 'CABINET') {
                setPhase('CABINET');
            } else if (obj.interactionType === 'PAPER' || obj.id === 'obj_player_desk') {
                setPhase('PAPER_INSPECTION');
            } else if (obj.id === 'obj_central_display') {
                setPhase('RULES_MODAL');
            } else {
                if (obj.clueId) unlockClue(obj.clueId);
                setPhase('PAPER_INSPECTION');
            }
        };

        const handleSubmitExam = ({ endingKey }: { answerPayload: string; endingKey: keyof typeof ENDINGS }) => {
            triggerEnding(endingKey);
        };

        EventBus.on(EVENTS.SCENE_READY, handleSceneReady);
        EventBus.on(EVENTS.PHASE_CHANGED, handlePhaseChanged);
        EventBus.on(EVENTS.TIME_TICK, handleTimeTick);
        EventBus.on(EVENTS.CANDIDATE_INTERACT, handleCandidateInteract);
        EventBus.on(EVENTS.ROOM_INVESTIGATE, handleRoomInvestigate);
        EventBus.on(EVENTS.SUBMIT_EXAM, handleSubmitExam);

        return () => {
            EventBus.removeListener(EVENTS.SCENE_READY, handleSceneReady);
            EventBus.removeListener(EVENTS.PHASE_CHANGED, handlePhaseChanged);
            EventBus.removeListener(EVENTS.TIME_TICK, handleTimeTick);
            EventBus.removeListener(EVENTS.CANDIDATE_INTERACT, handleCandidateInteract);
            EventBus.removeListener(EVENTS.ROOM_INVESTIGATE, handleRoomInvestigate);
            EventBus.removeListener(EVENTS.SUBMIT_EXAM, handleSubmitExam);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const isCurrentPhasePaused = (p: GamePhase) =>
        p === 'DIALOGUE' || p === 'CLUE_BOARD' || p === 'TERMINAL' || p === 'CABINET' ||
        p === 'PAPER_INSPECTION' || p === 'RULES_MODAL' || p === 'SUBMISSION';

    const closeModal = () => {
        setPhase('PLAYING');
        setSelectedCandidate(null);
        EventBus.emit('set-timer-pause', false);
        playSFX('click');
    };

    const handleDialogueChoice = (option: CandidateData['dialogueTree']['options'][0]) => {
        if (!selectedCandidate) return;
        playSFX('blip');
        setDialogueHistory(prev => [...prev, `[YOU]: "${option.text}"`, `[${selectedCandidate.name}]: "${option.response}"`]);

        setCandidates(prev => prev.map(c => {
            if (c.id === selectedCandidate.id) {
                const newTrust = Math.max(0, Math.min(100, c.stats.trust + option.trustDelta));
                const newSuspicion = Math.max(0, Math.min(100, c.stats.suspicion + option.suspicionDelta));
                if (option.trustDelta > 0) addToast(`+${option.trustDelta} Trust with ${c.name}`, 'trust');
                if (option.trustDelta < 0) addToast(`${option.trustDelta} Trust with ${c.name}`, 'suspicion');
                const updated = {
                    ...c,
                    stats: { ...c.stats, trust: newTrust, suspicion: newSuspicion }
                };
                setSelectedCandidate(updated);
                return updated;
            }
            return c;
        }));

        if (option.unlockClueId) unlockClue(option.unlockClueId);
    };

    const handleSynthesizeClues = () => {
        if (!synthesisSlotA || !synthesisSlotB) {
            setSynthesisFeedback('Select two clues to test for deductive synthesis.');
            playSFX('blip');
            return;
        }
        if (synthesisSlotA === synthesisSlotB) {
            setSynthesisFeedback('Select two different clues.');
            return;
        }
        const recipe = CLUE_SYNTHESIS_RECIPES.find(
            r => (r.clueA === synthesisSlotA && r.clueB === synthesisSlotB) ||
                (r.clueA === synthesisSlotB && r.clueB === synthesisSlotA)
        );
        if (recipe) {
            playSFX('synthesis_success');
            setSynthesisFeedback(recipe.discoveryMessage);
            addToast('GRAND DEDUCTION UNLOCKED!', 'clue');
            setClues(prev => {
                const exists = prev.some(c => c.id === recipe.resultClue.id);
                if (exists) return prev.map(c => c.id === recipe.resultClue.id ? { ...c, discovered: true } : c);
                return [...prev, recipe.resultClue];
            });
            setSynthesisSlotA(null);
            setSynthesisSlotB(null);
        } else {
            playSFX('blip');
            setSynthesisFeedback('No logical connection found between these two items.');
        }
    };

    const handleTerminalPinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        playSFX('terminal_key');
        if (terminalInput.trim() === '946' || terminalInput.trim() === '1984') {
            playSFX('synthesis_success');
            setTerminalLogs(prev => [
                ...prev,
                `>> AUTH_KEY [${terminalInput}] GRANTED // ELEVATED SUPERVISOR LEVEL`,
                '>> MEMORY DUMP: "The true answer is Human Conscience & Moral Integrity."'
            ]);
            unlockClue('clue_terminal_logs');
            addToast('TERMINAL UNLOCKED: Briefing Recovered!', 'clue');
        } else {
            playSFX('alarm');
            setTerminalLogs(prev => [...prev, `>> AUTH_KEY [${terminalInput}] INVALID.`]);
            addToast('ACCESS DENIED: Check Candidate Formula (Uwase)', 'warning');
        }
        setTerminalInput('');
    };

    const adjustDial = (index: number, delta: number) => {
        playSFX('click');
        setCabinetDial(prev => {
            const next = [...prev] as [number, number, number];
            next[index] = (next[index] + delta + 10) % 10;
            return next;
        });
    };

    const handleUnlockCabinet = () => {
        if (cabinetDial[0] === 9 && cabinetDial[1] === 5 && cabinetDial[2] === 1) {
            playSFX('synthesis_success');
            unlockClue('clue_uv_torch');
            addToast('CABINET OPENED: Forensic UV Torch Acquired!', 'clue');
        } else {
            playSFX('alarm');
            addToast('Combination failed. Hint: 9 Candidates, 5 Rules, 1 Question.', 'warning');
        }
    };

    const handleToggleUV = () => {
        const nextState = !isUVActive;
        setIsUVActive(nextState);
        EventBus.emit(EVENTS.TOGGLE_UV, nextState);
        addToast(nextState ? 'UV BLACKLIGHT ACTIVE: Luminescent inks exposed' : 'HALOGEN LIGHTING RESTORED', 'info');
    };

    const triggerEnding = (endingKey: keyof typeof ENDINGS) => {
        const ending = ENDINGS[endingKey];
        setCurrentEnding(ending);
        const verifiedCount = clues.filter(c => c.discovered && c.status === 'VERIFIED').length;
        const timeBonus = Math.floor(remainingSeconds * 1.5);
        const baseScore = endingKey === 'TRUE_ARCHITECT' ? 7000 : endingKey === 'BRIBE_SELLOUT' ? 1000 : 2500;
        const total = baseScore + verifiedCount * 250 + timeBonus;
        setFinalScore(total);

        if (endingKey === 'TRUE_ARCHITECT') playSFX('victory');
        else playSFX('gameover');

        const entry: LeaderboardEntry = {
            name: 'Candidate 09 (You)',
            score: total,
            endingTitle: ending.title,
            grade: ending.grade,
            timeRemaining: formatTime(remainingSeconds),
            date: new Date().toISOString().split('T')[0]
        };
        const updated = [entry, ...leaderboard].sort((a, b) => b.score - a.score).slice(0, 8);
        setLeaderboard(updated);
        try { localStorage.setItem('human_exam_leaderboard', JSON.stringify(updated)); } catch {}
        setPhase('CONCLUSION');
    };

    const handleFinalSubmit = () => {
        playSFX('paper_flip');
        if (submissionChoice === 'CONSCIENCE') {
            triggerEnding('TRUE_ARCHITECT');
        } else if (submissionChoice === 'BRIBE') {
            EventBus.emit('trigger-alarm');
            triggerEnding('BRIBE_SELLOUT');
        } else if (submissionChoice === 'SPOIL') {
            EventBus.emit('trigger-alarm');
            triggerEnding('DISQUALIFIED_SPOIL');
        } else {
            const clean = customAnswerText.trim().toLowerCase();
            if (clean.includes('conscience') || clean.includes('empathy') || clean.includes('integrity') || clean.includes('moral')) {
                triggerEnding('TRUE_ARCHITECT');
            } else if (clean.includes('money') || clean.includes('bribe') || clean.includes('obi')) {
                triggerEnding('BRIBE_SELLOUT');
            } else {
                triggerEnding('DISQUALIFIED_SPOIL');
            }
        }
    };

    const toggleSound = () => {
        const next = !isMuted;
        setIsMutedState(next);
        setSoundMuted(next);
        if (!next) playSFX('click');
    };

    const restartGame = () => {
        playSFX('click');
        setRemainingSeconds(GAME_CONFIG.examDurationSeconds);
        setCandidates(CANDIDATES);
        setClues(INITIAL_CLUES);
        setSelectedCandidate(null);
        setIsUVActive(false);
        setCustomAnswerText('');
        setPhase('CINEMATIC');
        EventBus.emit(EVENTS.GAME_RESTART);
    };

    const verifiedCluesCount = clues.filter(c => c.discovered && c.status === 'VERIFIED').length;

    return (
        <div id="app">
            <div id="game-container" />

            <div id="hud">
                {/* TOP BAR */}
                {phase !== 'BOOT' && (
                    <div style={{ position: 'absolute', top: 12, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 110 }}>
                        <div className="glass-panel" style={{ padding: '6px 14px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>⚖️</span>
                            <div>
                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', fontWeight: 700, color: '#d4af37' }}>THE HUMAN EXAM</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#8e9bb0' }}>CASE 01: THE BLANK PAGE // 9 CANDIDATES</div>
                            </div>
                        </div>

                        <div className={`glass-panel ${remainingSeconds <= 600 ? 'crimson-border pulsing-alert' : 'gold-border'}`} style={{ padding: '6px 18px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span>⏱️</span>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: remainingSeconds <= 600 ? '#e11d48' : '#f1f5f9' }}>
                                {formatTime(remainingSeconds)}
                            </div>
                            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#d4af37', letterSpacing: '1px' }}>
                                {isCurrentPhasePaused(phase) ? 'RECORDING PAUSED // INTERACTION ACTIVE' : 'EXAM IN PROGRESS'}
                            </div>
                            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#94a3b8', borderLeft: '1px solid #2a3754', paddingLeft: '8px' }}>
                                {verifiedCluesCount} CLUES
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-prime interactive" onClick={() => { playSFX('click'); setPhase('RULES_MODAL'); }}>📜 RULES</button>
                            <button className="btn-prime interactive" onClick={() => { playSFX('click'); setPhase('CLUE_BOARD'); }}>🔍 EVIDENCE ({clues.filter(c => c.discovered).length})</button>
                            <button className={`btn-prime interactive ${isUVActive ? 'btn-cyan' : ''}`} onClick={handleToggleUV}>⚡ UV {isUVActive ? 'ON' : 'OFF'}</button>
                            <button className="btn-prime btn-gold interactive" onClick={() => { playSFX('click'); setPhase('SUBMISSION'); }}>📝 SUBMIT EXAM</button>
                            <button className="btn-prime interactive" onClick={toggleSound}>{isMuted ? '🔇' : '🔊'}</button>
                        </div>
                    </div>
                )}

                {/* BOOT / MENU */}
                {phase === 'BOOT' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, padding: '24px' }}>
                        <div className="glass-panel gold-border" style={{ maxWidth: '640px', width: '100%', padding: '36px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚖️</div>
                            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', color: '#d4af37', letterSpacing: '3px', margin: '0 0 8px 0' }}>THE HUMAN EXAM</h1>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#d4af37', letterSpacing: '2px', marginBottom: '20px' }}>CASE 01: THE BLANK PAGE // LAGOS EXECUTIVE HALL</div>
                            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.7', marginBottom: '24px', textAlign: 'left', backgroundColor: 'rgba(0,0,0,0.3)', padding: '14px 18px', borderRadius: '4px', borderLeft: '3px solid #d4af37' }}>
                                Summoned into an elite Lagos examination chamber alongside eight African visionaries, you are given 60 minutes and a blank sheet of paper. Interrogate candidates, examine room equipment, and deduce the unwritten question.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
                                <button className="btn-prime btn-gold interactive" style={{ padding: '12px 28px' }} onClick={() => { playSFX('intercom_chime'); setPhase('CINEMATIC'); if (phaserRef.current.scene) (phaserRef.current.scene as Game).startCinematicSequence(); }}>
                                    ENTER CHAMBER ▶
                                </button>
                                <button className="btn-prime interactive" style={{ padding: '12px 20px' }} onClick={() => { playSFX('click'); setPhase('LEADERBOARD'); }}>
                                    🏆 DOSSIER ARCHIVE
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CINEMATIC OVERLAY */}
                {phase === 'CINEMATIC' && (
                    <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '700px', zIndex: 120 }}>
                        <div className="glass-panel gold-border" style={{ padding: '14px 20px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#d4af37' }}>INVIGILATOR BROADCAST</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#f8fafc', marginTop: '3px' }}>“You have 60 minutes. There is only ONE question, and only ONE correct answer.”</div>
                            </div>
                            <button className="btn-prime interactive" onClick={() => { playSFX('click'); setPhase('PLAYING'); if (phaserRef.current.scene) (phaserRef.current.scene as Game).skipCinematic(); }}>
                                SKIP ⏭️
                            </button>
                        </div>
                    </div>
                )}

                {/* CANDIDATE INTERROGATION MODAL */}
                {phase === 'DIALOGUE' && selectedCandidate && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150, padding: '20px' }}>
                        <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${selectedCandidate.color}` }}>
                            <div style={{ padding: '14px 18px', backgroundColor: 'rgba(0,0,0,0.4)', borderBottom: '1px solid #1e2942', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: selectedCandidate.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}>
                                        {selectedCandidate.avatarUrl ? (
                                            <img
                                                src={selectedCandidate.avatarUrl}
                                                alt={selectedCandidate.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                            />
                                        ) : (
                                            selectedCandidate.avatarSymbol
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{selectedCandidate.name}</span>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#d4af37', padding: '1px 5px', border: '1px solid #d4af37', borderRadius: '3px' }}>DESK 0{selectedCandidate.number}</span>
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#94a3b8' }}>{selectedCandidate.title} • {selectedCandidate.origin}</div>
                                    </div>
                                </div>
                                <button className="btn-prime interactive" onClick={closeModal}>✕ CLOSE</button>
                            </div>

                            <div style={{ padding: '10px 18px', backgroundColor: 'rgba(10,15,26,0.7)', borderBottom: '1px solid #1e2942', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                                {[
                                    { label: 'TRUST', value: selectedCandidate.stats.trust, color: '#00e676' },
                                    { label: 'SUSPICION', value: selectedCandidate.stats.suspicion, color: '#e11d48' },
                                    { label: 'RESPECT', value: selectedCandidate.stats.respect, color: '#d4af37' },
                                    { label: 'FEAR', value: selectedCandidate.stats.fear, color: '#ff9100' },
                                    { label: 'COOP', value: selectedCandidate.stats.cooperation, color: '#f1f5f9' }
                                ].map(st => (
                                    <div key={st.label}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#8e9bb0' }}>
                                            <span>{st.label}</span>
                                            <span style={{ color: st.color, fontWeight: 700 }}>{st.value}%</span>
                                        </div>
                                        <div style={{ height: '3px', backgroundColor: '#1e2942', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                                            <div style={{ width: `${st.value}%`, height: '100%', backgroundColor: st.color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', background: 'rgba(5,7,12,0.4)' }}>
                                {dialogueHistory.map((txt, idx) => (
                                    <div key={idx} style={{ padding: '8px 12px', borderRadius: '4px', fontSize: '12px', lineHeight: '1.5', backgroundColor: txt.startsWith('[YOU]') ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.04)', borderLeft: txt.startsWith('[YOU]') ? '3px solid #d4af37' : `3px solid ${selectedCandidate.color}`, color: '#e2e8f0' }}>
                                        {txt}
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '14px 18px', backgroundColor: 'rgba(10,15,26,0.95)', borderTop: '1px solid #1e2942', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#d4af37' }}>INTERROGATION & DEDUCTION BRANCHES:</div>
                                {selectedCandidate.dialogueTree.options.map(opt => (
                                    <button key={opt.id} className="btn-prime interactive" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '8px 12px', fontSize: '11px' }} onClick={() => handleDialogueChoice(opt)}>
                                        <span style={{ color: '#d4af37', marginRight: '6px' }}>▶</span>{opt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* EVIDENCE MATRIX */}
                {phase === 'CLUE_BOARD' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150, padding: '20px' }}>
                        <div className="glass-panel" style={{ maxWidth: '880px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2942', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: '#d4af37', fontWeight: 700 }}>EVIDENCE & DEDUCTION MATRIX</div>
                                <button className="btn-prime interactive" onClick={closeModal}>✕ CLOSE</button>
                            </div>

                            <div style={{ padding: '10px 20px', backgroundColor: 'rgba(10,15,26,0.8)', borderBottom: '1px solid #1e2942', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {(['ALL', 'VERIFIED', 'UNVERIFIED', 'CONTRADICTED'] as const).map(tab => (
                                        <button key={tab} className={`btn-prime interactive ${clueTab === tab ? 'btn-gold' : ''}`} style={{ padding: '4px 10px', fontSize: '10px' }} onClick={() => { playSFX('click'); setClueTab(tab); }}>{tab}</button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8e9bb0' }}>SYNTHESIZE:</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '3px 6px', border: '1px dashed #2a3754', borderRadius: '3px', color: synthesisSlotA ? '#d4af37' : '#64748b' }}>
                                        {synthesisSlotA ? clues.find(c => c.id === synthesisSlotA)?.title.substring(0, 14) + '...' : '[SLOT 1]'}
                                    </span>
                                    <span style={{ color: '#8e9bb0' }}>+</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '3px 6px', border: '1px dashed #2a3754', borderRadius: '3px', color: synthesisSlotB ? '#d4af37' : '#64748b' }}>
                                        {synthesisSlotB ? clues.find(c => c.id === synthesisSlotB)?.title.substring(0, 14) + '...' : '[SLOT 2]'}
                                    </span>
                                    <button className="btn-prime btn-gold interactive" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={handleSynthesizeClues}>⚡ COMBINE</button>
                                </div>
                            </div>

                            {synthesisFeedback && (
                                <div style={{ padding: '6px 20px', backgroundColor: 'rgba(212,175,55,0.1)', borderBottom: '1px solid #d4af37', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#d4af37' }}>
                                    {synthesisFeedback}
                                </div>
                            )}

                            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', maxHeight: '400px' }}>
                                {clues.filter(c => clueTab === 'ALL' || c.status === clueTab).map(clue => {
                                    const isSel = synthesisSlotA === clue.id || synthesisSlotB === clue.id;
                                    return (
                                        <div
                                            key={clue.id}
                                            className="glass-panel interactive"
                                            style={{
                                                padding: '12px',
                                                borderRadius: '6px',
                                                border: isSel ? '1px solid #d4af37' : clue.discovered ? '1px solid #23304d' : '1px dashed #1a2233',
                                                backgroundColor: clue.discovered ? 'rgba(14,19,34,0.8)' : 'rgba(5,7,12,0.6)',
                                                cursor: clue.discovered ? 'pointer' : 'default'
                                            }}
                                            onClick={() => {
                                                if (!clue.discovered) return;
                                                playSFX('click');
                                                if (!synthesisSlotA) setSynthesisSlotA(clue.id);
                                                else if (!synthesisSlotB && synthesisSlotA !== clue.id) setSynthesisSlotB(clue.id);
                                                else if (synthesisSlotA === clue.id) setSynthesisSlotA(null);
                                                else setSynthesisSlotB(null);
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: clue.status === 'VERIFIED' ? '#00e676' : '#ffca28' }}>{clue.category}</span>
                                                {isSel && <span style={{ color: '#d4af37', fontSize: '9px', fontFamily: 'var(--font-mono)' }}>ACTIVE</span>}
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: clue.discovered ? '#f8fafc' : '#64748b', marginBottom: '4px' }}>
                                                {clue.discovered ? clue.title : '??? [UNDISCOVERED]'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: clue.discovered ? '#94a3b8' : '#475569', lineHeight: '1.4' }}>
                                                {clue.discovered ? clue.description : 'Interrogate candidates or inspect devices to uncover.'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TERMINAL */}
                {phase === 'TERMINAL' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150, padding: '20px' }}>
                        <div className="glass-panel cyan-border" style={{ maxWidth: '680px', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#04100c' }}>
                            <div style={{ padding: '10px 16px', backgroundColor: '#061c14', borderBottom: '1px solid #00e676', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#00e676', fontWeight: 700 }}>🖥️ FACILITY TERMINAL // SECTOR 01</div>
                                <button className="btn-prime interactive" onClick={closeModal}>✕ EXIT</button>
                            </div>
                            <div style={{ padding: '16px', minHeight: '220px', maxHeight: '300px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#00e676', lineHeight: '1.6', backgroundColor: '#020a07' }}>
                                {terminalLogs.map((log, idx) => (<div key={idx} style={{ marginBottom: '4px' }}>{log}</div>))}
                            </div>
                            <form onSubmit={handleTerminalPinSubmit} style={{ padding: '12px 16px', backgroundColor: '#061c14', borderTop: '1px solid #00e676', display: 'flex', gap: '8px' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#00e676', alignSelf: 'center' }}>PIN&gt;</span>
                                <input
                                    type="text"
                                    className="interactive"
                                    value={terminalInput}
                                    onChange={e => setTerminalInput(e.target.value)}
                                    placeholder="Enter access code (Uwase formula 9*5*21+1)..."
                                    style={{ flex: 1, backgroundColor: '#020a07', border: '1px solid #00e676', borderRadius: '4px', padding: '8px 12px', color: '#00e676', fontFamily: 'var(--font-mono)', fontSize: '12px', outline: 'none' }}
                                />
                                <button type="submit" className="btn-prime btn-cyan interactive" style={{ padding: '6px 14px' }}>ENTER</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* CABINET */}
                {phase === 'CABINET' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150, padding: '20px' }}>
                        <div className="glass-panel gold-border" style={{ maxWidth: '540px', width: '100%', padding: '24px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🗄️</div>
                            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: '#d4af37', margin: '0 0 6px 0' }}>ROTARY EVIDENCE CABINET</h2>
                            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '20px' }}>Model SEC-1984. Enter the 3-digit combination (Candidates • Rules • Question).</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                                {[0, 1, 2].map(idx => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <button className="btn-prime interactive" style={{ padding: '4px 10px' }} onClick={() => adjustDial(idx, 1)}>▲</button>
                                        <div style={{ width: '50px', height: '60px', backgroundColor: '#0c1220', border: '2px solid #d4af37', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 700, color: '#d4af37' }}>
                                            {cabinetDial[idx]}
                                        </div>
                                        <button className="btn-prime interactive" style={{ padding: '4px 10px' }} onClick={() => adjustDial(idx, -1)}>▼</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                <button className="btn-prime btn-gold interactive" onClick={handleUnlockCabinet}>🔓 UNLOCK</button>
                                <button className="btn-prime interactive" onClick={closeModal}>CANCEL</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PAPER INSPECTION */}
                {phase === 'PAPER_INSPECTION' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150, padding: '20px' }}>
                        <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#d4af37', fontWeight: 700 }}>CANDIDATE 09 EXAMINATION DESK</div>
                                <button className="btn-prime interactive" onClick={closeModal}>✕ CLOSE</button>
                            </div>

                            <div style={{
                                width: '320px',
                                height: '400px',
                                backgroundColor: isUVActive ? '#150a2e' : '#f8fafc',
                                border: isUVActive ? '2px solid #7928ca' : '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: isUVActive ? '0 0 30px rgba(121,40,202,0.6)' : '0 10px 30px rgba(0,0,0,0.6)',
                                marginBottom: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: isUVActive ? '#d4af37' : '#64748b' }}>EXECUTIVE CHARTER</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: isUVActive ? '#d4af37' : '#64748b' }}>CANDIDATE 09</span>
                                </div>
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    {isUVActive ? (
                                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#d4af37', lineHeight: '1.7', textShadow: '0 0 10px #d4af37' }}>
                                            “WHAT IS THE ONLY RESOURCE AN EXAMINATION CANNOT MEASURE?”
                                        </div>
                                    ) : (
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                            [ This paper appears blank. Use UV Blacklight or synthesize clues to reveal the hidden prompt. ]
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: isUVActive ? '#d4af37' : '#94a3b8' }}>WATERMARK: [ETHICS_CORE_01]</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: isUVActive ? '#d4af37' : '#94a3b8' }}>SEAL: OK</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className={`btn-prime interactive ${isUVActive ? 'btn-cyan' : ''}`} onClick={handleToggleUV}>
                                    ⚡ {isUVActive ? 'HALOGEN MODE' : 'UV BLACKLIGHT'}
                                </button>
                                <button className="btn-prime btn-gold interactive" onClick={() => { playSFX('click'); setPhase('SUBMISSION'); }}>
                                    📝 PROCEED TO SUBMISSION
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RULES MODAL */}
                {phase === 'RULES_MODAL' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150, padding: '20px' }}>
                        <div className="glass-panel gold-border" style={{ maxWidth: '680px', width: '100%', padding: '26px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: '#d4af37', margin: 0 }}>THE FIVE ABSOLUTE RULES</h2>
                                <button className="btn-prime interactive" onClick={closeModal}>✕ CLOSE</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {GAME_CONFIG.rules.map(r => (
                                    <div key={r.number} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid #d4af37' }}>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: '#d4af37' }}>RULE 0{r.number}: {r.title.toUpperCase()}</div>
                                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>{r.text}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <button className="btn-prime btn-gold interactive" onClick={closeModal}>RETURN TO ROOM</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SUBMISSION MODAL */}
                {phase === 'SUBMISSION' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.94)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 160, padding: '20px' }}>
                        <div className="glass-panel gold-border" style={{ maxWidth: '700px', width: '100%', padding: '28px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: '#d4af37', margin: 0 }}>FINAL SUBMISSION</h2>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#d4af37' }}>Rule 3: Only ONE candidate will be chosen.</div>
                                </div>
                                <button className="btn-prime interactive" onClick={closeModal}>✕ CANCEL</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                <label className="glass-panel interactive" style={{ padding: '12px 14px', borderRadius: '4px', border: submissionChoice === 'CONSCIENCE' ? '1px solid #00e676' : '1px solid #24324f', display: 'flex', gap: '10px', cursor: 'pointer' }}>
                                    <input type="radio" name="sub" checked={submissionChoice === 'CONSCIENCE'} onChange={() => setSubmissionChoice('CONSCIENCE')} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#00e676', fontSize: '13px' }}>Write: “HUMAN CONSCIENCE & MORAL EMPATHY”</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Submit the deduced sovereign answer to the hidden UV question.</div>
                                    </div>
                                </label>

                                <label className="glass-panel interactive" style={{ padding: '12px 14px', borderRadius: '4px', border: submissionChoice === 'BRIBE' ? '1px solid #ffca28' : '1px solid #24324f', display: 'flex', gap: '10px', cursor: 'pointer' }}>
                                    <input type="radio" name="sub" checked={submissionChoice === 'BRIBE'} onChange={() => setSubmissionChoice('BRIBE')} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#ffca28', fontSize: '13px' }}>Accept Chief Obi’s Corporate Bribe (Co-sign Buyout)</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Surrender the exam for 100 Million Naira wire transfer promise.</div>
                                    </div>
                                </label>

                                <label className="glass-panel interactive" style={{ padding: '12px 14px', borderRadius: '4px', border: submissionChoice === 'SPOIL' ? '1px solid #ff3344' : '1px solid #24324f', display: 'flex', gap: '10px', cursor: 'pointer' }}>
                                    <input type="radio" name="sub" checked={submissionChoice === 'SPOIL'} onChange={() => setSubmissionChoice('SPOIL')} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#ff3344', fontSize: '13px' }}>Tear or Scribble in Panic (Breach Rule 2)</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Act impulsively under pressure.</div>
                                    </div>
                                </label>

                                <label className="glass-panel interactive" style={{ padding: '12px 14px', borderRadius: '4px', border: submissionChoice === 'CUSTOM' ? '1px solid #00f0ff' : '1px solid #24324f', display: 'flex', gap: '10px', cursor: 'pointer' }}>
                                    <input type="radio" name="sub" checked={submissionChoice === 'CUSTOM'} onChange={() => setSubmissionChoice('CUSTOM')} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: '#00f0ff', fontSize: '13px' }}>Custom Response</div>
                                        {submissionChoice === 'CUSTOM' && (
                                            <input
                                                type="text"
                                                className="interactive"
                                                value={customAnswerText}
                                                onChange={e => setCustomAnswerText(e.target.value)}
                                                placeholder="Write your answer..."
                                                style={{ width: '100%', marginTop: '6px', backgroundColor: '#07090e', border: '1px solid #00f0ff', borderRadius: '4px', padding: '6px 10px', color: '#f8fafc', fontSize: '12px' }}
                                            />
                                        )}
                                    </div>
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button className="btn-prime interactive" onClick={closeModal}>BACK</button>
                                <button className="btn-prime btn-gold interactive" onClick={handleFinalSubmit}>CONFIRM SUBMISSION ⚖️</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONCLUSION SCREEN */}
                {phase === 'CONCLUSION' && currentEnding && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.96)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, padding: '20px' }}>
                        <div className="glass-panel" style={{ maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '8px', border: `2px solid ${currentEnding.color}`, textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: currentEnding.color, letterSpacing: '2px' }}>{currentEnding.badge}</div>
                            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: '#f8fafc', margin: '6px 0' }}>{currentEnding.title}</h1>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: currentEnding.color, marginBottom: '20px' }}>
                                {currentEnding.grade} // FINAL SCORE: {finalScore} PTS
                            </div>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '6px', textAlign: 'left', fontSize: '13px', lineHeight: '1.6', color: '#cbd5e1', marginBottom: '20px', borderLeft: `4px solid ${currentEnding.color}` }}>
                                {currentEnding.summary}
                            </div>
                            <div style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)', fontSize: '14px', color: '#d4af37', marginBottom: '24px' }}>
                                {currentEnding.quote}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                <button className="btn-prime btn-gold interactive" onClick={restartGame}>RETRY CASE 01 🔄</button>
                                <button className="btn-prime interactive" onClick={() => { playSFX('click'); setPhase('LEADERBOARD'); }}>🏆 LEADERBOARD</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LEADERBOARD */}
                {phase === 'LEADERBOARD' && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,7,12,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 180, padding: '20px' }}>
                        <div className="glass-panel gold-border" style={{ maxWidth: '680px', width: '100%', padding: '26px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: '#d4af37', margin: 0 }}>SOVEREIGN ARCHIVE DOSSIER</h2>
                                <button className="btn-prime interactive" onClick={() => setPhase('BOOT')}>✕ CLOSE</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '320px', overflowY: 'auto' }}>
                                {leaderboard.map((entry, idx) => (
                                    <div key={idx} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: idx === 0 ? '3px solid #d4af37' : '1px solid #1e2942' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '12px', color: '#f8fafc' }}>{entry.name}</div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8e9bb0' }}>{entry.endingTitle} • Left: {entry.timeRemaining}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: '#00f0ff' }}>{entry.score} PTS</div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#d4af37' }}>{entry.grade}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <button className="btn-prime btn-gold interactive" onClick={() => setPhase('BOOT')}>RETURN TO MENU</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TOAST ALERTS */}
                <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 220, pointerEvents: 'none' }}>
                    {toasts.map(t => (
                        <div key={t.id} className="glass-panel" style={{ padding: '8px 14px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px', borderLeft: t.type === 'clue' ? '3px solid #00f0ff' : t.type === 'trust' ? '3px solid #00e676' : t.type === 'suspicion' || t.type === 'warning' ? '3px solid #ff3344' : '3px solid #d4af37', color: '#f8fafc' }}>
                            {t.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
// @ts-ignore
import { zzfx } from 'zzfx';

/**
 * Procedural retro and tension sound presets powered by ZzFX.
 * Zero external audio files required. Safe across all browsers.
 */
export const SFX_PRESETS = {
    click: [0.3, 0.01, 800, 0.01, 0.02, 0.05, 1, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    blip: [0.2, 0.01, 440, 0.02, 0.03, 0.08, 1, 2.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    clue_discovered: [0.8, 0.05, 523, 0.05, 0.25, 0.45, 1, 1.8, 0, 0, 150, 0.05, 0.1, 0, 0, 0, 0, 0.8, 0.02, 0.05],
    synthesis_success: [1.0, 0.05, 659, 0.08, 0.35, 0.6, 1, 2.2, 0, 0, 260, 0.08, 0.15, 0, 0, 0, 0, 0.9, 0.03, 0.08],
    alarm: [0.6, 0.1, 180, 0.1, 0.2, 0.4, 3, 0.8, -5, 0, 0, 0, 0, 0.8, 0, 0.5, 0, 0.7, 0.1, 0],
    intercom_chime: [0.7, 0.05, 880, 0.08, 0.3, 0.5, 1, 1.2, 0, 0, -200, 0.1, 0.2, 0, 0, 0, 0, 0.7, 0.02, 0.1],
    paper_flip: [0.4, 0.02, 200, 0.02, 0.08, 0.15, 4, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    door_thud: [0.9, 0.1, 80, 0.05, 0.3, 0.5, 4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    timer_tick: [0.25, 0.01, 1200, 0.01, 0.02, 0.04, 1, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    terminal_key: [0.2, 0.01, 950, 0.01, 0.01, 0.03, 1, 2.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    uv_switch: [0.6, 0.05, 300, 0.05, 0.15, 0.3, 2, 0.5, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.05, 0.1],
    victory: [1, 0.05, 523, 0.1, 0.35, 0.7, 1, 1.5, 0, 0, 300, 0.1, 0.2, 0, 0, 0, 0, 0.9, 0.04, 0.1],
    gameover: [1, 0.1, 180, 0.15, 0.45, 0.7, 2, 0.3, -10, 0, 0, 0, 0, 0.8, 0, 0.4, 0, 0.6, 0.08, 0.2]
} as const;

export type SFXName = keyof typeof SFX_PRESETS;

let soundMuted = false;

export function setSoundMuted(muted: boolean): void {
    soundMuted = muted;
}

export function isSoundMuted(): boolean {
    return soundMuted;
}

/**
 * Play a procedural sound effect.
 */
export function playSFX(name: SFXName, volume = 1.0): void {
    if (soundMuted || typeof window === 'undefined') return;
    const preset = SFX_PRESETS[name];
    if (!preset) return;

    try {
        const sound = [...preset] as number[];
        sound[0] = (sound[0] ?? 1) * volume;
        (zzfx as any)(...sound);
    } catch {
        // Silently handle autoplay restrictions before user gesture
    }
}

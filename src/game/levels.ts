/**
 * EXAMINATION ROOM LAYOUT & COORDINATES
 * Defines desk positions, candidate coordinates, and room geometry for Case 01.
 */

export interface DeskPosition {
    candidateId: string;
    candidateNumber: number;
    x: number;
    y: number;
    rotation: number;
    deskWidth: number;
    deskHeight: number;
    label: string;
}

export const TILE = 32;

// The Lagos Sovereign Examination Hall is an arc/horseshoe layout centered on the Observation Wall
export const DESK_POSITIONS: DeskPosition[] = [
    // Top-Left to Top-Right semi-circle
    { candidateId: 'candidate_01', candidateNumber: 1, x: 260, y: 250, rotation: 0.1, deskWidth: 100, deskHeight: 65, label: '01: Mama Ese' },
    { candidateId: 'candidate_02', candidateNumber: 2, x: 430, y: 230, rotation: 0.05, deskWidth: 100, deskHeight: 65, label: '02: Kofi' },
    { candidateId: 'candidate_03', candidateNumber: 3, x: 594, y: 230, rotation: -0.05, deskWidth: 100, deskHeight: 65, label: '03: Dr. Naliaka' },
    { candidateId: 'candidate_04', candidateNumber: 4, x: 764, y: 250, rotation: -0.1, deskWidth: 100, deskHeight: 65, label: '04: Thandeka' },

    // Middle tier
    { candidateId: 'candidate_05', candidateNumber: 5, x: 230, y: 430, rotation: 0.15, deskWidth: 100, deskHeight: 65, label: '05: Dawit' },
    { candidateId: 'candidate_06', candidateNumber: 6, x: 390, y: 410, rotation: 0.05, deskWidth: 100, deskHeight: 65, label: '06: Uwase' },
    { candidateId: 'candidate_07', candidateNumber: 7, x: 634, y: 410, rotation: -0.05, deskWidth: 100, deskHeight: 65, label: '07: Fatou' },
    { candidateId: 'candidate_08', candidateNumber: 8, x: 794, y: 430, rotation: -0.15, deskWidth: 100, deskHeight: 65, label: '08: Chief Obi' },

    // Player Desk centered at the focal bottom
    { candidateId: 'player_09', candidateNumber: 9, x: 512, y: 580, rotation: 0, deskWidth: 130, deskHeight: 75, label: '09: YOU' }
];

export const ROOM_BOUNDS = {
    x: 0,
    y: 0,
    width: 1024,
    height: 768,
    center: { x: 512, y: 384 }
};

export const CINEMATIC_CAMERA_WAYPOINTS = [
    { x: 512, y: 100, zoom: 1.35, duration: 2500, caption: "LAGOS TESTING COMPLEX // SECTOR 07" },
    { x: 512, y: 200, zoom: 1.15, duration: 2200, caption: "8 CANDIDATES ASSEMBLED. 1 SOVEREIGN MANDATE." },
    { x: 512, y: 384, zoom: 1.0, duration: 2000, caption: "THE FIVE ABSOLUTE RULES ARE BROADCAST." },
    { x: 512, y: 580, zoom: 1.25, duration: 2200, caption: "YOUR PAPER IS TURNED OVER: IT IS COMPLETELY BLANK." },
    { x: 512, y: 384, zoom: 1.0, duration: 1500, caption: "THE CLOCK STARTS NOW. 60:00." }
];

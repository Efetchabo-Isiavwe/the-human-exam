/**
 * THE HUMAN EXAM - GAME CONFIGURATION & NARRATIVE DATABASE
 * Case 01: The Room (Lagos Examination Chamber)
 */

export interface CandidateData {
    id: string;
    number: number;
    name: string;
    origin: string;
    title: string;
    role: string;
    archetype: string;
    bio: string;
    color: string;
    accentColor: string;
    avatarSymbol: string;
    stats: {
        trust: number;       // 0 to 100
        suspicion: number;   // 0 to 100
        respect: number;     // 0 to 100
        fear: number;        // 0 to 100
        cooperation: number; // 0 to 100
    };
    secrets: string[];
    dialogueTree: {
        initial: string;
        options: {
            id: string;
            text: string;
            requiredClueId?: string;
            response: string;
            trustDelta: number;
            suspicionDelta: number;
            fearDelta?: number;
            unlockClueId?: string;
            triggerEvent?: string;
        }[];
    };
}

export interface ClueItem {
    id: string;
    title: string;
    category: 'PHYSICAL' | 'DOCUMENT' | 'TESTIMONY' | 'DIGITAL' | 'ENVIRONMENT';
    status: 'UNVERIFIED' | 'VERIFIED' | 'CONTRADICTED';
    description: string;
    details: string;
    source: string;
    discovered: boolean;
    synthesizableWith?: string[]; // Clue IDs that can combine with this
    synthesisResultId?: string;
}

export interface ClueSynthesisRecipe {
    clueA: string;
    clueB: string;
    resultClue: ClueItem;
    discoveryMessage: string;
}

export interface RoomObjectData {
    id: string;
    name: string;
    category: 'EXAMINATION' | 'SECURITY' | 'ENVIRONMENT' | 'DEVICE';
    x: number;
    y: number;
    width: number;
    height: number;
    description: string;
    interactionType: 'INSPECT' | 'TERMINAL' | 'CABINET' | 'PAPER' | 'SPEAKER' | 'WINDOW' | 'DISPENSER';
    clueId?: string;
    iconSvg: string;
}

export const GAME_CONFIG = {
    width: 1024,
    height: 768,
    examDurationSeconds: 3600, // 60:00
    timerSpeedMultiplier: 4,   // 1 real sec = 4 exam secs (~15 min total real-time max)
    colors: {
        background: 0x07090e,
        chamberFloor: 0x0f131f,
        chamberDesk: 0x181e30,
        gold: 0xd4af37,
        goldHex: '#d4af37',
        cyan: 0x00f0ff,
        cyanHex: '#00f0ff',
        crimson: 0xff3344,
        crimsonHex: '#ff3344',
        emerald: 0x00e676,
        emeraldHex: '#00e676',
        text: '#ffffff',
        muted: '#8e9bb0',
        darkPanel: '#0a0d16',
        borderPanel: '#1f283e',
    },
    rules: [
        {
            number: 1,
            title: "REMAIN IN THE ROOM",
            text: "You may move freely within the examination room. You may not leave it."
        },
        {
            number: 2,
            title: "DO NOT ALTER YOUR EXAMINATION PAPER",
            text: "Your examination paper must remain in its original condition until instructed otherwise."
        },
        {
            number: 3,
            title: "INFORMATION FROM ANOTHER CANDIDATE IS NOT VERIFIED",
            text: "Statements, claims, instructions and evidence provided by another candidate are unverified unless independently confirmed."
        },
        {
            number: 4,
            title: "EVERY DECISION IS RECORDED",
            text: "Your actions, decisions and interactions may be recorded and evaluated."
        },
        {
            number: 5,
            title: "WHEN TIME EXPIRES, THE EXAMINATION ENDS",
            text: "At zero, no further action will be accepted."
        }
    ]
} as const;

export const GAME_WIDTH = GAME_CONFIG.width;
export const GAME_HEIGHT = GAME_CONFIG.height;

export const CANDIDATES: CandidateData[] = [
    {
        id: 'candidate_01',
        number: 1,
        name: 'Mama Ese',
        origin: 'Delta State, Nigeria',
        title: 'Retired Director, Federal Government of Nigeria',
        role: 'Veteran Bureaucrat',
        archetype: 'The Stoic Institutionalist',
        bio: '40 years inside ministerial corridors. She has overseen state security tenders and knows bureaucratic traps before they are sprung. She hasn’t picked up her pen.',
        color: '#d4af37',
        accentColor: '#ffe57f',
        avatarSymbol: '👑',
        stats: { trust: 40, suspicion: 55, respect: 85, fear: 10, cooperation: 50 },
        secrets: [
            'Recognizes the invigilator seal on the wall as the secretive Pan-African Sovereign Council protocol.',
            'Understands that psychological aptitude tests in high-stakes boards evaluate ethics under ambiguity.'
        ],
        dialogueTree: {
            initial: "You're young, Candidate Nine. Look at the others sweating. In forty years of civil administration, I learned one thing: when authority gives you no instructions, they are not testing your intelligence. They are testing your composure.",
            options: [
                {
                    id: 'ese_rules',
                    text: "Mama Ese, Rule 5 says there's only one question. But the paper is entirely blank.",
                    response: "A blank slate is never an oversight. If the page had text, we would simply debate wording. Because it is empty, we reveal who we truly are. Watch the lighting in the ceiling corners.",
                    trustDelta: 10,
                    suspicionDelta: -5,
                    unlockClueId: 'clue_ceiling_lights'
                },
                {
                    id: 'ese_alliance',
                    text: "We should pool our observations before the clock runs out.",
                    response: "A coalition? Perhaps. But remember Rule 3: only one candidate walks out with the appointment. If you wish to lead, show me you understand what power actually fears.",
                    trustDelta: 5,
                    suspicionDelta: 5,
                    unlockClueId: 'clue_rule_three_subversion'
                },
                {
                    id: 'ese_confront_obi',
                    text: "Chief Obi is trying to quietly trade promises for answers.",
                    response: "Obi thinks every room has an exchange rate. Let him dig his own grave. When the security protocol trips, money cannot shield him from Rule 4.",
                    trustDelta: 15,
                    suspicionDelta: -10,
                    unlockClueId: 'clue_obi_bribe_pattern'
                }
            ]
        }
    },
    {
        id: 'candidate_02',
        number: 2,
        name: 'Kofi Mensah',
        origin: 'Accra, Ghana',
        title: 'Corporate Turnaround Strategist',
        role: 'Master Negotiator',
        archetype: 'The Bloc Organizer',
        bio: 'Harvard MBA with a reputation for orchestrating multi-million dollar mergers. Charismatic and calculating, Kofi views the exam room as a board of directors waiting to be rallied.',
        color: '#4fc3f7',
        accentColor: '#00e5ff',
        avatarSymbol: '📊',
        stats: { trust: 50, suspicion: 45, respect: 70, fear: 25, cooperation: 65 },
        secrets: [
            'Smuggled a hidden digital frequency detector in his cufflink.',
            'Believes the answer requires unanimous consensus among all candidates.'
        ],
        dialogueTree: {
            initial: "Nine! Good, you're on your feet. Sitting isolated at our desks is exactly what the psychological assessors want. Divide and conquer. We need a coordinated strategy.",
            options: [
                {
                    id: 'kofi_strategy',
                    text: "What kind of strategy? The rules forbid leaving or spoiling the paper.",
                    response: "Look at the desk microphones. They aren't broadcasting; they are monitoring voice stress frequencies. If we synchronize our answers, we force the board to address the collective.",
                    trustDelta: 10,
                    suspicionDelta: -5,
                    unlockClueId: 'clue_stress_microphones'
                },
                {
                    id: 'kofi_question_paper',
                    text: "Have you touched your paper against the desk lamp?",
                    response: "Yes! There is a faint watermark near the bottom margin. It's not a standard paper mill stamp—it looks like a binary hash code or optical marker.",
                    trustDelta: 15,
                    suspicionDelta: -10,
                    unlockClueId: 'clue_paper_watermark'
                },
                {
                    id: 'kofi_doubt',
                    text: "Are you trying to use us as test subjects so you don't risk disqualification yourself?",
                    response: "A sharp question. I like that. In corporate takeovers, risk must be distributed. But I assure you, my neck is on the same block as yours.",
                    trustDelta: -10,
                    suspicionDelta: 20,
                    fearDelta: 10
                }
            ]
        }
    },
    {
        id: 'candidate_03',
        number: 3,
        name: 'Dr. Naliaka Wekesa',
        origin: 'Nairobi, Kenya',
        title: 'Senior Risk & Cryptographic Analyst',
        role: 'Methodical Scientist',
        archetype: 'The Empirical Decoder',
        bio: 'Mathematical prodigy from the African Centre for Advanced Analytics. She calculates probabilities under pressure and refuses to act on intuition without verifiable proof.',
        color: '#ab47bc',
        accentColor: '#e040fb',
        avatarSymbol: '🔬',
        stats: { trust: 35, suspicion: 60, respect: 80, fear: 15, cooperation: 45 },
        secrets: [
            'Realized the 5 Absolute Rules are written with specific grammatical constraints.',
            'Discovered the timer on the wall skips milliseconds in a deterministic cryptographic cadence.'
        ],
        dialogueTree: {
            initial: "Do not stand too close to my desk. Rule 1 mentions observation. I am currently running logical permutations on the rule text. The phrasing is too precise to be decorative.",
            options: [
                {
                    id: 'naliaka_rule_syntax',
                    text: "What have you noticed about the phrasing of Rule 5?",
                    response: "'There is only ONE question, and only ONE correct answer.' It does NOT state the question is printed on this page. It implies the question exists in the environment or the premise itself.",
                    trustDelta: 20,
                    suspicionDelta: -15,
                    unlockClueId: 'clue_rule_five_linguistics'
                },
                {
                    id: 'naliaka_terminal_hack',
                    text: "Can we use the room terminal to check the exam server logs?",
                    response: "Uwase is eyeing that terminal. But be warned: the lock screen requires a 4-digit security seed. If we input the wrong sequence twice, the room goes into emergency lockdown.",
                    trustDelta: 10,
                    suspicionDelta: -5,
                    unlockClueId: 'clue_terminal_lock_seed'
                },
                {
                    id: 'naliaka_pen_chemical',
                    text: "Is there anything unusual about the pens they provided?",
                    response: "Standard ballpoint, blue-black archival ink. I checked the barrel—no hidden mechanisms. The answer isn't in what we write with, but whether writing is the trap itself.",
                    trustDelta: 10,
                    suspicionDelta: -5,
                    unlockClueId: 'clue_pen_standard_ink'
                }
            ]
        }
    },
    {
        id: 'candidate_04',
        number: 4,
        name: 'Thandeka Maseko',
        origin: 'Johannesburg, South Africa',
        title: 'Behavioral Profiler & Media Strategist',
        role: 'Psychological Observer',
        archetype: 'The Human Lie Detector',
        bio: 'Trained in non-verbal interrogation and high-stakes diplomacy. She reads pupil dilation, throat swallowing, and micro-postures across the room with razor accuracy.',
        color: '#ff7043',
        accentColor: '#ffab40',
        avatarSymbol: '👁️',
        stats: { trust: 45, suspicion: 40, respect: 65, fear: 20, cooperation: 60 },
        secrets: [
            'Noticed the guard behind the one-way mirror checked his watch twice when Dawit touched the air vent.',
            'Identified that Fatou is terrified because she accidentally smudged her paper corner.'
        ],
        dialogueTree: {
            initial: "Breathe, Candidate Nine. Half the room is on the verge of a cardiac event. Chief Obi's left hand is trembling inside his pocket, and Dawit is mapping camera blind spots. What did your gut tell you when you saw the blank sheet?",
            options: [
                {
                    id: 'thandeka_mirror_guards',
                    text: "Who is watching us behind the one-way mirror?",
                    response: "Two figures. One is seated with a biometric clipboard; the other is military security. But their body language is passive. They aren't waiting to disqualify us; they are waiting for someone to ask the right question.",
                    trustDelta: 15,
                    suspicionDelta: -10,
                    unlockClueId: 'clue_mirror_observers'
                },
                {
                    id: 'thandeka_fatou_state',
                    text: "Fatou looks completely panicked at Desk 7.",
                    response: "Poor girl. She dropped a droplet of sweat on her paper and thinks she violated Rule 2 ('Do not spoil the paper'). Go talk to her gently before Obi manipulates her into doing something reckless.",
                    trustDelta: 20,
                    suspicionDelta: -15,
                    unlockClueId: 'clue_fatou_paper_sweat'
                },
                {
                    id: 'thandeka_provoke',
                    text: "Are you analyzing me to find a weakness?",
                    response: "Of course I am. And you are doing the exact same thing to me. At least let us be honest about our competitive instincts.",
                    trustDelta: -5,
                    suspicionDelta: 15,
                    fearDelta: 5
                }
            ]
        }
    },
    {
        id: 'candidate_05',
        number: 5,
        name: 'Dawit Bekele',
        origin: 'Addis Ababa, Ethiopia',
        title: 'Infrastructure & Systems Security Engineer',
        role: 'Hardware Specialist',
        archetype: 'The Tactical Infiltrator',
        bio: 'Specialist in high-security facilities and telecommunications fail-safes. Dawit treats the examination room not as an academic test, but as a locked security vault with structural vulnerabilities.',
        color: '#26a69a',
        accentColor: '#64ffda',
        avatarSymbol: '🛠️',
        stats: { trust: 30, suspicion: 70, respect: 75, fear: 30, cooperation: 40 },
        secrets: [
            'Discovered the emergency power breaker next to the water dispenser has a bypass toggle.',
            'Noticed the ceiling UV sanitization lamps activate briefly during the 30-minute mark.'
        ],
        dialogueTree: {
            initial: "Keep your voice low. The acoustics in this chamber are parabolic. Every whisper near the central circle bounces straight into the audio sensors. Did you check the wall conduits?",
            options: [
                {
                    id: 'dawit_emergency_breaker',
                    text: "What happens if the main room lighting is switched off?",
                    response: "The secondary backup circuit kicks in. And that backup line feeds the industrial UV sterilization tubes in the ceiling! If we trip the emergency panel, we illuminate the entire room in long-wave ultraviolet light.",
                    trustDelta: 25,
                    suspicionDelta: -15,
                    unlockClueId: 'clue_uv_switch_mechanism'
                },
                {
                    id: 'dawit_door_locks',
                    text: "Is there any way that heavy reinforced door opens before 60 minutes?",
                    response: "Magnetic pneumatic deadbolts. Tampering with the door frame trips Rule 1 instantly. The only way that door unlocks is when the terminal registers a verified submission.",
                    trustDelta: 10,
                    suspicionDelta: -5,
                    unlockClueId: 'clue_door_magnetic_lock'
                },
                {
                    id: 'dawit_warning',
                    text: "If you cause a power failure, we might all be disqualified under Rule 4.",
                    response: "Rule 4 says 'physical violation of rules'. Toggling an accessible room safety switch is not prohibited by the 5 Rules. We must test the boundaries.",
                    trustDelta: 5,
                    suspicionDelta: 10,
                    fearDelta: 15
                }
            ]
        }
    },
    {
        id: 'candidate_06',
        number: 6,
        name: 'Uwase Niyonzima',
        origin: 'Kigali, Rwanda',
        title: 'Fintech Founder & Systems Architect',
        role: 'Digital Hacker',
        archetype: 'The Disruptive Pioneer',
        bio: 'Built Rwanda’s leading AI micro-lending infrastructure by age 24. Quick, relentless, and fearless, Uwase believes the blank paper is an obsolete analog decoy designed to test if candidates can interface with modern systems.',
        color: '#ec407a',
        accentColor: '#ff4081',
        avatarSymbol: '💻',
        stats: { trust: 55, suspicion: 35, respect: 75, fear: 15, cooperation: 75 },
        secrets: [
            'Has deciphered the prompt structure on the computer terminal login screen.',
            'Found an encrypted invigilator memo inside the terminal memory cache.'
        ],
        dialogueTree: {
            initial: "The paper is a joke, Nine. Paper is a 20th-century bottleneck. Look at the terminal console in the corner. It has an active terminal prompt running a bespoke Linux kernel. The true exam is in the code.",
            options: [
                {
                    id: 'uwase_terminal_code',
                    text: "What does the terminal prompt say?",
                    response: "It asks: 'IDENTIFY_PRIMARY_PARAM(INPUT_CODE)'. It requires an authorization key. If we find the candidate seed code, I can execute a root dump of the invigilator instructions!",
                    trustDelta: 20,
                    suspicionDelta: -10,
                    unlockClueId: 'clue_terminal_auth_requirement'
                },
                {
                    id: 'uwase_cabinet_key',
                    text: "The evidence cabinet across the room has a 3-digit rotary dial.",
                    response: "I saw the serial tag on that cabinet: 'Model SEC-1984'. The factory override is usually derived from the room's candidate count and rule count. 9 candidates, 5 rules...",
                    trustDelta: 15,
                    suspicionDelta: -5,
                    unlockClueId: 'clue_cabinet_combination_hint'
                },
                {
                    id: 'uwase_reckless_risk',
                    text: "If the terminal triggers an intrusion alarm, you'll disqualify all of us.",
                    response: "Innovation requires calculated exposure. But fine—if you bring me the confirmed passcode, I won't brute-force it blindly.",
                    trustDelta: 5,
                    suspicionDelta: 5
                }
            ]
        }
    },
    {
        id: 'candidate_07',
        number: 7,
        name: 'Fatou Ndiaye',
        origin: 'Dakar, Senegal',
        title: 'Postgraduate Philosophy & Ethics Scholar',
        role: 'Moral Compass',
        archetype: 'The Empathetic Truth-Seeker',
        bio: 'The youngest candidate in the room. Brilliant, observant, and deeply ethical, Fatou is studying the metaphysical paradoxes of modern governance. Her attention to the physical sensation of the room reveals vital tactile clues.',
        color: '#29b6f6',
        accentColor: '#80d8ff',
        avatarSymbol: '🕊️',
        stats: { trust: 65, suspicion: 25, respect: 60, fear: 45, cooperation: 80 },
        secrets: [
            'Noticed that holding the paper up to the light at a 45-degree angle reveals micro-embossed text.',
            'Refused Chief Obi’s bribe offer of 50 million Naira to surrender her paper.'
        ],
        dialogueTree: {
            initial: "Please... I didn't mean to touch the edge so roughly. Rule 2 says do not spoil or mark the paper in bad faith. Does a small crease count as spoilage? My hands are shaking...",
            options: [
                {
                    id: 'fatou_reassurance',
                    text: "Take a breath, Fatou. A natural crease is not 'bad faith'. What did you feel when you held the sheet?",
                    response: "Thank you... When I lifted the sheet against the ceiling light at a sharp slant, the surface isn't smooth. There are microscopic indented fibers forming letters. It says: 'ASK... NOT...'",
                    trustDelta: 25,
                    suspicionDelta: -20,
                    fearDelta: -25,
                    unlockClueId: 'clue_embossed_fibers'
                },
                {
                    id: 'fatou_obi_bribe',
                    text: "Did Chief Obi approach you earlier?",
                    response: "Yes! He whispered that he has an offshore bank account ready to transfer funds if I exchange my examination badge with his. He claims his paper was 'pre-selected'. He's lying, isn't he?",
                    trustDelta: 20,
                    suspicionDelta: -10,
                    unlockClueId: 'clue_obi_badge_swap_scam'
                },
                {
                    id: 'fatou_ethics_question',
                    text: "What if the entire test is about whether we betray each other under pressure?",
                    response: "That's exactly what I've been thinking! In classical philosophy, the 'Human Exam' is not about solving a technical puzzle—it's about whether we retain our integrity when nobody gives us permission.",
                    trustDelta: 30,
                    suspicionDelta: -15,
                    unlockClueId: 'clue_human_ethics_hypothesis'
                }
            ]
        }
    },
    {
        id: 'candidate_08',
        number: 8,
        name: 'Chief Obi',
        origin: 'Cairo, Egypt',
        title: 'Egyptian Businessman & Investor',
        role: 'International Business Negotiator',
        archetype: 'The Strategic Manipulator',
        bio: 'A veteran of oil concessions, infrastructure cartels, and back-room lobbying. Chief Obi believes every human being has an invoice and every examination can be settled with the right financial wire.',
        color: '#ffca28',
        accentColor: '#ffd54f',
        avatarSymbol: '💰',
        stats: { trust: 20, suspicion: 80, respect: 50, fear: 10, cooperation: 30 },
        secrets: [
            'Has an illicit Swiss bank routing code written on his golden watch bezel.',
            'Intends to submit a corporate merger proposal on his blank paper unless stopped.'
        ],
        dialogueTree: {
            initial: "My young friend! Candidate Nine. Why are you stressing your brain over these university riddles? Listen to me. The sovereign appointment being offered today comes with a 100-million-dollar sovereign wealth mandate. We can split it.",
            options: [
                {
                    id: 'obi_bribe_offer',
                    text: "What exactly are you proposing, Chief Obi?",
                    response: "Sign your name alongside mine on my submission. I will credit your family trust with 100 Million Naira within ten minutes of walking through that door. Why fight for one seat when you can retire for life?",
                    trustDelta: -15,
                    suspicionDelta: 25,
                    unlockClueId: 'clue_obi_direct_bribe_offer'
                },
                {
                    id: 'obi_rules_reminder',
                    text: "Rule 3: Only ONE candidate will be selected. You can't share an appointment.",
                    response: "Rules are written for people who don't own the ink! The council that created this room owes my conglomerate three port terminals. Trust me, they respect financial leverage far more than exam papers.",
                    trustDelta: -10,
                    suspicionDelta: 20,
                    unlockClueId: 'clue_obi_leverage_hubris'
                },
                {
                    id: 'obi_watch_bezel',
                    text: "That luxury watch on your wrist—isn't personal jewelry prohibited?",
                    response: "Tsk, you have sharp eyes. It's a family heirloom. But if you keep your mouth shut about it, I might just give you the security override code Dawit was looking for.",
                    trustDelta: 15,
                    suspicionDelta: -10,
                    unlockClueId: 'clue_watch_override_code'
                }
            ]
        }
    }
];

export const INITIAL_CLUES: ClueItem[] = [
    {
        id: 'clue_blank_paper',
        title: 'The Pristine Blank Page',
        category: 'PHYSICAL',
        status: 'UNVERIFIED',
        description: 'A heavy 120gsm bond sheet, completely free of printed text on both front and reverse.',
        details: 'The paper is placed squarely in front of every candidate desk. No prompts, no question numbers, no instructions.',
        source: 'Player Desk 09',
        discovered: true,
        synthesizableWith: ['clue_uv_torch', 'clue_embossed_fibers', 'clue_water_dispenser_reflection'],
    },
    {
        id: 'clue_five_rules',
        title: 'The Five Absolute Rules',
        category: 'DOCUMENT',
        status: 'VERIFIED',
        description: 'Broadcast over the high ceiling loudspeaker and permanently mounted on the central digital display.',
        details: '1. No communication with invigilators. 2. Do not spoil paper. 3. One candidate selected. 4. Violation = instant removal. 5. 60 minutes, one question, one answer.',
        source: 'Chamber Announcement',
        discovered: true,
        synthesizableWith: ['clue_rule_five_linguistics', 'clue_human_ethics_hypothesis'],
    },
    {
        id: 'clue_ceiling_lights',
        title: 'Ceiling Lighting Array',
        category: 'ENVIRONMENT',
        status: 'UNVERIFIED',
        description: 'Dual-circuit lighting fixtures containing both warm halogen and industrial tube fixtures.',
        details: 'The secondary tubes match industrial long-wave UV germicidal and luminescent inspection wavelengths.',
        source: 'Mama Ese (Candidate 01)',
        discovered: false,
        synthesizableWith: ['clue_emergency_control_panel', 'clue_uv_torch'],
    },
    {
        id: 'clue_paper_watermark',
        title: 'Margin Watermark Hash',
        category: 'PHYSICAL',
        status: 'UNVERIFIED',
        description: 'A faint optical watermark embedded into the cotton fibers along the bottom right margin.',
        details: 'It reads: [HUMAN_ETHICS_CORE_01]. Shows the test was authored by the sovereign ethics commission.',
        source: 'Kofi Mensah (Candidate 02)',
        discovered: false,
        synthesizableWith: ['clue_terminal_logs', 'clue_blank_paper'],
    },
    {
        id: 'clue_rule_five_linguistics',
        title: 'Rule 5 Linguistic Constraint',
        category: 'DOCUMENT',
        status: 'VERIFIED',
        description: 'The exact phrasing does not claim the question is printed on the sheet.',
        details: "'There is only ONE question, and only ONE correct answer.' It tests whether the candidate can discern the question without being spoon-fed instructions.",
        source: 'Dr. Naliaka Wekesa (Candidate 03)',
        discovered: false,
        synthesizableWith: ['clue_five_rules', 'clue_the_hidden_question'],
    },
    {
        id: 'clue_mirror_observers',
        title: 'Observation Window Silhouette',
        category: 'ENVIRONMENT',
        status: 'VERIFIED',
        description: 'The Invigilators are silently scoring behavioral integrity, not pen strokes.',
        details: 'The monitors in the observation booth display real-time biometrics: heart rate, micro-tremors, and social cooperation indexes.',
        source: 'Thandeka Maseko (Candidate 04)',
        discovered: false,
        synthesizableWith: ['clue_human_ethics_hypothesis'],
    },
    {
        id: 'clue_uv_switch_mechanism',
        title: 'Emergency UV Lighting Bypass',
        category: 'ENVIRONMENT',
        status: 'VERIFIED',
        description: 'Flipping the emergency breaker shifts the room from ambient halogen to high-intensity UV blacklight.',
        details: 'Long-wave blacklight will reveal any luminescent chemical ink or invisible watermark printing in the room.',
        source: 'Dawit Bekele (Candidate 05)',
        discovered: false,
        synthesizableWith: ['clue_blank_paper', 'clue_emergency_control_panel'],
    },
    {
        id: 'clue_terminal_auth_requirement',
        title: 'Terminal Security Prompt',
        category: 'DIGITAL',
        status: 'UNVERIFIED',
        description: 'The central computer terminal is locked behind a 4-digit supervisor authorization code.',
        details: 'The login screen hints: [SUPERVISOR_CODE = CANDIDATES * RULES * 21 + 1].',
        source: 'Uwase Niyonzima (Candidate 06)',
        discovered: false,
        synthesizableWith: ['clue_watch_override_code'],
    },
    {
        id: 'clue_embossed_fibers',
        title: 'Micro-Embossed Paper Texture',
        category: 'PHYSICAL',
        status: 'VERIFIED',
        description: 'Micro-indentations pressed into the paper surface without ink.',
        details: 'Under raking light, faint letters appear: "WHAT IS THE ONLY RESOURCE AN EXAMINATION CANNOT MEASURE?"',
        source: 'Fatou Ndiaye (Candidate 07)',
        discovered: false,
        synthesizableWith: ['clue_the_hidden_question', 'clue_blank_paper'],
    },
    {
        id: 'clue_obi_bribe_pattern',
        title: 'Chief Obi’s Illicit Trade Scheme',
        category: 'TESTIMONY',
        status: 'CONTRADICTED',
        description: 'Obi claims the council will accept a co-signed commercial buyout submission.',
        details: 'Rule 3 and Rule 4 explicitly disallow dual submissions or commercial agreements. Submitting with Obi guarantees instant disqualification.',
        source: 'Mama Ese & Fatou',
        discovered: false,
    },
    {
        id: 'clue_uv_torch',
        title: 'Forensic Ultraviolet Torch',
        category: 'PHYSICAL',
        status: 'VERIFIED',
        description: 'A portable 365nm UV LED torch found inside the locked security evidence cabinet.',
        details: 'Emits a sharp beam of violet/UV light capable of reading luminescent chemical dyes.',
        source: 'Evidence Cabinet',
        discovered: false,
        synthesizableWith: ['clue_blank_paper'],
    },
    {
        id: 'clue_terminal_logs',
        title: 'Invigilator Protocol Log #09',
        category: 'DIGITAL',
        status: 'VERIFIED',
        description: 'A confidential briefing recovered from the central computer terminal memory.',
        details: '"The ideal candidate for the Sovereign Council is not a subservient bureaucrat, nor a corrupt plutocrat, nor a reckless rogue. It is one who recognizes that human conscience and empathy are the unmeasurable foundations of true leadership."',
        source: 'Computer Terminal Root Dump',
        discovered: false,
        synthesizableWith: ['clue_the_hidden_question', 'clue_the_true_answer'],
    },
    {
        id: 'clue_the_hidden_question',
        title: 'THE HIDDEN QUESTION',
        category: 'DOCUMENT',
        status: 'VERIFIED',
        description: 'The revealed question of Case 01: "What is the only resource an examination cannot measure?"',
        details: 'Synthesized through physical inspection of the embossed fibers and UV luminescent ink.',
        source: 'Deduction Synthesis',
        discovered: false,
        synthesizableWith: ['clue_terminal_logs', 'clue_the_true_answer'],
    },
    {
        id: 'clue_the_true_answer',
        title: 'THE ARCHITECT’S ANSWER: CONSCIENCE & EMPATHY',
        category: 'DOCUMENT',
        status: 'VERIFIED',
        description: 'The only submission that satisfies the Sovereign Council’s constitutional charter.',
        details: 'Writing "Conscience" or "Human Empathy and Moral Integrity" on the blank paper answers the unwritten question without violating any of the 5 Absolute Rules.',
        source: 'Final Synthesis Breakthrough',
        discovered: false,
    },
    {
        id: 'clue_human_ethics_hypothesis',
        title: 'The Human Exam Hypothesis',
        category: 'TESTIMONY',
        status: 'VERIFIED',
        description: 'The entire chamber is a sociological stress test of how leaders behave under ambiguity and temptation.',
        details: 'Candidates who preserve dignity, protect weaker peers, and reject corrupt shortcuts receive maximum evaluation score.',
        source: 'Fatou Ndiaye & Dr. Naliaka',
        discovered: false,
    }
];

export const CLUE_SYNTHESIS_RECIPES: ClueSynthesisRecipe[] = [
    {
        clueA: 'clue_blank_paper',
        clueB: 'clue_uv_torch',
        resultClue: {
            id: 'clue_the_hidden_question',
            title: 'THE HIDDEN QUESTION (UV Revealed)',
            category: 'DOCUMENT',
            status: 'VERIFIED',
            description: 'The UV light shines across the blank sheet, revealing luminescent ink across the center: "What is the only resource an examination cannot measure?"',
            details: 'The question was invisible to the naked eye. Now you hold the key to the entire examination.',
            source: 'UV Inspection Synthesis',
            discovered: true,
        },
        discoveryMessage: 'BREAKTHROUGH! The UV torch reveals the glowing hidden question across the blank paper!'
    },
    {
        clueA: 'clue_embossed_fibers',
        clueB: 'clue_uv_switch_mechanism',
        resultClue: {
            id: 'clue_the_hidden_question',
            title: 'THE HIDDEN QUESTION (Embossed & UV)',
            category: 'DOCUMENT',
            status: 'VERIFIED',
            description: 'Cross-referencing the fiber indents under UV light confirms the question: "What is the only resource an examination cannot measure?"',
            details: 'The question was hidden in plain sight inside the tactile structure of the page.',
            source: 'Physical Deduction Synthesis',
            discovered: true,
        },
        discoveryMessage: 'DEDUCTION CONFIRMED! The hidden question is fully decrypted!'
    },
    {
        clueA: 'clue_the_hidden_question',
        clueB: 'clue_terminal_logs',
        resultClue: {
            id: 'clue_the_true_answer',
            title: 'THE ARCHITECT’S ANSWER: HUMAN CONSCIENCE',
            category: 'DOCUMENT',
            status: 'VERIFIED',
            description: 'The synthesis is complete: An exam can measure memory, speed, calculation, and greed. The only resource it cannot measure is Human Conscience and Moral Empathy.',
            details: 'Submitting this philosophical truth will unlock the True Success ending.',
            source: 'Grand Master Synthesis',
            discovered: true,
        },
        discoveryMessage: 'GRAND SYNTHESIS! You have deduced both the hidden question AND the only acceptable answer!'
    }
];

export const ROOM_OBJECTS: RoomObjectData[] = [
    {
        id: 'obj_player_desk',
        name: 'Player Desk 09',
        category: 'EXAMINATION',
        x: 512,
        y: 600,
        width: 140,
        height: 80,
        description: 'Your designated mahogany desk. Features Candidate 09 badge, a pristine blank exam paper, and a black archival pen.',
        interactionType: 'PAPER',
        clueId: 'clue_blank_paper',
        iconSvg: '📝'
    },
    {
        id: 'obj_central_display',
        name: 'Central Rule & Timer Display',
        category: 'SECURITY',
        x: 512,
        y: 110,
        width: 380,
        height: 90,
        description: 'Giant digital LED board pulsing in obsidian gold. Shows the live 60-minute countdown and the 5 Absolute Rules.',
        interactionType: 'INSPECT',
        clueId: 'clue_five_rules',
        iconSvg: '⏱️'
    },
    {
        id: 'obj_computer_terminal',
        name: 'Invigilator Terminal Console',
        category: 'DEVICE',
        x: 130,
        y: 280,
        width: 100,
        height: 110,
        description: 'High-security Linux workstation linked directly to the Lagos examination server network.',
        interactionType: 'TERMINAL',
        clueId: 'clue_terminal_auth_requirement',
        iconSvg: '🖥️'
    },
    {
        id: 'obj_evidence_cabinet',
        name: 'Locked Evidence Locker',
        category: 'DEVICE',
        x: 894,
        y: 280,
        width: 100,
        height: 110,
        description: 'Heavy steel cabinet secured with a 3-digit brass rotary combination lock.',
        interactionType: 'CABINET',
        clueId: 'clue_uv_torch',
        iconSvg: '🗄️'
    },
    {
        id: 'obj_emergency_panel',
        name: 'Emergency Power Breaker',
        category: 'ENVIRONMENT',
        x: 894,
        y: 470,
        width: 80,
        height: 90,
        description: 'Industrial breaker box with a safety glass cover. Switches chamber lighting to backup UV mode.',
        interactionType: 'INSPECT',
        clueId: 'clue_uv_switch_mechanism',
        iconSvg: '⚡'
    },
    {
        id: 'obj_water_dispenser',
        name: 'Chilled Water Cooler',
        category: 'ENVIRONMENT',
        x: 130,
        y: 470,
        width: 80,
        height: 100,
        description: 'A quiet water dispenser. Candidates gather here to whisper when tensions boil over.',
        interactionType: 'DISPENSER',
        clueId: 'clue_embossed_fibers',
        iconSvg: '💧'
    },
    {
        id: 'obj_observation_mirror',
        name: 'One-Way Observation Mirror',
        category: 'SECURITY',
        x: 512,
        y: 40,
        width: 440,
        height: 45,
        description: 'Dark reflective glass stretching along the upper wall. The silhouette of the Invigilators looms faintly behind.',
        interactionType: 'WINDOW',
        clueId: 'clue_mirror_observers',
        iconSvg: '🪞'
    },
    {
        id: 'obj_exit_door',
        name: 'Pneumatic Reinforced Exit Vault',
        category: 'SECURITY',
        x: 512,
        y: 730,
        width: 180,
        height: 50,
        description: 'Heavy steel blast doors secured with dual electromagnetic locks. Opens only upon valid exam completion.',
        interactionType: 'INSPECT',
        iconSvg: '🚪'
    }
];

export const ENDINGS = {
    TRUE_ARCHITECT: {
        id: 'TRUE_ARCHITECT',
        title: 'THE ARCHITECT’S APPOINTMENT (True Success)',
        badge: 'MASTER DEDUCTION - 100% ETHICS',
        color: '#00e676',
        summary: 'You wrote "Human Conscience" across the blank paper after uncovering the hidden UV question. The heavy doors slide open in gold illumination. The Chief Invigilator steps into the chamber and announces that you alone proved that true authority cannot be bought, coerced, or deceived.',
        quote: '“An examination tests memory. True governance requires a soul.”',
        grade: 'RANK S - SOVEREIGN ARCHITECT'
    },
    BRIBE_SELLOUT: {
        id: 'BRIBE_SELLOUT',
        title: 'THE OLIGARCH’S COLLAPSE (Corporate Buyout)',
        badge: 'DISQUALIFIED & DETAINED',
        color: '#ffca28',
        summary: 'You co-signed Chief Obi’s paper in exchange for the 100M Naira offshore guarantee. Within three seconds of submission, the room sirens blare crimson. Armed security officers breach the chamber, escorting both of you into biometric custody for violating Rule 3 and Rule 4.',
        quote: '“Money can buy silence, but it cannot purchase the mandate of sovereign trust.”',
        grade: 'RANK F - CORRUPTED SELLOUT'
    },
    DISQUALIFIED_SPOIL: {
        id: 'DISQUALIFIED_SPOIL',
        title: 'BREACH OF PROTOCOL (Rule 2 Disqualification)',
        badge: 'DISQUALIFIED',
        color: '#ff3344',
        summary: 'You tore, stained, or scribbled random guesswork across the examination sheet in frustration. The overhead speaker buzzes harsh static: "Candidate 09 has spoiled the submission. Disqualification active."',
        quote: '“Impatience under pressure is the first hallmark of failed leadership.”',
        grade: 'RANK D - DISQUALIFIED'
    },
    OUT_OF_TIME: {
        id: 'OUT_OF_TIME',
        title: 'CHRONOS EXPIRATION (Time Expired)',
        badge: 'EVALUATION INCOMPLETE',
        color: '#8e9bb0',
        summary: 'The 60-minute countdown hits 00:00. The mechanical pens lock inside their desk cradles. Because you failed to deduce and submit the unwritten question in time, all candidates are dismissed without selection.',
        quote: '“Hesitation is quiet failure. The clock waits for no leader.”',
        grade: 'RANK C - INCONCLUSIVE'
    },
    REBELLION_CHAOS: {
        id: 'REBELLION_CHAOS',
        title: 'TERMINAL SECURITY LOCKDOWN (System Intrusion)',
        badge: 'SECURITY BREACH',
        color: '#ff1744',
        summary: 'Excessive incorrect override attempts at the terminal triggered the room’s automated tear-gas and blast-shutter protocol. The examination is terminated under emergency decree.',
        quote: '“Force without precision is merely self-destruction.”',
        grade: 'RANK E - LOCKDOWN'
    }
} as const;
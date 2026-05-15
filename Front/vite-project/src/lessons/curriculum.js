// Each lesson shape:
// { id, module, moduleIndex, title:{tr,en}, intro:{tr,en}, clef, type, steps, passThreshold, mnemonic? }
//
// step shapes:
//   press-key:    { noteName, vexKey, accidental?, label:{tr,en}, hintMidi }
//   multi-choice: { noteName, vexKey, accidental?, label:{tr,en}, choices:[{noteName,label:{tr,en}}] }
//   rhythm-tap:   { timeSignature, beatsPerBar, bpm }
//   interval:     { notes:[{noteName,vexKey}], label:{tr,en} }
//   intro:        (no steps array needed)

const curriculum = [
  // ─── Module A — Staff & Treble Clef ─────────────────────────────────────────
  {
    id: 'intro-staff',
    module: 'A',
    moduleIndex: 0,
    title: { tr: 'Porte Nedir?', en: 'What is a Staff?' },
    intro: {
      tr: 'Porte, müziğin yazıldığı 5 yatay çizgiden oluşur. Her çizgi ve aralık bir nota temsil eder. Sol anahtarı (treble clef) portede tiz sesleri gösterir.',
      en: 'A staff consists of 5 horizontal lines. Each line and space represents a note. The treble clef shows higher-pitched notes.',
    },
    clef: 'treble',
    type: 'intro',
    steps: [],
    passThreshold: 1,
  },
  {
    id: 'treble-lines',
    module: 'A',
    moduleIndex: 1,
    title: { tr: 'Sol Anahtarı — Çizgi Notaları', en: 'Treble Clef Lines' },
    intro: {
      tr: 'Sol anahtarında 5 çizgi notu vardır: Mi (E) – Sol (G) – Si (B) – Re (D) – Fa (F). Hatırlama yöntemi: "Every Good Boy Does Fine" / "E – G – B – D – F".',
      en: 'The 5 line notes in treble clef are: E – G – B – D – F. Mnemonic: "Every Good Boy Does Fine".',
    },
    clef: 'treble',
    type: 'press-key',
    steps: [
      { noteName: 'E4', vexKey: 'e/4', label: { tr: 'mi4', en: 'E4' }, hintMidi: 64 },
      { noteName: 'G4', vexKey: 'g/4', label: { tr: 'sol4', en: 'G4' }, hintMidi: 67 },
      { noteName: 'B4', vexKey: 'b/4', label: { tr: 'si4', en: 'B4' }, hintMidi: 71 },
      { noteName: 'D5', vexKey: 'd/5', label: { tr: 're5', en: 'D5' }, hintMidi: 74 },
      { noteName: 'F5', vexKey: 'f/5', label: { tr: 'fa5', en: 'F5' }, hintMidi: 77 },
    ],
    passThreshold: 5,
  },
  {
    id: 'treble-spaces',
    module: 'A',
    moduleIndex: 2,
    title: { tr: 'Sol Anahtarı — Aralık Notaları', en: 'Treble Clef Spaces' },
    intro: {
      tr: 'Sol anahtarında 4 aralık notu vardır: Fa (F) – La (A) – Do (C) – Mi (E). Hatırlama: "FACE" (yüz).',
      en: 'The 4 space notes in treble clef spell: F – A – C – E. Mnemonic: "FACE".',
    },
    clef: 'treble',
    type: 'press-key',
    steps: [
      { noteName: 'F4', vexKey: 'f/4', label: { tr: 'fa4', en: 'F4' }, hintMidi: 65 },
      { noteName: 'A4', vexKey: 'a/4', label: { tr: 'la4', en: 'A4' }, hintMidi: 69 },
      { noteName: 'C5', vexKey: 'c/5', label: { tr: 'do5', en: 'C5' }, hintMidi: 72 },
      { noteName: 'E5', vexKey: 'e/5', label: { tr: 'mi5', en: 'E5' }, hintMidi: 76 },
    ],
    passThreshold: 4,
  },
  {
    id: 'treble-quiz',
    module: 'A',
    moduleIndex: 3,
    title: { tr: 'Sol Anahtarı — Karışık Quiz', en: 'Treble Clef Mixed Quiz' },
    intro: {
      tr: 'Notayı gör, doğru ismi seç! Çizgi ve aralık notalarını birlikte test ediyoruz.',
      en: 'See the note, pick the right name! We test both line and space notes.',
    },
    clef: 'treble',
    type: 'multi-choice',
    steps: [
      {
        noteName: 'E4', vexKey: 'e/4', label: { tr: 'mi4', en: 'E4' },
        choices: [
          { noteName: 'E4', label: { tr: 'mi (E)', en: 'E (mi)' } },
          { noteName: 'F4', label: { tr: 'fa (F)', en: 'F (fa)' } },
          { noteName: 'G4', label: { tr: 'sol (G)', en: 'G (sol)' } },
          { noteName: 'D4', label: { tr: 're (D)', en: 'D (re)' } },
        ],
      },
      {
        noteName: 'G4', vexKey: 'g/4', label: { tr: 'sol4', en: 'G4' },
        choices: [
          { noteName: 'G4', label: { tr: 'sol (G)', en: 'G (sol)' } },
          { noteName: 'F4', label: { tr: 'fa (F)', en: 'F (fa)' } },
          { noteName: 'A4', label: { tr: 'la (A)', en: 'A (la)' } },
          { noteName: 'E4', label: { tr: 'mi (E)', en: 'E (mi)' } },
        ],
      },
      {
        noteName: 'F4', vexKey: 'f/4', label: { tr: 'fa4', en: 'F4' },
        choices: [
          { noteName: 'F4', label: { tr: 'fa (F)', en: 'F (fa)' } },
          { noteName: 'E4', label: { tr: 'mi (E)', en: 'E (mi)' } },
          { noteName: 'G4', label: { tr: 'sol (G)', en: 'G (sol)' } },
          { noteName: 'A4', label: { tr: 'la (A)', en: 'A (la)' } },
        ],
      },
      {
        noteName: 'B4', vexKey: 'b/4', label: { tr: 'si4', en: 'B4' },
        choices: [
          { noteName: 'B4', label: { tr: 'si (B)', en: 'B (si)' } },
          { noteName: 'A4', label: { tr: 'la (A)', en: 'A (la)' } },
          { noteName: 'C5', label: { tr: 'do (C)', en: 'C (do)' } },
          { noteName: 'D5', label: { tr: 're (D)', en: 'D (re)' } },
        ],
      },
      {
        noteName: 'A4', vexKey: 'a/4', label: { tr: 'la4', en: 'A4' },
        choices: [
          { noteName: 'A4', label: { tr: 'la (A)', en: 'A (la)' } },
          { noteName: 'G4', label: { tr: 'sol (G)', en: 'G (sol)' } },
          { noteName: 'B4', label: { tr: 'si (B)', en: 'B (si)' } },
          { noteName: 'C5', label: { tr: 'do (C)', en: 'C (do)' } },
        ],
      },
      {
        noteName: 'C5', vexKey: 'c/5', label: { tr: 'do5', en: 'C5' },
        choices: [
          { noteName: 'C5', label: { tr: 'do (C)', en: 'C (do)' } },
          { noteName: 'B4', label: { tr: 'si (B)', en: 'B (si)' } },
          { noteName: 'D5', label: { tr: 're (D)', en: 'D (re)' } },
          { noteName: 'E5', label: { tr: 'mi (E)', en: 'E (mi)' } },
        ],
      },
      {
        noteName: 'D5', vexKey: 'd/5', label: { tr: 're5', en: 'D5' },
        choices: [
          { noteName: 'D5', label: { tr: 're (D)', en: 'D (re)' } },
          { noteName: 'C5', label: { tr: 'do (C)', en: 'C (do)' } },
          { noteName: 'E5', label: { tr: 'mi (E)', en: 'E (mi)' } },
          { noteName: 'F5', label: { tr: 'fa (F)', en: 'F (fa)' } },
        ],
      },
      {
        noteName: 'E5', vexKey: 'e/5', label: { tr: 'mi5', en: 'E5' },
        choices: [
          { noteName: 'E5', label: { tr: 'mi (E)', en: 'E (mi)' } },
          { noteName: 'D5', label: { tr: 're (D)', en: 'D (re)' } },
          { noteName: 'F5', label: { tr: 'fa (F)', en: 'F (fa)' } },
          { noteName: 'G5', label: { tr: 'sol (G)', en: 'G (sol)' } },
        ],
      },
      {
        noteName: 'F5', vexKey: 'f/5', label: { tr: 'fa5', en: 'F5' },
        choices: [
          { noteName: 'F5', label: { tr: 'fa (F)', en: 'F (fa)' } },
          { noteName: 'E5', label: { tr: 'mi (E)', en: 'E (mi)' } },
          { noteName: 'G5', label: { tr: 'sol (G)', en: 'G (sol)' } },
          { noteName: 'D5', label: { tr: 're (D)', en: 'D (re)' } },
        ],
      },
      {
        noteName: 'G4', vexKey: 'g/4', label: { tr: 'sol4', en: 'G4' },
        choices: [
          { noteName: 'G4', label: { tr: 'sol (G)', en: 'G (sol)' } },
          { noteName: 'A4', label: { tr: 'la (A)', en: 'A (la)' } },
          { noteName: 'F4', label: { tr: 'fa (F)', en: 'F (fa)' } },
          { noteName: 'B4', label: { tr: 'si (B)', en: 'B (si)' } },
        ],
      },
    ],
    passThreshold: 8,
  },

  // ─── Module B — Bass Clef & Middle C ────────────────────────────────────────
  {
    id: 'bass-lines',
    module: 'B',
    moduleIndex: 0,
    title: { tr: 'Fa Anahtarı — Çizgi Notaları', en: 'Bass Clef Lines' },
    intro: {
      tr: 'Fa anahtarındaki 5 çizgi notu: Sol (G) – Si (B) – Re (D) – Fa (F) – La (A). Hatırlama: "Good Boys Do Fine Always" / "G – B – D – F – A".',
      en: 'The 5 line notes in bass clef: G – B – D – F – A. Mnemonic: "Good Boys Do Fine Always".',
    },
    clef: 'bass',
    type: 'press-key',
    steps: [
      { noteName: 'G2', vexKey: 'g/2', label: { tr: 'sol2', en: 'G2' }, hintMidi: 43 },
      { noteName: 'B2', vexKey: 'b/2', label: { tr: 'si2', en: 'B2' }, hintMidi: 47 },
      { noteName: 'D3', vexKey: 'd/3', label: { tr: 're3', en: 'D3' }, hintMidi: 50 },
      { noteName: 'F3', vexKey: 'f/3', label: { tr: 'fa3', en: 'F3' }, hintMidi: 53 },
      { noteName: 'A3', vexKey: 'a/3', label: { tr: 'la3', en: 'A3' }, hintMidi: 57 },
    ],
    passThreshold: 5,
  },
  {
    id: 'bass-spaces',
    module: 'B',
    moduleIndex: 1,
    title: { tr: 'Fa Anahtarı — Aralık Notaları', en: 'Bass Clef Spaces' },
    intro: {
      tr: 'Fa anahtarındaki 4 aralık notu: La (A) – Do (C) – Mi (E) – Sol (G). Hatırlama: "All Cows Eat Grass".',
      en: 'The 4 space notes in bass clef: A – C – E – G. Mnemonic: "All Cows Eat Grass".',
    },
    clef: 'bass',
    type: 'press-key',
    steps: [
      { noteName: 'A2', vexKey: 'a/2', label: { tr: 'la2', en: 'A2' }, hintMidi: 45 },
      { noteName: 'C3', vexKey: 'c/3', label: { tr: 'do3', en: 'C3' }, hintMidi: 48 },
      { noteName: 'E3', vexKey: 'e/3', label: { tr: 'mi3', en: 'E3' }, hintMidi: 52 },
      { noteName: 'G3', vexKey: 'g/3', label: { tr: 'sol3', en: 'G3' }, hintMidi: 55 },
    ],
    passThreshold: 4,
  },
  {
    id: 'middle-c',
    module: 'B',
    moduleIndex: 2,
    title: { tr: 'Orta Do ve Yardım Çizgisi', en: 'Middle C & Ledger Lines' },
    intro: {
      tr: 'Orta Do (C4, yani do4) iki porte arasındaki yardım çizgisinde yer alır. Hem sol hem de fa anahtarından görülebilir. Piyanonun tam ortasındaki notalardır.',
      en: 'Middle C (C4) sits on a ledger line between the treble and bass staves. It is the center of the piano keyboard.',
    },
    clef: 'treble',
    type: 'press-key',
    steps: [
      { noteName: 'C4', vexKey: 'c/4', label: { tr: 'do4 (Orta Do)', en: 'C4 (Middle C)' }, hintMidi: 60 },
      { noteName: 'D4', vexKey: 'd/4', label: { tr: 're4', en: 'D4' }, hintMidi: 62 },
      { noteName: 'C4', vexKey: 'c/4', label: { tr: 'do4 (Orta Do)', en: 'C4 (Middle C)' }, hintMidi: 60 },
    ],
    passThreshold: 3,
  },

  // ─── Module C — Rhythm ───────────────────────────────────────────────────────
  {
    id: 'note-durations',
    module: 'C',
    moduleIndex: 0,
    title: { tr: 'Nota Süreleri', en: 'Note Durations' },
    intro: {
      tr: 'Her notanın süresi farklıdır: Tam nota (whole) = 4 vuruş, Yarım nota (half) = 2 vuruş, Dörtlük nota (quarter) = 1 vuruş, Sekizlik nota (eighth) = ½ vuruş.',
      en: 'Each note has a duration: Whole = 4 beats, Half = 2 beats, Quarter = 1 beat, Eighth = ½ beat.',
    },
    clef: 'treble',
    type: 'multi-choice',
    steps: [
      {
        noteName: 'C4', vexKey: 'c/4', duration: 'w', correctChoice: 'whole', label: { tr: 'Tam nota', en: 'Whole note' },
        choices: [
          { noteName: 'whole', label: { tr: 'Tam nota (4 vuruş)', en: 'Whole (4 beats)' } },
          { noteName: 'half', label: { tr: 'Yarım nota (2 vuruş)', en: 'Half (2 beats)' } },
          { noteName: 'quarter', label: { tr: 'Dörtlük nota (1 vuruş)', en: 'Quarter (1 beat)' } },
          { noteName: 'eighth', label: { tr: 'Sekizlik nota (½ vuruş)', en: 'Eighth (½ beat)' } },
        ],
      },
      {
        noteName: 'C4', vexKey: 'c/4', duration: 'h', correctChoice: 'half', label: { tr: 'Yarım nota', en: 'Half note' },
        choices: [
          { noteName: 'half', label: { tr: 'Yarım nota (2 vuruş)', en: 'Half (2 beats)' } },
          { noteName: 'whole', label: { tr: 'Tam nota (4 vuruş)', en: 'Whole (4 beats)' } },
          { noteName: 'quarter', label: { tr: 'Dörtlük nota (1 vuruş)', en: 'Quarter (1 beat)' } },
          { noteName: 'eighth', label: { tr: 'Sekizlik nota (½ vuruş)', en: 'Eighth (½ beat)' } },
        ],
      },
      {
        noteName: 'C4', vexKey: 'c/4', duration: 'q', correctChoice: 'quarter', label: { tr: 'Dörtlük nota', en: 'Quarter note' },
        choices: [
          { noteName: 'quarter', label: { tr: 'Dörtlük nota (1 vuruş)', en: 'Quarter (1 beat)' } },
          { noteName: 'whole', label: { tr: 'Tam nota (4 vuruş)', en: 'Whole (4 beats)' } },
          { noteName: 'half', label: { tr: 'Yarım nota (2 vuruş)', en: 'Half (2 beats)' } },
          { noteName: 'eighth', label: { tr: 'Sekizlik nota (½ vuruş)', en: 'Eighth (½ beat)' } },
        ],
      },
      {
        noteName: 'C4', vexKey: 'c/4', duration: '8', correctChoice: 'eighth', label: { tr: 'Sekizlik nota', en: 'Eighth note' },
        choices: [
          { noteName: 'eighth', label: { tr: 'Sekizlik nota (½ vuruş)', en: 'Eighth (½ beat)' } },
          { noteName: 'quarter', label: { tr: 'Dörtlük nota (1 vuruş)', en: 'Quarter (1 beat)' } },
          { noteName: 'half', label: { tr: 'Yarım nota (2 vuruş)', en: 'Half (2 beats)' } },
          { noteName: 'whole', label: { tr: 'Tam nota (4 vuruş)', en: 'Whole (4 beats)' } },
        ],
      },
    ],
    passThreshold: 4,
  },
  {
    id: 'rests',
    module: 'C',
    moduleIndex: 1,
    title: { tr: 'Suslar (Rests)', en: 'Rests' },
    intro: {
      tr: 'Suslar, sessizlik sürelerini gösterir. Her nota süresiyle eşleşen bir sus sembolü vardır.',
      en: 'Rests represent silence. Each note duration has a matching rest symbol.',
    },
    clef: 'treble',
    type: 'multi-choice',
    steps: [
      {
        noteName: 'B4', vexKey: 'b/4', duration: 'wr', isRest: true, correctChoice: 'whole-rest', label: { tr: 'Tam sus', en: 'Whole rest' },
        choices: [
          { noteName: 'whole-rest', label: { tr: 'Tam sus (4 vuruş)', en: 'Whole rest (4 beats)' } },
          { noteName: 'half-rest', label: { tr: 'Yarım sus (2 vuruş)', en: 'Half rest (2 beats)' } },
          { noteName: 'quarter-rest', label: { tr: 'Dörtlük sus (1 vuruş)', en: 'Quarter rest (1 beat)' } },
          { noteName: 'eighth-rest', label: { tr: 'Sekizlik sus (½ vuruş)', en: 'Eighth rest (½ beat)' } },
        ],
      },
      {
        noteName: 'B4', vexKey: 'b/4', duration: 'hr', isRest: true, correctChoice: 'half-rest', label: { tr: 'Yarım sus', en: 'Half rest' },
        choices: [
          { noteName: 'half-rest', label: { tr: 'Yarım sus (2 vuruş)', en: 'Half rest (2 beats)' } },
          { noteName: 'whole-rest', label: { tr: 'Tam sus (4 vuruş)', en: 'Whole rest (4 beats)' } },
          { noteName: 'quarter-rest', label: { tr: 'Dörtlük sus (1 vuruş)', en: 'Quarter rest (1 beat)' } },
          { noteName: 'eighth-rest', label: { tr: 'Sekizlik sus (½ vuruş)', en: 'Eighth rest (½ beat)' } },
        ],
      },
      {
        noteName: 'B4', vexKey: 'b/4', duration: 'qr', isRest: true, correctChoice: 'quarter-rest', label: { tr: 'Dörtlük sus', en: 'Quarter rest' },
        choices: [
          { noteName: 'quarter-rest', label: { tr: 'Dörtlük sus (1 vuruş)', en: 'Quarter rest (1 beat)' } },
          { noteName: 'whole-rest', label: { tr: 'Tam sus (4 vuruş)', en: 'Whole rest (4 beats)' } },
          { noteName: 'half-rest', label: { tr: 'Yarım sus (2 vuruş)', en: 'Half rest (2 beats)' } },
          { noteName: 'eighth-rest', label: { tr: 'Sekizlik sus (½ vuruş)', en: 'Eighth rest (½ beat)' } },
        ],
      },
      {
        noteName: 'B4', vexKey: 'b/4', duration: '8r', isRest: true, correctChoice: 'eighth-rest', label: { tr: 'Sekizlik sus', en: 'Eighth rest' },
        choices: [
          { noteName: 'eighth-rest', label: { tr: 'Sekizlik sus (½ vuruş)', en: 'Eighth rest (½ beat)' } },
          { noteName: 'quarter-rest', label: { tr: 'Dörtlük sus (1 vuruş)', en: 'Quarter rest (1 beat)' } },
          { noteName: 'half-rest', label: { tr: 'Yarım sus (2 vuruş)', en: 'Half rest (2 beats)' } },
          { noteName: 'whole-rest', label: { tr: 'Tam sus (4 vuruş)', en: 'Whole rest (4 beats)' } },
        ],
      },
    ],
    passThreshold: 4,
  },
  {
    id: 'time-signatures',
    module: 'C',
    moduleIndex: 2,
    title: { tr: 'Ölçü İşaretleri (4/4 ve 3/4)', en: 'Time Signatures (4/4 & 3/4)' },
    intro: {
      tr: '4/4: Her ölçüde 4 dörtlük vuruş vardır. 3/4: Her ölçüde 3 dörtlük vuruş (vals ritmi). Piyanoda ritme uygun bas!',
      en: '4/4: 4 quarter-note beats per bar. 3/4: 3 beats per bar (waltz feel). Tap the piano to match the beat!',
    },
    clef: 'treble',
    type: 'rhythm-tap',
    steps: [
      { timeSignature: '4/4', beatsPerBar: 4, bpm: 80 },
      { timeSignature: '3/4', beatsPerBar: 3, bpm: 80 },
    ],
    passThreshold: 2,
  },

  // ─── Module D — Accidentals & Intervals ─────────────────────────────────────
  {
    id: 'accidentals',
    module: 'D',
    moduleIndex: 0,
    title: { tr: 'Diyez ve Bemol', en: 'Sharps & Flats' },
    intro: {
      tr: '# (diyez / sharp): notayı yarım ton yukarı taşır. ♭ (bemol / flat): notayı yarım ton aşağı taşır. Piyanodaki siyah tuşlar diyez veya bemol notalarıdır.',
      en: '# (sharp): raises a note by a half step. ♭ (flat): lowers by a half step. Black keys on the piano are sharps/flats.',
    },
    clef: 'treble',
    type: 'press-key',
    steps: [
      { noteName: 'C4', vexKey: 'c/4', label: { tr: 'do4 (C)', en: 'C4' }, hintMidi: 60 },
      { noteName: 'C#4', vexKey: 'c/4', accidental: '#', label: { tr: 'do#4 (C#)', en: 'C#4' }, hintMidi: 61 },
      { noteName: 'F4', vexKey: 'f/4', label: { tr: 'fa4 (F)', en: 'F4' }, hintMidi: 65 },
      { noteName: 'F#4', vexKey: 'f/4', accidental: '#', label: { tr: 'fa#4 (F#)', en: 'F#4' }, hintMidi: 66 },
      { noteName: 'B4', vexKey: 'b/4', label: { tr: 'si4 (B)', en: 'B4' }, hintMidi: 71 },
      { noteName: 'Bb4', vexKey: 'b/4', accidental: 'b', label: { tr: 'sib4 (Bb)', en: 'Bb4' }, hintMidi: 70 },
    ],
    passThreshold: 6,
  },
  {
    id: 'intervals',
    module: 'D',
    moduleIndex: 1,
    title: { tr: 'Aralıklar (İntervallar)', en: 'Intervals' },
    intro: {
      tr: 'Aralık, iki nota arasındaki mesafedir. İkili (2nd), Üçlü (3rd), Beşli (5th), Oktav (8th). Her iki notayı sırasıyla piyanodan çal!',
      en: 'An interval is the distance between two notes: 2nd, 3rd, 5th, Octave. Play both notes on the piano in order!',
    },
    clef: 'treble',
    type: 'interval',
    steps: [
      {
        notes: [{ noteName: 'C4', vexKey: 'c/4' }, { noteName: 'D4', vexKey: 'd/4' }],
        intervalName: { tr: 'İkili (2nd)', en: 'Major 2nd' },
        label: { tr: 'do4 → re4', en: 'C4 → D4' },
      },
      {
        notes: [{ noteName: 'C4', vexKey: 'c/4' }, { noteName: 'E4', vexKey: 'e/4' }],
        intervalName: { tr: 'Üçlü (3rd)', en: 'Major 3rd' },
        label: { tr: 'do4 → mi4', en: 'C4 → E4' },
      },
      {
        notes: [{ noteName: 'C4', vexKey: 'c/4' }, { noteName: 'G4', vexKey: 'g/4' }],
        intervalName: { tr: 'Beşli (5th)', en: 'Perfect 5th' },
        label: { tr: 'do4 → sol4', en: 'C4 → G4' },
      },
      {
        notes: [{ noteName: 'C4', vexKey: 'c/4' }, { noteName: 'C5', vexKey: 'c/5' }],
        intervalName: { tr: 'Oktav (8th)', en: 'Octave' },
        label: { tr: 'do4 → do5', en: 'C4 → C5' },
      },
      {
        notes: [{ noteName: 'G4', vexKey: 'g/4' }, { noteName: 'D5', vexKey: 'd/5' }],
        intervalName: { tr: 'Beşli (5th)', en: 'Perfect 5th' },
        label: { tr: 'sol4 → re5', en: 'G4 → D5' },
      },
    ],
    passThreshold: 4,
  },
];

export const LESSON_ORDER = curriculum.map((l) => l.id);
export const LESSON_MAP = Object.fromEntries(curriculum.map((l) => [l.id, l]));

export default curriculum;

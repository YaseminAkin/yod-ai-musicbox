const SOLFEGE = {
  C: 'do', D: 're', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si',
};

const SHARP_SOLFEGE = {
  'C#': 'do#', 'D#': 're#', 'F#': 'fa#', 'G#': 'sol#', 'A#': 'la#',
};

const FLAT_SOLFEGE = {
  Db: 'reb', Eb: 'mib', Gb: 'solb', Ab: 'lab', Bb: 'sib',
};

// noteName: 'C4', 'C#4', 'Db4', 'Bb3' etc.
export function noteLabel(noteName, lang) {
  const pitch = noteName.replace(/\d+$/, ''); // strip octave
  const octave = noteName.match(/\d+$/)?.[0] ?? '';
  const sharp = SHARP_SOLFEGE[pitch];
  const flat = FLAT_SOLFEGE[pitch];
  const natural = SOLFEGE[pitch];
  const solfege = sharp ?? flat ?? natural ?? pitch;
  const letter = pitch;

  if (lang === 'tr') return `${solfege}${octave} (${letter}${octave})`;
  return `${letter}${octave} (${solfege}${octave})`;
}

// Short label without octave
export function pitchLabel(noteName, lang) {
  const pitch = noteName.replace(/\d+$/, '');
  const sharp = SHARP_SOLFEGE[pitch];
  const flat = FLAT_SOLFEGE[pitch];
  const natural = SOLFEGE[pitch];
  const solfege = sharp ?? flat ?? natural ?? pitch;
  const letter = pitch;

  if (lang === 'tr') return `${solfege} (${letter})`;
  return `${letter} (${solfege})`;
}

const FEEDBACK = {
  correct: { tr: 'Doğru! 🎵', en: 'Correct! 🎵' },
  wrong: { tr: 'Tekrar dene!', en: 'Try again!' },
  lessonPass: { tr: 'Ders tamamlandı! 🎉', en: 'Lesson complete! 🎉' },
  lessonFail: { tr: 'Biraz daha pratik yap!', en: 'Keep practicing!' },
  hearAgain: { tr: 'Tekrar dinle', en: 'Hear again' },
  next: { tr: 'Devam', en: 'Next' },
  start: { tr: 'Derse Başla', en: 'Start Lesson' },
  back: { tr: 'Geri', en: 'Back' },
  reset: { tr: 'İlerlemeyi sıfırla', en: 'Reset progress' },
  locked: { tr: 'Kilitli', en: 'Locked' },
  tryAgain: { tr: 'Tekrar dene', en: 'Try again' },
  nextLesson: { tr: 'Sonraki Ders', en: 'Next Lesson' },
  score: { tr: 'Skor', en: 'Score' },
  attempts: { tr: 'Deneme', en: 'Attempts' },
  module: { tr: 'Modül', en: 'Module' },
  pressKey: { tr: 'Piyanoda bu notaya bas!', en: 'Press this note on the piano!' },
  identify: { tr: 'Bu nota hangisi?', en: 'Which note is this?' },
  tapBeat: { tr: 'Ritme uygun piyanoya bas!', en: 'Tap the piano to the beat!' },
  playBoth: { tr: 'Her iki notayı sırasıyla çal!', en: 'Play both notes in order!' },
};

export function t(key, lang) {
  return FEEDBACK[key]?.[lang] ?? FEEDBACK[key]?.en ?? key;
}

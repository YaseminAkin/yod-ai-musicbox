import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Tone from 'tone';
import { MidiNumbers } from 'react-piano';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Volume2, Sun, Moon, Menu, X, ArrowRight,
} from 'lucide-react';
import curriculum, { LESSON_ORDER } from '../lessons/curriculum.js';
import { t, noteLabel } from '../lessons/labels.js';
import { useTheme } from '../useTheme.js';
import LessonNotation from './LessonNotation.jsx';
import LessonPiano from './LessonPiano.jsx';

const LANG_KEY = 'musicbox.learn.lang';

const MODULES = {
  A: { tr: 'Porte & Sol Anahtarı', en: 'Staff & Treble Clef' },
  B: { tr: 'Fa Anahtarı & Orta Do', en: 'Bass Clef & Middle C' },
  C: { tr: 'Ritim', en: 'Rhythm' },
  D: { tr: 'Diyez, Bemol & Aralıklar', en: 'Accidentals & Intervals' },
};

const TYPE_LABEL = {
  intro:          { tr: 'Giriş',   en: 'Introduction' },
  'press-key':    { tr: 'Pratik',  en: 'Practice' },
  'multi-choice': { tr: 'Quiz',    en: 'Quiz' },
  'rhythm-tap':   { tr: 'Ritim',   en: 'Rhythm' },
  interval:       { tr: 'Aralık',  en: 'Interval' },
};

const moduleGroups = {};
for (const les of curriculum) {
  if (!moduleGroups[les.module]) moduleGroups[les.module] = [];
  moduleGroups[les.module].push(les);
}

function buildNoteCards(lesson) {
  if (!lesson || !lesson.steps) return [];
  if (lesson.type === 'interval') {
    return lesson.steps.map((s) => ({
      id: s.notes?.[0]?.noteName ?? s.label?.en,
      vexKey: s.notes?.[0]?.vexKey,
      noteName: s.notes?.[0]?.noteName,
      label: s.intervalName ?? s.label,
      secondVexKey: s.notes?.[1]?.vexKey,
      secondNoteName: s.notes?.[1]?.noteName,
      type: 'interval',
    }));
  }
  return lesson.steps
    .filter((s) => s.vexKey)
    .map((s) => ({
      id: s.noteName,
      vexKey: s.vexKey,
      noteName: s.noteName,
      label: s.label,
      accidental: s.accidental,
      hintMidi: s.hintMidi,
      duration: s.duration,
      type: 'single',
    }));
}

export default function LessonsPage() {
  const navigate = useNavigate();
  const { isDark, toggle: toggleTheme } = useTheme();
  const pianoRef = useRef(null);
  const pianoWrapperRef = useRef(null);
  const feedbackTimer = useRef(null);
  const contentRef = useRef(null);
  const metronomeRef = useRef({ loop: null, synth: null });

  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'tr');
  const [toneStarted, setToneStarted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pianoCollapsed, setPianoCollapsed] = useState(false);

  const [selectedId, setSelectedId] = useState(LESSON_ORDER[0]);
  const [hintKeys, setHintKeys] = useState([]);
  const [playingCard, setPlayingCard] = useState(null);

  const [tryIdx, setTryIdx] = useState(0);
  const [tryFeedback, setTryFeedback] = useState(null);
  const [rhythmTaps, setRhythmTaps] = useState(0);
  const [rhythmPhase, setRhythmPhase] = useState('waiting');
  const [metronomeOn, setMetronomeOn] = useState(false);

  const [pianoWidth, setPianoWidth] = useState(700);

  const lesson = curriculum.find((l) => l.id === selectedId);
  const noteCards = lesson ? buildNoteCards(lesson) : [];
  const tryStep = lesson?.steps?.[tryIdx] ?? null;

  useEffect(() => { localStorage.setItem(LANG_KEY, lang); }, [lang]);

  useEffect(() => {
    const update = () => {
      if (pianoWrapperRef.current)
        setPianoWidth(pianoWrapperRef.current.offsetWidth - 8);
    };
    update();
    const ro = new ResizeObserver(update);
    if (pianoWrapperRef.current) ro.observe(pianoWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const ensureTone = useCallback(async () => {
    if (!toneStarted) {
      await Tone.start();
      setToneStarted(true);
    }
  }, [toneStarted]);

  const stopMetronome = useCallback(() => {
    try {
      if (metronomeRef.current.loop) { metronomeRef.current.loop.stop(0); metronomeRef.current.loop.dispose(); }
      if (metronomeRef.current.synth) metronomeRef.current.synth.dispose();
    } catch (_) {}
    metronomeRef.current = { loop: null, synth: null };
    Tone.Transport.stop();
    setMetronomeOn(false);
  }, []);

  const startMetronome = useCallback((bpm, beatsPerBar) => {
    stopMetronome();
    Tone.Transport.bpm.value = bpm ?? 80;
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.04 },
      volume: -4,
    }).toDestination();
    let beat = 0;
    const loop = new Tone.Loop((time) => {
      synth.triggerAttackRelease(beat % (beatsPerBar ?? 4) === 0 ? 1000 : 500, '32n', time);
      beat++;
    }, '4n');
    loop.start(0);
    metronomeRef.current = { loop, synth };
    Tone.Transport.start();
    setMetronomeOn(true);
  }, [stopMetronome]);

  useEffect(() => {
    if (lesson?.type !== 'rhythm-tap') stopMetronome();
  }, [selectedId]);

  useEffect(() => {
    if (lesson?.type === 'rhythm-tap' && metronomeOn && tryStep) {
      startMetronome(tryStep.bpm ?? 80, tryStep.beatsPerBar ?? 4);
    }
  }, [tryIdx]);

  useEffect(() => () => stopMetronome(), []);

  useEffect(() => {
    setTryIdx(0);
    setTryFeedback(null);
    setRhythmTaps(0);
    setRhythmPhase('waiting');
    setHintKeys([]);
    setPlayingCard(null);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [selectedId]);

  const NOTE_DUR_MAP = {
    w: ['1n', 3200], h: ['2n', 1600], q: ['4n', 900], '8': ['8n', 500],
    wr: ['1n', 3200], hr: ['2n', 1600], qr: ['4n', 900], '8r': ['8n', 500],
  };

  const playNote = useCallback((noteName, durationMs = 1800, toneDuration = '2n') => {
    if (!pianoRef.current) return;
    pianoRef.current.playNote(noteName, toneDuration);
    const midi = MidiNumbers.fromNote(noteName);
    setHintKeys([midi]);
    setPlayingCard(noteName);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setHintKeys([]);
      setPlayingCard(null);
    }, durationMs);
  }, []);

  const isPlayableNote = (name) => /[0-9]/.test(name ?? '');

  const handleCardClick = async (card) => {
    await ensureTone();
    if (card.type === 'interval' && card.secondNoteName) {
      playNote(card.noteName, 3000, '4n');
      setTimeout(() => {
        if (pianoRef.current) pianoRef.current.playNote(card.secondNoteName, '4n');
      }, 900);
    } else {
      const noteToPlay = isPlayableNote(card.noteName) ? card.noteName : 'C4';
      const [toneDur, msDur] = NOTE_DUR_MAP[card.duration] ?? ['2n', 1800];
      playNote(noteToPlay, msDur, toneDur);
    }
  };

  const handlePianoNote = useCallback((noteName) => {
    const playedMidi = MidiNumbers.fromNote(noteName);
    setHintKeys((prev) => prev.filter((m) => m !== playedMidi));
    if (playingCard) {
      const playingMidi = MidiNumbers.fromNote(playingCard);
      if (playingMidi === playedMidi) setPlayingCard(null);
    }

    if (!lesson || !tryStep) return;

    if (lesson.type === 'rhythm-tap') {
      setRhythmTaps((p) => { setRhythmPhase('tapping'); return p + 1; });
      return;
    }

    const expectedNote = lesson.type === 'interval'
      ? tryStep.notes?.[0]?.noteName
      : tryStep.noteName;
    if (!expectedNote || !isPlayableNote(expectedNote)) return;

    const expectedMidi = tryStep.hintMidi ?? MidiNumbers.fromNote(expectedNote);
    clearTimeout(feedbackTimer.current);
    if (playedMidi === expectedMidi) {
      setTryFeedback('correct');
      feedbackTimer.current = setTimeout(() => {
        setTryFeedback(null);
        advanceTry();
      }, 1200);
    } else {
      setTryFeedback('wrong');
      feedbackTimer.current = setTimeout(() => setTryFeedback(null), 1200);
    }
  }, [lesson, tryStep, playingCard]);

  const advanceTry = useCallback(() => {
    if (!lesson?.steps?.length) return;
    setTryIdx((i) => (i + 1) % lesson.steps.length);
  }, [lesson]);

  const handleCheckRhythm = () => {
    if (!tryStep) return;
    if (rhythmTaps === tryStep.beatsPerBar) {
      setTryFeedback('correct');
      setTimeout(() => { setTryFeedback(null); setRhythmTaps(0); setRhythmPhase('waiting'); advanceTry(); }, 1200);
    } else {
      setTryFeedback('wrong');
      setTimeout(() => { setTryFeedback(null); setRhythmTaps(0); setRhythmPhase('waiting'); }, 1400);
    }
  };

  const handleSelectTopic = (id) => {
    setSelectedId(id);
    setSidebarOpen(false);
  };

  const handleTopicNav = (dir) => {
    const idx = LESSON_ORDER.indexOf(selectedId);
    const next = idx + dir;
    if (next >= 0 && next < LESSON_ORDER.length) setSelectedId(LESSON_ORDER[next]);
  };

  return (
    <div className="docs-root" onPointerDownCapture={ensureTone}>
      {/* Nav */}
      <nav className="mb-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="theme-toggle"
            style={{ display: 'none' }}
            id="docs-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
          <Link to="/" className="mb-nav-logo">MUSIC<span>BOX</span></Link>
        </div>
        <div className="mb-nav-links">
          <Link to="/" className="mb-nav-link">
            <ChevronLeft size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
            {lang === 'tr' ? 'Ana Sayfa' : 'Home'}
          </Link>
          <Link to="/musicbox" className="mb-nav-link">Musicbox</Link>
          <div style={{ width: '1px', height: '18px', background: 'var(--line-strong)', margin: '0 0.25rem' }} />
          <div className="lrn-lang-toggle">
            {['tr', 'en'].map((l) => (
              <button key={l} className={`lrn-lang-btn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </nav>

      {/* Body */}
      <div className="docs-body">
        {/* Sidebar */}
        <aside className={`docs-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="docs-sidebar-header">
            <span className="docs-sidebar-title">
              🎹 {lang === 'tr' ? 'Konu Başlıkları' : 'Topics'}
            </span>
          </div>
          {Object.entries(moduleGroups).map(([mod, lessons]) => (
            <div className="docs-nav-group" key={mod}>
              <span className="docs-nav-group-label">
                {lang === 'tr' ? `Modül ${mod}` : `Module ${mod}`} — {MODULES[mod][lang]}
              </span>
              {lessons.map((les) => (
                <button
                  key={les.id}
                  className={`docs-nav-item${selectedId === les.id ? ' active' : ''}`}
                  onClick={() => handleSelectTopic(les.id)}
                >
                  {les.title[lang]}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Main */}
        <div className="docs-main">
          <div className="docs-content" ref={contentRef}>
            {lesson && (
              <>
                <div className="docs-topic-meta">
                  <span className="docs-topic-module-badge">
                    {lang === 'tr' ? `Modül ${lesson.module}` : `Module ${lesson.module}`}
                  </span>
                  <span className="docs-topic-type-badge">
                    {TYPE_LABEL[lesson.type]?.[lang] ?? lesson.type}
                  </span>
                </div>

                <h1 className="docs-topic-title">{lesson.title[lang]}</h1>

                {lesson.intro[lang].split('\n\n').map((para, i) => (
                  <p key={i} className="docs-topic-intro">
                    {para.split('\n').map((line, j, arr) => {
                      const trimmed = line.trim();
                      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('♯') || trimmed.startsWith('♭') || trimmed.startsWith('♮');
                      const isNumbered = /^\d+[.:]/.test(trimmed);
                      const cls = isBullet ? 'intro-bullet' : isNumbered ? 'intro-numbered' : '';

                      const formatLine = (text) => {
                        if (isNumbered) {
                          const ci = text.indexOf(':');
                          if (ci !== -1) return <>{text.slice(0, ci + 1)}&nbsp;<strong className="intro-value">{text.slice(ci + 1).trim()}</strong></>;
                        }
                        if (isBullet) {
                          const ci = text.indexOf(':');
                          if (ci !== -1) return <><strong className="intro-term">{text.slice(0, ci)}</strong>{text.slice(ci)}</>;
                        }
                        if (text.includes('"')) {
                          const parts = text.split(/("(?:[^"]+)")/g);
                          if (parts.length > 1) return <>{parts.map((p, k) => /^"/.test(p) ? <em key={k} className="intro-quote">{p}</em> : p)}</>;
                        }
                        return text;
                      };

                      return (
                        <span key={j} className={cls || undefined}>
                          {formatLine(line)}{j < arr.length - 1 && <br />}
                        </span>
                      );
                    })}
                  </p>
                ))}

                {/* Intro-staff anatomy */}
                {lesson.id === 'intro-staff' && (
                  <>
                    <p className="docs-section-heading">
                      {lang === 'tr' ? 'Sol Anahtarı — Çizgi Notaları (EGBDF)' : 'Treble Clef — Line Notes (EGBDF)'}
                    </p>
                    <div className="docs-staff-overview">
                      {[
                        { vexKey: 'e/4', label: { tr: 'Mi · E4\n1. çizgi', en: 'E4 · mi\nLine 1' } },
                        { vexKey: 'g/4', label: { tr: 'Sol · G4\n2. çizgi', en: 'G4 · sol\nLine 2' } },
                        { vexKey: 'b/4', label: { tr: 'Si · B4\n3. çizgi', en: 'B4 · si\nLine 3' } },
                        { vexKey: 'd/5', label: { tr: 'Re · D5\n4. çizgi', en: 'D5 · re\nLine 4' } },
                        { vexKey: 'f/5', label: { tr: 'Fa · F5\n5. çizgi', en: 'F5 · fa\nLine 5' } },
                      ].map((n, i) => (
                        <div key={i} className="docs-overview-cell">
                          <div className="docs-note-notation">
                            <LessonNotation clef="treble" notes={[{ keys: [n.vexKey], duration: 'q', highlight: true }]} width={110} height={120} />
                          </div>
                          <span className="docs-overview-label">{n.label[lang]}</span>
                        </div>
                      ))}
                    </div>

                    <p className="docs-section-heading" style={{ marginTop: '1.25rem' }}>
                      {lang === 'tr' ? 'Sol Anahtarı — Boşluk Notaları (FACE)' : 'Treble Clef — Space Notes (FACE)'}
                    </p>
                    <div className="docs-staff-overview">
                      {[
                        { vexKey: 'f/4', label: { tr: 'Fa · F4\n1. boşluk', en: 'F4 · fa\nSpace 1' } },
                        { vexKey: 'a/4', label: { tr: 'La · A4\n2. boşluk', en: 'A4 · la\nSpace 2' } },
                        { vexKey: 'c/5', label: { tr: 'Do · C5\n3. boşluk', en: 'C5 · do\nSpace 3' } },
                        { vexKey: 'e/5', label: { tr: 'Mi · E5\n4. boşluk', en: 'E5 · mi\nSpace 4' } },
                      ].map((n, i) => (
                        <div key={i} className="docs-overview-cell">
                          <div className="docs-note-notation">
                            <LessonNotation clef="treble" notes={[{ keys: [n.vexKey], duration: 'q', highlight: true }]} width={110} height={120} />
                          </div>
                          <span className="docs-overview-label">{n.label[lang]}</span>
                        </div>
                      ))}
                    </div>

                    <p className="docs-section-heading" style={{ marginTop: '1.25rem' }}>
                      {lang === 'tr' ? 'Orta Do (C4) — Yardım Çizgisi' : 'Middle C (C4) — Ledger Line'}
                    </p>
                    <div className="docs-staff-overview">
                      {[
                        { vexKey: 'c/4', label: { tr: 'Do · C4\nOrta Do', en: 'C4 · do\nMiddle C' } },
                        { vexKey: 'b/3', label: { tr: 'Si · B3\n(sol altı)', en: 'B3 · si\n(below staff)' } },
                        { vexKey: 'd/4', label: { tr: 'Re · D4\n(1. boşluk)', en: 'D4 · re\n(space 1)' } },
                      ].map((n, i) => (
                        <div key={i} className="docs-overview-cell">
                          <div className="docs-note-notation">
                            <LessonNotation clef="treble" notes={[{ keys: [n.vexKey], duration: 'q', highlight: i === 0 }]} width={110} height={120} />
                          </div>
                          <span className="docs-overview-label">{n.label[lang]}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Press-key: all notes overview */}
                {lesson.type === 'press-key' && lesson.steps.length > 0 && lesson.steps.length <= 6 && (
                  <>
                    <p className="docs-section-heading">
                      {lang === 'tr' ? 'Portedeki konumlar' : 'Positions on the staff'}
                    </p>
                    <div className="docs-note-notation" style={{ display: 'inline-block', marginBottom: '2rem', borderRadius: 'var(--r-md)', overflow: 'visible' }}>
                      <LessonNotation
                        clef={lesson.clef ?? 'treble'}
                        notes={lesson.steps.map((s) => ({ keys: [s.vexKey], duration: 'q', accidental: s.accidental, highlight: true }))}
                        width={Math.min(lesson.steps.length * 70 + 100, 560)}
                        height={155}
                      />
                    </div>
                  </>
                )}

                {/* Note cards */}
                {noteCards.length > 0 && (
                  <>
                    <p className="docs-section-heading">
                      {lang === 'tr' ? 'Notalar — tıklayarak dinle' : 'Notes — click to hear'}
                    </p>
                    <div className="docs-notes-row">
                      {noteCards.map((card) => (
                        <button
                          key={card.id}
                          className={`docs-note-card${playingCard === card.noteName ? ' playing' : ''}`}
                          onClick={() => handleCardClick(card)}
                          title={card.noteName}
                        >
                          {card.vexKey && (
                            <div className="docs-note-notation">
                              <LessonNotation
                                clef={lesson.clef ?? 'treble'}
                                notes={
                                  card.type === 'interval' && card.secondVexKey
                                    ? [
                                        { keys: [card.vexKey], duration: 'q' },
                                        { keys: [card.secondVexKey], duration: 'q' },
                                      ]
                                    : [{ keys: [card.vexKey], duration: card.duration ?? 'q', accidental: card.accidental, highlight: true }]
                                }
                                width={170}
                                height={145}
                              />
                            </div>
                          )}
                          <span className="docs-note-name">
                            {card.type === 'interval'
                              ? card.label?.[lang] ?? card.id
                              : card.label?.[lang] ?? card.noteName}
                          </span>
                          <span className="docs-note-sub">
                            <Volume2 size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Multi-choice reference */}
                {lesson.type === 'multi-choice' && lesson.steps.length > 0 && (
                  <>
                    <p className="docs-section-heading">
                      {lang === 'tr' ? 'Tüm notalar ve isimleri' : 'All notes and their names'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                      {lesson.steps.map((step, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '1rem',
                          padding: '0.75rem 1rem',
                          background: 'var(--surface)', border: '1px solid var(--line)',
                          borderRadius: 'var(--r-md)',
                        }}>
                          {step.vexKey && (
                            <div className="docs-note-notation">
                              <LessonNotation
                                clef={lesson.clef ?? 'treble'}
                                notes={[{ keys: [step.vexKey], duration: step.duration ?? 'q', accidental: step.accidental, highlight: true }]}
                                width={160} height={135}
                              />
                            </div>
                          )}
                          <div>
                            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.06em', color: 'var(--accent-bright)' }}>
                              {step.label?.[lang] ?? step.noteName}
                            </p>
                            {step.choices && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-low)', marginTop: '0.2rem' }}>
                                {lang === 'tr' ? 'Seçenekler: ' : 'Options: '}
                                {step.choices.map((c) => c.label?.[lang]).join(' · ')}
                              </p>
                            )}
                          </div>
                          <button
                            style={{ marginLeft: 'auto' }}
                            className="lrn-hear-btn"
                            onClick={async () => {
                              await ensureTone();
                              const [td, ms] = NOTE_DUR_MAP[step.duration] ?? ['4n', 900];
                              playNote(isPlayableNote(step.noteName) ? step.noteName : 'C4', ms, td);
                            }}
                          >
                            <Volume2 size={12} /> {t('hearAgain', lang)}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Rhythm: time signature examples */}
                {lesson.type === 'rhythm-tap' && lesson.steps.length > 0 && (
                  <>
                    <p className="docs-section-heading">
                      {lang === 'tr' ? 'Ölçü örnekleri' : 'Time signature examples'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                      {lesson.steps.map((step, i) => (
                        <div key={i} style={{
                          padding: '1rem 1.25rem', background: 'var(--surface)',
                          border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
                          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
                        }}>
                          <div>
                            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                              {step.timeSignature}
                            </p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-mid)' }}>
                              {lang === 'tr'
                                ? `Her ölçüde ${step.beatsPerBar} dörtlük vuruş`
                                : `${step.beatsPerBar} quarter-note beats per bar`}
                            </p>
                          </div>
                          <div className="docs-note-notation">
                            <LessonNotation
                              clef={lesson.clef ?? 'treble'}
                              notes={Array.from({ length: step.beatsPerBar }, () => ({ keys: ['c/5'], duration: 'q' }))}
                              timeSignature={step.timeSignature}
                              width={step.beatsPerBar * 40 + 80}
                              height={110}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Try it */}
                {(lesson.type === 'press-key' || lesson.type === 'interval' || lesson.type === 'rhythm-tap') &&
                  lesson.steps.length > 0 && tryStep && (
                  <div className="docs-try-section">
                    <div>
                      <p className="docs-try-title">
                        🎹 {lang === 'tr' ? 'Dene' : 'Try it'}
                      </p>
                      <p className="docs-try-desc">
                        {lesson.type === 'rhythm-tap'
                          ? (lang === 'tr' ? 'Piyanoya basarak ritmi taklit et, sonra kontrol et.' : 'Tap the piano to match the rhythm, then check.')
                          : lesson.type === 'interval'
                          ? (lang === 'tr' ? 'Her iki notayı sırasıyla piyanoda bul.' : 'Find and play both notes on the piano in order.')
                          : (lang === 'tr' ? 'Piyanoda bu notayı bul ve bas.' : 'Find and press this note on the piano.')}
                      </p>
                    </div>

                    {lesson.type !== 'rhythm-tap' && (
                      <div className="docs-try-notation">
                        <LessonNotation
                          clef={lesson.clef ?? 'treble'}
                          notes={
                            lesson.type === 'interval' && tryStep.notes
                              ? tryStep.notes.map((n) => ({ keys: [n.vexKey], duration: 'q' }))
                              : [{ keys: [tryStep.vexKey], duration: tryStep.duration ?? 'q', accidental: tryStep.accidental, highlight: true }]
                          }
                          width={Math.min(360, pianoWidth - 40)}
                          height={160}
                        />
                      </div>
                    )}

                    {lesson.type === 'press-key' && tryStep.noteName && (
                      <p className="docs-try-note-label">{tryStep.label?.[lang] ?? tryStep.noteName}</p>
                    )}
                    {lesson.type === 'interval' && tryStep.intervalName && (
                      <p className="docs-try-note-label" style={{ fontSize: '1.8rem' }}>{tryStep.intervalName?.[lang]}</p>
                    )}

                    {lesson.type === 'rhythm-tap' && tryStep.beatsPerBar && (
                      <div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-low)', textAlign: 'center', marginBottom: '0.5rem' }}>
                          {tryStep.timeSignature} — {lang === 'tr' ? `${tryStep.beatsPerBar} vuruş` : `${tryStep.beatsPerBar} beats`}
                        </p>
                        <div className="docs-beat-row">
                          {Array(tryStep.beatsPerBar).fill(null).map((_, i) => (
                            <div key={i} className={`docs-beat-dot${i < rhythmTaps ? ' filled' : ''}`}>{i + 1}</div>
                          ))}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-low)', textAlign: 'center', marginTop: '0.4rem' }}>
                          {rhythmPhase === 'waiting'
                            ? (lang === 'tr' ? 'Piyanoya bas' : 'Press any piano key')
                            : `${rhythmTaps} / ${tryStep.beatsPerBar}`}
                        </p>
                      </div>
                    )}

                    {(lesson.type === 'press-key' || lesson.type === 'interval') && tryStep.noteName && (
                      <div>
                        <button className="lrn-hear-btn" onClick={async () => {
                          await ensureTone();
                          if (lesson.type === 'interval' && tryStep.notes) {
                            playNote(tryStep.notes[0].noteName, 3000, '4n');
                            setTimeout(() => pianoRef.current?.playNote(tryStep.notes[1].noteName, '4n'), 900);
                          } else {
                            const [td, ms] = NOTE_DUR_MAP[tryStep.duration] ?? ['4n', 900];
                            playNote(isPlayableNote(tryStep.noteName) ? tryStep.noteName : 'C4', ms, td);
                          }
                        }}>
                          <Volume2 size={13} /> {t('hearAgain', lang)}
                        </button>
                      </div>
                    )}

                    {tryFeedback && (
                      <div className={`docs-try-feedback ${tryFeedback}`}>
                        {tryFeedback === 'correct' ? t('correct', lang) : t('wrong', lang)}
                      </div>
                    )}

                    <div className="docs-try-actions">
                      {lesson.type === 'rhythm-tap' && (
                        <button
                          className={metronomeOn ? 'btn-primary' : 'btn-ghost'}
                          style={{ padding: '0.5rem 1.2rem', fontSize: '0.82rem' }}
                          onClick={() => metronomeOn
                            ? stopMetronome()
                            : startMetronome(tryStep?.bpm ?? 80, tryStep?.beatsPerBar ?? 4)}
                        >
                          🥁 {metronomeOn
                            ? (lang === 'tr' ? 'Metronomu Durdur' : 'Stop Metronome')
                            : (lang === 'tr' ? 'Metronom Başlat' : 'Start Metronome')}
                        </button>
                      )}
                      {lesson.type === 'rhythm-tap' && rhythmPhase === 'tapping' && (
                        <button className="btn-primary" onClick={handleCheckRhythm}
                          style={{ padding: '0.5rem 1.4rem', fontSize: '0.85rem' }}>
                          {lang === 'tr' ? 'Kontrol Et' : 'Check'}
                        </button>
                      )}
                      <button
                        onClick={() => { setTryFeedback(null); advanceTry(); setRhythmTaps(0); setRhythmPhase('waiting'); }}
                        className="btn-ghost"
                        style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem' }}
                      >
                        {lang === 'tr' ? 'Sonraki' : 'Next'} <ArrowRight size={13} />
                      </button>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-low)', alignSelf: 'center' }}>
                        {tryIdx + 1} / {lesson.steps.length}
                      </span>
                    </div>
                  </div>
                )}

                {/* Topic nav */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
                  <button
                    onClick={() => handleTopicNav(-1)}
                    disabled={LESSON_ORDER.indexOf(selectedId) === 0}
                    className="btn-ghost"
                    style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem', opacity: LESSON_ORDER.indexOf(selectedId) === 0 ? 0.3 : 1 }}
                  >
                    <ChevronLeft size={14} /> {lang === 'tr' ? 'Önceki' : 'Prev'}
                  </button>
                  <button
                    onClick={() => handleTopicNav(1)}
                    disabled={LESSON_ORDER.indexOf(selectedId) === LESSON_ORDER.length - 1}
                    className="btn-ghost"
                    style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem', opacity: LESSON_ORDER.indexOf(selectedId) === LESSON_ORDER.length - 1 ? 0.3 : 1 }}
                  >
                    {lang === 'tr' ? 'Sonraki' : 'Next'} <ChevronRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Piano dock */}
          <div className="docs-piano-area">
            <div className="docs-piano-notch-bar">
              <button
                className="docs-piano-notch"
                onClick={() => setPianoCollapsed((p) => !p)}
                title={pianoCollapsed
                  ? (lang === 'tr' ? 'Pianoyu göster' : 'Show piano')
                  : (lang === 'tr' ? 'Pianoyu gizle' : 'Hide piano')}
              >
                {pianoCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <div className={`docs-piano-dock${pianoCollapsed ? ' collapsed' : ''}`} ref={pianoWrapperRef}>
              <LessonPiano
                ref={pianoRef}
                firstNote="C2"
                lastNote="C7"
                onNotePlayed={handlePianoNote}
                highlightedKeys={hintKeys}
                width={pianoWidth}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

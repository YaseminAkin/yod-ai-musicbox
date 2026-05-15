import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, ChevronUp, ChevronDown, Menu, X } from 'lucide-react';
import * as Tone from 'tone';
import { Piano, MidiNumbers } from 'react-piano';
import { Chord, Key, Scale, Note } from 'tonal';
import 'react-piano/dist/styles.css';

// ── Static data ──────────────────────────────────────────────────────────────
const ROOT_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ROOT_DISPLAY = {
  C:'C','C#':'C♯',D:'D','D#':'D♯',E:'E',
  F:'F','F#':'F♯',G:'G','G#':'G♯',A:'A','A#':'A♯',B:'B',
};
const FLAT_DISPLAY = {
  'C#':'D♭','D#':'E♭','F#':'G♭','G#':'A♭','A#':'B♭',
};

const CHORD_GROUPS = [
  { label: 'Triads',
    types: [
      { id:'major',    label:'Major',          symbol:'',       intervals:[0,4,7] },
      { id:'minor',    label:'Minor',           symbol:'m',      intervals:[0,3,7] },
      { id:'dim',      label:'Diminished',      symbol:'°',      intervals:[0,3,6] },
      { id:'aug',      label:'Augmented',       symbol:'+',      intervals:[0,4,8] },
    ],
  },
  { label: '7ths',
    types: [
      { id:'maj7',     label:'Major 7',         symbol:'maj7',   intervals:[0,4,7,11] },
      { id:'min7',     label:'Minor 7',         symbol:'m7',     intervals:[0,3,7,10] },
      { id:'dom7',     label:'Dominant 7',      symbol:'7',      intervals:[0,4,7,10] },
      { id:'dim7',     label:'Diminished 7',    symbol:'°7',     intervals:[0,3,6,9] },
      { id:'hdim7',    label:'Half-Dim 7',      symbol:'ø7',     intervals:[0,3,6,10] },
      { id:'minmaj7',  label:'Minor/Maj 7',     symbol:'mM7',    intervals:[0,3,7,11] },
    ],
  },
  { label: '9ths & Extended',
    types: [
      { id:'maj9',     label:'Major 9',         symbol:'maj9',   intervals:[0,4,7,11,14] },
      { id:'min9',     label:'Minor 9',         symbol:'m9',     intervals:[0,3,7,10,14] },
      { id:'dom9',     label:'Dominant 9',      symbol:'9',      intervals:[0,4,7,10,14] },
      { id:'dom11',    label:'Dominant 11',     symbol:'11',     intervals:[0,4,7,10,14,17] },
      { id:'dom13',    label:'Dominant 13',     symbol:'13',     intervals:[0,4,7,10,14,21] },
      { id:'maj13',    label:'Major 13',        symbol:'maj13',  intervals:[0,4,7,11,14,21] },
    ],
  },
  { label: 'Suspended',
    types: [
      { id:'sus2',     label:'Sus 2',           symbol:'sus2',   intervals:[0,2,7] },
      { id:'sus4',     label:'Sus 4',           symbol:'sus4',   intervals:[0,5,7] },
      { id:'7sus4',    label:'7sus4',           symbol:'7sus4',  intervals:[0,5,7,10] },
    ],
  },
  { label: 'Add & 6th',
    types: [
      { id:'add9',     label:'Add 9',           symbol:'add9',   intervals:[0,4,7,14] },
      { id:'6',        label:'Major 6',         symbol:'6',      intervals:[0,4,7,9] },
      { id:'min6',     label:'Minor 6',         symbol:'m6',     intervals:[0,3,7,9] },
      { id:'69',       label:'6/9',             symbol:'6/9',    intervals:[0,4,7,9,14] },
    ],
  },
];

const SCALE_TYPES = [
  { value:'major',         label:'Major',          tonalName:'major'          },
  { value:'natural_minor', label:'Natural Minor',  tonalName:'minor'          },
  { value:'harmonic_minor',label:'Harmonic Minor', tonalName:'harmonic minor' },
  { value:'melodic_minor', label:'Melodic Minor',  tonalName:'melodic minor'  },
  { value:'dorian',        label:'Dorian',         tonalName:'dorian'         },
  { value:'phrygian',      label:'Phrygian',       tonalName:'phrygian'       },
  { value:'lydian',        label:'Lydian',         tonalName:'lydian'         },
  { value:'mixolydian',    label:'Mixolydian',     tonalName:'mixolydian'     },
  { value:'locrian',       label:'Locrian',        tonalName:'locrian'        },
];

const SCALE_DESCRIPTIONS = {
  major:          'Bright and happy. The most common scale in Western music.',
  natural_minor:  'Dark and melancholic. Foundation of minor key music.',
  harmonic_minor: 'Exotic tension. Raised 7th creates a leading tone.',
  melodic_minor:  'Smooth and jazzy. Raised 6th & 7th ascending.',
  dorian:         'Minor with a raised 6th. Used in jazz and rock.',
  phrygian:       'Spanish/flamenco flavour. Flat 2nd gives tension.',
  lydian:         'Dreamy and ethereal. Raised 4th lifts the sound.',
  mixolydian:     'Dominant flavour. Major scale with a flat 7th.',
  locrian:        'Unstable and dark. Built on the 7th degree.',
};

const DEGREE_LABELS        = ['I','II','III','IV','V','VI','VII'];
const DEGREE_ROMAN_MINOR   = ['i','ii°','III','iv','v','VI','VII'];
const SEMITONE_NAMES       = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BASE_MIDI            = { C:60,'C#':61,D:62,'D#':63,E:64,F:65,'F#':66,G:67,'G#':68,A:69,'A#':70,B:71 };

const SALAMANDER_URLS = {
  A0:'A0.mp3',  C1:'C1.mp3', 'D#1':'Ds1.mp3','F#1':'Fs1.mp3',
  A1:'A1.mp3',  C2:'C2.mp3', 'D#2':'Ds2.mp3','F#2':'Fs2.mp3',
  A2:'A2.mp3',  C3:'C3.mp3', 'D#3':'Ds3.mp3','F#3':'Fs3.mp3',
  A3:'A3.mp3',  C4:'C4.mp3', 'D#4':'Ds4.mp3','F#4':'Fs4.mp3',
  A4:'A4.mp3',  C5:'C5.mp3', 'D#5':'Ds5.mp3','F#5':'Fs5.mp3',
  A5:'A5.mp3',  C6:'C6.mp3',
};

const PIANO_FIRST = MidiNumbers.fromNote('A2');
const PIANO_LAST  = MidiNumbers.fromNote('C6');

// ── Helpers ───────────────────────────────────────────────────────────────────
function semitoneToMidi(root, semitoneOffset) {
  return BASE_MIDI[root] + semitoneOffset;
}

function midiToNoteStr(midi) {
  const name = SEMITONE_NAMES[midi % 12];
  const oct  = Math.floor(midi / 12) - 1;
  return `${name}${oct}`;
}

function getChordMidis(root, intervals) {
  return intervals.map(i => semitoneToMidi(root, i));
}

function getChordNoteNames(root, intervals) {
  const base = BASE_MIDI[root] % 12;
  return intervals.map(i => SEMITONE_NAMES[(base + i) % 12]);
}

function getDiatonicChords(root, scaleType) {
  if (scaleType === 'major')          return Key.majorKey(root).chords;
  if (scaleType === 'natural_minor')  return Key.minorKey(root).natural.chords;
  if (scaleType === 'harmonic_minor') return Key.minorKey(root).harmonic.chords;
  if (scaleType === 'melodic_minor')  return Key.minorKey(root).melodic.chords;
  const tonalName = SCALE_TYPES.find(s => s.value === scaleType)?.tonalName || scaleType;
  const scaleNotes = Scale.get(`${root} ${tonalName}`).notes;
  if (!scaleNotes || scaleNotes.length < 7) return [];
  return scaleNotes.map((_, i) => {
    const triad = [scaleNotes[i], scaleNotes[(i+2)%7], scaleNotes[(i+4)%7]];
    const detected = Chord.detect(triad);
    return detected[0] || `${scaleNotes[i]}`;
  });
}

function getScaleNotes(root, scaleType) {
  const tonalName = SCALE_TYPES.find(s => s.value === scaleType)?.tonalName || scaleType;
  return Scale.get(`${root} ${tonalName}`).notes;
}

function getScaleNoteMidis(root, scaleType) {
  const notes = getScaleNotes(root, scaleType);
  const rootMidi = BASE_MIDI[root];
  return notes.map(note => {
    const noteMidi = BASE_MIDI[note] ?? BASE_MIDI[SEMITONE_NAMES.indexOf(note)];
    if (noteMidi === undefined) return rootMidi;
    return noteMidi >= rootMidi ? noteMidi : noteMidi + 12;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChordLibrary() {
  const [tab, setTab] = useState('chord'); // 'chord' | 'scale'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pianoCollapsed, setPianoCollapsed] = useState(false);

  // Chord tab
  const [selectedGroup, setSelectedGroup] = useState(CHORD_GROUPS[0]);
  const [selectedType,  setSelectedType]  = useState(CHORD_GROUPS[0].types[0]);
  const [selectedRoot,  setSelectedRoot]  = useState(null);

  // Scale tab
  const [scaleRoot,        setScaleRoot]        = useState('A');
  const [scaleType,        setScaleType]        = useState('natural_minor');
  const [scaleChordIndex,  setScaleChordIndex]  = useState(null);

  // Shared piano state
  const [activeNotes, setActiveNotes] = useState([]);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [pianoWidth,  setPianoWidth]  = useState(900);

  const samplerRef    = useRef(null);
  const releaseTimer  = useRef(null);
  const pianoWrapperRef = useRef(null);

  // Measure piano dock width
  useEffect(() => {
    const update = () => {
      if (pianoWrapperRef.current)
        setPianoWidth(pianoWrapperRef.current.offsetWidth - 16);
    };
    update();
    const ro = new ResizeObserver(update);
    if (pianoWrapperRef.current) ro.observe(pianoWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const sampler = new Tone.Sampler(SALAMANDER_URLS, {
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination();
    samplerRef.current = sampler;
    return () => {
      clearTimeout(releaseTimer.current);
      sampler.dispose();
    };
  }, []);

  // ── Audio ──────────────────────────────────────────────────────────────────
  const playMidis = useCallback(async (midis) => {
    await Tone.start();
    const s = samplerRef.current;
    if (!s) return;
    clearTimeout(releaseTimer.current);
    try { s.releaseAll(); } catch (_) {}
    const noteStrs = midis.map(midiToNoteStr);
    setActiveNotes(midis);
    setIsPlaying(true);
    noteStrs.forEach((note, i) => { s.triggerAttack(note, Tone.now() + i * 0.04); });
    releaseTimer.current = setTimeout(() => {
      noteStrs.forEach(note => { try { s.triggerRelease(note); } catch (_) {} });
      setActiveNotes([]);
      setIsPlaying(false);
    }, 2400);
  }, []);

  // ── Chord tab ──────────────────────────────────────────────────────────────
  const selectedNoteNames = selectedRoot
    ? getChordNoteNames(selectedRoot, selectedType.intervals)
    : [];

  const handleSelectChord = useCallback((root, type = selectedType) => {
    setSelectedRoot(root);
    playMidis(getChordMidis(root, type.intervals));
  }, [selectedType, playMidis]);

  const handleTypeChange = useCallback((type) => {
    setSelectedType(type);
    if (selectedRoot) playMidis(getChordMidis(selectedRoot, type.intervals));
  }, [selectedRoot, playMidis]);

  // ── Scale tab ──────────────────────────────────────────────────────────────
  const scaleNotes     = useMemo(() => getScaleNotes(scaleRoot, scaleType),     [scaleRoot, scaleType]);
  const scaleMidis     = useMemo(() => getScaleNoteMidis(scaleRoot, scaleType), [scaleRoot, scaleType]);
  const diatonicChords = useMemo(() => getDiatonicChords(scaleRoot, scaleType), [scaleRoot, scaleType]);
  const scaleDesc      = SCALE_DESCRIPTIONS[scaleType] || '';
  const scaleInfo      = SCALE_TYPES.find(s => s.value === scaleType);
  const isMinorLike    = ['natural_minor','harmonic_minor','melodic_minor','phrygian','locrian','dorian'].includes(scaleType);

  const handlePlayScale = useCallback(async () => {
    await Tone.start();
    const s = samplerRef.current;
    if (!s) return;
    clearTimeout(releaseTimer.current);
    try { s.releaseAll(); } catch (_) {}
    setIsPlaying(true);
    setActiveNotes(scaleMidis);
    scaleMidis.forEach((midi, i) => {
      s.triggerAttack(midiToNoteStr(midi), Tone.now() + i * 0.22);
    });
    releaseTimer.current = setTimeout(() => {
      scaleMidis.forEach(midi => { try { s.triggerRelease(midiToNoteStr(midi)); } catch (_) {} });
      setActiveNotes([]);
      setIsPlaying(false);
    }, scaleMidis.length * 220 + 1800);
  }, [scaleMidis]);

  const handlePlayDiatonicChord = useCallback((chordStr, idx) => {
    setScaleChordIndex(idx);
    const data = Chord.get(chordStr);
    if (!data.notes.length) return;
    const rootNote = data.tonic || data.notes[0];
    if (!rootNote || !BASE_MIDI[rootNote]) return;
    const rootMidi = BASE_MIDI[rootNote];
    const voiced = data.notes.map(note => {
      const noteMidi = BASE_MIDI[note];
      if (!noteMidi) return null;
      return noteMidi >= rootMidi ? noteMidi : noteMidi + 12;
    }).filter(Boolean);
    playMidis(voiced);
  }, [playMidis]);

  const pianoActiveNotes = activeNotes.length > 0 ? activeNotes : (tab === 'scale' ? scaleMidis : []);

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    setActiveNotes([]);
    if (newTab === 'scale') setScaleChordIndex(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="docs-root">
      {/* Nav */}
      <nav className="mb-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="theme-toggle"
            style={{ display: 'none' }}
            id="docs-menu-btn"
            onClick={() => setSidebarOpen(o => !o)}
          >
            {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
          <Link to="/" className="mb-nav-logo">MUSIC<span>BOX</span></Link>
        </div>
        <div className="mb-nav-links">
          <Link to="/" className="mb-nav-link">Home</Link>
          <Link to="/learn" className="mb-nav-link">Learn</Link>
          <Link to="/chords" className="mb-nav-link active">Chords</Link>
        </div>
      </nav>

      {/* Body */}
      <div className="docs-body">
        {/* Sidebar */}
        <aside className={`docs-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Tab switcher */}
          <div className="docs-sidebar-header" style={{ paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className={`docs-nav-item${tab === 'chord' ? ' active' : ''}`}
                style={{ borderRadius: 'var(--r-sm)', padding: '0.45rem 0.75rem', fontSize: '0.8rem', textAlign: 'center', borderLeft: 'none' }}
                onClick={() => handleTabSwitch('chord')}
              >
                Chord Library
              </button>
              <button
                className={`docs-nav-item${tab === 'scale' ? ' active' : ''}`}
                style={{ borderRadius: 'var(--r-sm)', padding: '0.45rem 0.75rem', fontSize: '0.8rem', textAlign: 'center', borderLeft: 'none' }}
                onClick={() => handleTabSwitch('scale')}
              >
                Scale Browser
              </button>
            </div>
          </div>

          {/* Chord sidebar: chord type groups */}
          {tab === 'chord' && CHORD_GROUPS.map(group => (
            <div className="docs-nav-group" key={group.label}>
              <span className="docs-nav-group-label">{group.label}</span>
              {group.types.map(type => (
                <button
                  key={type.id}
                  className={`docs-nav-item${selectedType.id === type.id ? ' active' : ''}`}
                  onClick={() => { setSelectedGroup(group); handleTypeChange(type); setSidebarOpen(false); }}
                >
                  <span>{type.label}</span>
                  {type.symbol && (
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '0.78rem', opacity: 0.7, marginLeft: 'auto', paddingLeft: '0.5rem' }}>
                      {type.symbol}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Scale sidebar: root notes + scale types */}
          {tab === 'scale' && (
            <>
              <div className="docs-nav-group">
                <span className="docs-nav-group-label">Root Note</span>
                {ROOT_NOTES.map(note => (
                  <button
                    key={note}
                    className={`docs-nav-item${scaleRoot === note ? ' active' : ''}`}
                    onClick={() => { setScaleRoot(note); setScaleChordIndex(null); setActiveNotes([]); setSidebarOpen(false); }}
                  >
                    {ROOT_DISPLAY[note]}
                    {FLAT_DISPLAY[note] && (
                      <span style={{ fontSize: '0.72rem', opacity: 0.6, marginLeft: '0.35rem' }}>
                        / {FLAT_DISPLAY[note]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="docs-nav-group">
                <span className="docs-nav-group-label">Scale Type</span>
                {SCALE_TYPES.map(st => (
                  <button
                    key={st.value}
                    className={`docs-nav-item${scaleType === st.value ? ' active' : ''}`}
                    onClick={() => { setScaleType(st.value); setScaleChordIndex(null); setActiveNotes([]); setSidebarOpen(false); }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Main */}
        <div className="docs-main">
          <div className="docs-content">

            {/* ══ CHORD TAB ══ */}
            {tab === 'chord' && (
              <>
                <div className="docs-topic-meta">
                  <span className="docs-topic-module-badge">Chord Library</span>
                  <span className="docs-topic-type-badge">{selectedType.label}</span>
                </div>
                <h1 className="docs-topic-title">CHORD LIBRARY</h1>
                <p className="docs-topic-intro">
                  Every piano chord — visualized, played, learned. Select a chord type from the sidebar, then click a root note to hear it.
                </p>

                {/* Chord info */}
                {!selectedRoot ? (
                  <div className="chord-display-empty" style={{ marginBottom: '2rem' }}>
                    Select a root note below to see and hear the chord.
                  </div>
                ) : (
                  <div className="chord-display-info" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '1.5rem 2rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="chord-name-area">
                      <div className="chord-name-big">
                        {ROOT_DISPLAY[selectedRoot]}
                        {selectedType.symbol && <sup>{selectedType.symbol}</sup>}
                      </div>
                      <div className="chord-type-tag">{selectedType.label}</div>
                      <div className="chord-notes-row">
                        {selectedNoteNames.map((note, i) => (
                          <span key={i} className={`chord-note-pill${i===0?' root':''}`}>{note}</span>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.4rem', flexWrap:'wrap' }}>
                        {['R','3rd','5th','7th','9th','11th','13th'].slice(0, selectedType.intervals.length).map((lbl,i) => (
                          <span key={i} style={{ fontSize:'0.7rem', color:'var(--text-low)', fontFamily:'monospace' }}>{lbl}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="chord-play-btn"
                      onClick={() => playMidis(getChordMidis(selectedRoot, selectedType.intervals))}
                      disabled={isPlaying}
                    >
                      <Play size={14} />{isPlaying ? ' Playing…' : ' Play Chord'}
                    </button>
                  </div>
                )}

                {/* Root note grid */}
                <p className="docs-section-heading">{selectedType.label} — Select Root Note</p>
                <div className="chord-grid-section" style={{ marginBottom: '1.5rem' }}>
                  <div className="chord-grid">
                    {ROOT_NOTES.map(root => {
                      const noteNames = getChordNoteNames(root, selectedType.intervals);
                      const isActive  = selectedRoot === root;
                      return (
                        <div
                          key={root}
                          className={`chord-card${isActive ? ' active' : ''}`}
                          onClick={() => handleSelectChord(root)}
                        >
                          <div className="chord-card-root">{ROOT_DISPLAY[root]}</div>
                          <div className="chord-card-sym">{selectedType.symbol || 'maj'}</div>
                          <div className="chord-card-dots">
                            {noteNames.slice(0,5).map((_,i) => <div key={i} className="chord-dot"/>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reference table */}
                {selectedRoot && (
                  <>
                    <p className="docs-section-heading">All {selectedType.label} Chords — Notes Reference</p>
                    <div style={{ overflowX:'auto', marginBottom: '2rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'auto' }}>
                      <table className="cl-ref-table">
                        <thead>
                          <tr>
                            <th>Chord</th>
                            {selectedType.intervals.map((_,i) => (
                              <th key={i}>{['Root','3rd','5th','7th','9th','11th','13th'][i] ?? `${i+1}th`}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ROOT_NOTES.map(root => {
                            const names    = getChordNoteNames(root, selectedType.intervals);
                            const isActive = selectedRoot === root;
                            return (
                              <tr
                                key={root}
                                className={isActive ? 'active-row' : ''}
                                onClick={() => handleSelectChord(root)}
                              >
                                <td className="chord-col">{ROOT_DISPLAY[root]}{selectedType.symbol}</td>
                                {names.map((name,i) => (
                                  <td key={i} className={i===0 ? 'root-col' : ''}>{name}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══ SCALE TAB ══ */}
            {tab === 'scale' && (
              <>
                <div className="docs-topic-meta">
                  <span className="docs-topic-module-badge">Scale Browser</span>
                  <span className="docs-topic-type-badge">{scaleInfo?.label}</span>
                </div>
                <h1 className="docs-topic-title">
                  {ROOT_DISPLAY[scaleRoot]} {scaleInfo?.label}
                </h1>
                <p className="docs-topic-intro">{scaleDesc}</p>

                {/* Scale notes */}
                <p className="docs-section-heading">Notes in this scale</p>
                <div className="cl-scale-notes-row" style={{ marginBottom: '1rem' }}>
                  {scaleNotes.map((note, i) => (
                    <div key={i} className={`cl-scale-note${i===0?' root':''}`}>
                      <div className="cl-scale-note-degree">{DEGREE_LABELS[i]}</div>
                      <div className="cl-scale-note-name">{note}</div>
                    </div>
                  ))}
                </div>
                <button
                  className="cl-play-scale-btn"
                  style={{ marginBottom: '2rem' }}
                  onClick={handlePlayScale}
                  disabled={isPlaying}
                >
                  <Play size={14} />{isPlaying ? ' Playing…' : ` Play ${ROOT_DISPLAY[scaleRoot]} ${scaleInfo?.label} Scale`}
                </button>

                {/* Diatonic chords */}
                <p className="docs-section-heading">
                  Diatonic Chords — chords you can use in {ROOT_DISPLAY[scaleRoot]} {scaleInfo?.label}
                </p>
                <div className="cl-diatonic-grid" style={{ marginBottom: '1.5rem' }}>
                  {diatonicChords.map((chordStr, i) => {
                    const chordData = Chord.get(chordStr);
                    const notes = chordData.notes.join(' ');
                    const isActive = scaleChordIndex === i;
                    return (
                      <div
                        key={i}
                        className={`cl-diatonic-card${isActive ? ' active' : ''}`}
                        onClick={() => handlePlayDiatonicChord(chordStr, i)}
                      >
                        <div className="cl-diatonic-degree">
                          {isMinorLike ? DEGREE_ROMAN_MINOR[i] : DEGREE_LABELS[i]}
                        </div>
                        <div className="cl-diatonic-name">{chordStr}</div>
                        <div className="cl-diatonic-notes">{notes}</div>
                        <div className="cl-diatonic-type">{chordData.aliases?.[0] || ''}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected chord detail */}
                {scaleChordIndex !== null && diatonicChords[scaleChordIndex] && (() => {
                  const chordData = Chord.get(diatonicChords[scaleChordIndex]);
                  return (
                    <div className="cl-chord-detail-box" style={{ marginBottom: '2rem' }}>
                      <div className="cl-chord-detail-name">{diatonicChords[scaleChordIndex]}</div>
                      <div className="cl-chord-detail-row">
                        <span className="cl-detail-label">Notes</span>
                        <span className="cl-detail-val">{chordData.notes.join(' — ')}</span>
                      </div>
                      <div className="cl-chord-detail-row">
                        <span className="cl-detail-label">Intervals</span>
                        <span className="cl-detail-val">{chordData.intervals.join('  ')}</span>
                      </div>
                      <div className="cl-chord-detail-row">
                        <span className="cl-detail-label">Type</span>
                        <span className="cl-detail-val">{chordData.name || '—'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Usage tips */}
                <p className="docs-section-heading">How to use this scale</p>
                <div className="cl-tips-grid" style={{ marginBottom: '3rem' }}>
                  <div className="cl-tip">
                    <div className="cl-tip-title">Notes to play</div>
                    <div className="cl-tip-body">
                      When improvising or writing melodies in {ROOT_DISPLAY[scaleRoot]} {scaleInfo?.label},
                      use these {scaleNotes.length} notes: {scaleNotes.join(', ')}.
                    </div>
                  </div>
                  <div className="cl-tip">
                    <div className="cl-tip-title">Chord progressions</div>
                    <div className="cl-tip-body">
                      Common progressions: I–{isMinorLike?'iv–v':'IV–V'},&nbsp;
                      {isMinorLike?'i–VI–VII–i':'I–V–vi–IV'}, &nbsp;
                      {isMinorLike?'i–iv–VII–III':'I–IV–V–I'}.
                      Click any chord above to hear it.
                    </div>
                  </div>
                  <div className="cl-tip">
                    <div className="cl-tip-title">Characteristic sound</div>
                    <div className="cl-tip-body">{scaleDesc}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Piano dock */}
          <div className="docs-piano-area">
            <div className="docs-piano-notch-bar">
              <button
                className="docs-piano-notch"
                onClick={() => setPianoCollapsed(p => !p)}
                title={pianoCollapsed ? 'Show piano' : 'Hide piano'}
              >
                {pianoCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
            <div className={`docs-piano-dock${pianoCollapsed ? ' collapsed' : ''}`} ref={pianoWrapperRef}>
              <Piano
                noteRange={{ first: PIANO_FIRST, last: PIANO_LAST }}
                playNote={midi => {
                  Tone.start().then(() => {
                    try { samplerRef.current?.triggerAttack(midiToNoteStr(midi)); } catch (_) {}
                    setActiveNotes(p => [...p, midi]);
                  });
                }}
                stopNote={midi => {
                  try { samplerRef.current?.triggerRelease(midiToNoteStr(midi)); } catch (_) {}
                  setActiveNotes(p => p.filter(x => x !== midi));
                }}
                activeNotes={pianoActiveNotes}
                width={pianoWidth}
                height={130}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

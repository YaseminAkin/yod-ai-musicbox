import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { MidiNumbers } from 'react-piano';
import { Chord } from 'tonal';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTheme } from '../useTheme';
import {
  Play, Pause, Square, SkipBack, ArrowLeft, X,
  Sun, Moon, Music, AlignJustify,
} from 'lucide-react';
import MusicNotation from './MusicNotation';
import PianoRoll from './PianoRoll';

// ── White-key piano layout ────────────────────────────────────────────────────
const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
const FIRST_MIDI      = 21;
const LAST_MIDI       = 108;
const TOTAL_WHITE_KEYS = 52;
const NOTE_NAMES      = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const midiToName = (m) => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);

const NOTE_POSITIONS = new Map();
{
  let wc = 0;
  for (let m = FIRST_MIDI; m <= LAST_MIDI; m++) {
    const isWhite = WHITE_PITCH_CLASSES.has(m % 12);
    NOTE_POSITIONS.set(m, { isWhite, wi: wc });
    if (isWhite) wc++;
  }
}

function getNoteLayout(midi, pianoWidth) {
  const pos = NOTE_POSITIONS.get(midi);
  if (!pos) return null;
  const wkw = pianoWidth / TOTAL_WHITE_KEYS;
  if (pos.isWhite) return { left: pos.wi * wkw, width: wkw };
  const bkw = wkw * 0.6;
  return { left: pos.wi * wkw - bkw / 2, width: bkw };
}

// ── Instruments ───────────────────────────────────────────────────────────────
const SALAMANDER_URLS = {
  A0:'A0.mp3', C1:'C1.mp3', 'D#1':'Ds1.mp3', 'F#1':'Fs1.mp3',
  A1:'A1.mp3', C2:'C2.mp3', 'D#2':'Ds2.mp3', 'F#2':'Fs2.mp3',
  A2:'A2.mp3', C3:'C3.mp3', 'D#3':'Ds3.mp3', 'F#3':'Fs3.mp3',
  A3:'A3.mp3', C4:'C4.mp3', 'D#4':'Ds4.mp3', 'F#4':'Fs4.mp3',
  A4:'A4.mp3', C5:'C5.mp3', 'D#5':'Ds5.mp3', 'F#5':'Fs5.mp3',
  A5:'A5.mp3', C6:'C6.mp3', 'D#6':'Ds6.mp3', 'F#6':'Fs6.mp3',
  A6:'A6.mp3', C7:'C7.mp3', 'D#7':'Ds7.mp3', 'F#7':'Fs7.mp3',
  A7:'A7.mp3', C8:'C8.mp3',
};

const INSTRUMENTS = [
  {
    id: 'piano', label: 'Grand Piano', code: 'GP',
    create: () => new Tone.Sampler(SALAMANDER_URLS, { baseUrl: 'https://tonejs.github.io/audio/salamander/' }).toDestination(),
  },
  {
    id: 'epiano', label: 'E-Piano', code: 'EP',
    create: () => new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3, modulationIndex: 14, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1.2 } }).toDestination(),
  },
  {
    id: 'organ', label: 'Organ', code: 'ORG',
    create: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine4' }, envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.15 } }).toDestination(),
  },
  {
    id: 'harpsi', label: 'Harpsichord', code: 'HPS',
    create: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 } }).toDestination(),
  },
  {
    id: 'vibra', label: 'Vibraphone', code: 'VIB',
    create: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 1.5, sustain: 0.1, release: 1 } }).toDestination(),
  },
  {
    id: 'strings', label: 'Strings', code: 'STR',
    create: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.5, decay: 0.1, sustain: 0.9, release: 1.5 } }).toDestination(),
  },
  {
    id: 'synth', label: 'Bright Synth', code: 'SYN',
    create: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 } }).toDestination(),
  },
];

// ── Keyboard shortcut map ─────────────────────────────────────────────────────
const KEY_MAP = {
  a:'C4', w:'C#4', s:'D4', e:'D#4', d:'E4', f:'F4',
  t:'F#4', g:'G4', y:'G#4', h:'A4', u:'A#4', j:'B4', k:'C5',
};

function usePianoWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => setWidth(Math.floor(e[0].contentRect.width)));
    ro.observe(ref.current);
    setWidth(Math.floor(ref.current.clientWidth));
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export default function Musicbox() {
  const location = useLocation();
  const { data }  = location.state || {};
  const navigate  = useNavigate();

  const [isPlaying,       setIsPlaying]      = useState(false);
  const [activeNotes,     setActiveNotes]    = useState([]);
  const [noteQueue,       setNoteQueue]      = useState([]);
  const [midiDuration,    setMidiDuration]   = useState(0);
  const [currentTime,     setCurrentTime]    = useState(0);
  const [instrumentIndex, setInstrumentIndex] = useState(0);
  const [volume,          setVolume]         = useState(0);
  const [tempo,           setTempo]          = useState(120);
  const [musicXML,        setMusicXML]       = useState(null);
  const [midiUrl,         setMidiUrl]        = useState(null);
  const [rollOpen,        setRollOpen]       = useState(true);
  const [activeMeasure,   setActiveMeasure]  = useState(-1);
  const [measureTimes,    setMeasureTimes]   = useState([]);
  const [viewMode,        setViewMode]       = useState('roll');
  const [sidebarOpen,     setSidebarOpen]    = useState(true);
  const [chordData,       setChordData]      = useState(null);
  const [showAnalysis,    setShowAnalysis]   = useState(false);
  const [selectedChord,   setSelectedChord]  = useState(null);
  const { isDark, toggle: toggleTheme } = useTheme();

  const instrumentRef = useRef(null);
  const pianoWrapRef  = useRef(null);
  const pianoWidth    = usePianoWidth(pianoWrapRef);

  useEffect(() => {
    if (instrumentRef.current) {
      try { instrumentRef.current.dispose(); } catch (_) {}
    }
    const inst = INSTRUMENTS[instrumentIndex].create();
    inst.volume.value = volume;
    instrumentRef.current = inst;
    return () => { try { inst.dispose(); } catch (_) {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrumentIndex]);

  useEffect(() => {
    if (instrumentRef.current) instrumentRef.current.volume.value = volume;
  }, [volume]);

  useEffect(() => {
    if (!data) return;
    setMidiUrl(`http://localhost:3000/download/${data.midi}`);
    fetch(`http://localhost:3000/download/${data.musicxml}`)
      .then(r => r.text()).then(setMusicXML).catch(console.error);
    if (data.chord_data) setChordData(data.chord_data);
  }, [data]);

  const loadMidi = useCallback(async url => {
    const buf  = await fetch(url).then(r => r.arrayBuffer());
    const midi = new Midi(buf);
    const queue = [];
    midi.tracks.forEach((track, trackIdx) => {
      track.notes.forEach(note => {
        queue.push({
          name: note.name, midi: note.midi,
          time: note.time, duration: note.duration,
          velocity: note.velocity,
          isSharp: note.name.includes('#') || note.name.includes('b'),
          track: trackIdx,
        });
      });
    });
    queue.sort((a, b) => a.time - b.time);
    const bpm = midi.header?.tempos?.[0]?.bpm || 120;
    setTempo(Math.round(bpm));
    const secPerMeasure = (4 * 60) / bpm;
    const times = [];
    for (let t = 0; t < midi.duration + secPerMeasure; t += secPerMeasure) times.push(t);
    setMeasureTimes(times);
    setNoteQueue(queue);
    setMidiDuration(midi.duration);
    return queue;
  }, []);

  const playMidi = useCallback(async (url, fromTime = 0) => {
    await Tone.start();
    const queue = await loadMidi(url);
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = tempo;
    queue.forEach(note => {
      Tone.Transport.schedule(t => {
        try {
          instrumentRef.current?.triggerAttackRelease(note.name, note.duration, t, note.velocity);
        } catch (_) {}
      }, note.time);
    });
    setActiveNotes([]);
    Tone.Transport.position = `${fromTime}s`;
    Tone.Transport.start();
    setTimeout(() => setIsPlaying(true), 300);
  }, [loadMidi, tempo]);

  const stopMidi = useCallback(() => {
    Tone.Transport.pause();
    setCurrentTime(Tone.Transport.seconds);
    setIsPlaying(false);
  }, []);

  const resetMidi = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveNotes([]);
    setActiveMeasure(-1);
  }, []);

  const seekMidi = useCallback(async (delta) => {
    if (!midiUrl) return;
    const wasPlaying = isPlaying;
    const newTime = Math.max(0, Math.min((wasPlaying ? Tone.Transport.seconds : currentTime) + delta, midiDuration));
    if (wasPlaying) {
      await playMidi(midiUrl, newTime);
    } else {
      setCurrentTime(newTime);
    }
  }, [midiUrl, isPlaying, currentTime, midiDuration, playMidi]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const t = Tone.Transport.seconds;
      setCurrentTime(t);
      setActiveNotes(noteQueue.filter(n => n.time <= t && n.time + n.duration > t).map(n => n.midi));
      const mIdx = measureTimes.findLastIndex(mt => mt <= t);
      setActiveMeasure(mIdx >= 0 ? mIdx : -1);
      if (t >= midiDuration) resetMidi();
    }, 16);
    return () => clearInterval(id);
  }, [isPlaying, noteQueue, midiDuration, measureTimes, resetMidi]);

  const handleKeyDown = useCallback(e => {
    if (e.repeat) return;
    const note = KEY_MAP[e.key];
    if (note && instrumentRef.current) {
      try { instrumentRef.current.triggerAttack(note); } catch (_) {}
      setActiveNotes(p => [...new Set([...p, MidiNumbers.fromNote(note)])]);
    }
  }, []);

  const handleKeyUp = useCallback(e => {
    const note = KEY_MAP[e.key];
    if (note && instrumentRef.current) {
      try { instrumentRef.current.triggerRelease(note); } catch (_) {}
      setActiveNotes(p => p.filter(n => n !== MidiNumbers.fromNote(note)));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => { return () => resetMidi(); }, [resetMidi]);

  useEffect(() => {
    const onUnload = () => fetch('http://localhost:3000/delete-user-files', { method:'POST', credentials:'include' }).catch(()=>{});
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const handleBackNav = async () => {
    resetMidi();
    try {
      await fetch('http://localhost:3000/delete-user-files', {
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      });
    } catch (_) {}
    navigate('/');
  };

  const downloadFile = path => {
    const a = document.createElement('a');
    a.href = `http://localhost:3000/download/${path}`;
    a.download = path.split('/').pop();
    a.click();
  };

  const handleProgressClick = useCallback((e) => {
    if (!midiUrl || midiDuration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const newTime = pct * midiDuration;
    if (isPlaying) {
      playMidi(midiUrl, newTime);
    } else {
      setCurrentTime(newTime);
    }
  }, [midiUrl, midiDuration, isPlaying, playMidi, setCurrentTime]);

  const progress = midiDuration > 0 ? Math.min((currentTime / midiDuration) * 100, 100) : 0;
  const playedProgress = isPlaying ? Math.min((Tone.Transport.seconds / midiDuration) * 100, 100) : progress;

  // ── Real-time chord detection ───────────────────────────────────────────────
  const detectedChord = useMemo(() => {
    if (activeNotes.length < 2) return null;
    const pitchClasses = [...new Set(activeNotes.map(m => NOTE_NAMES[m % 12]))];
    const results = Chord.detect(pitchClasses);
    return results[0] || null;
  }, [activeNotes]);

  // ── Custom piano keyboard renderer ─────────────────────────────────────────
  const pianoHeight = 120;

  const renderPianoKeyboard = () => {
    if (pianoWidth <= 0) return null;
    const whites = [];
    const blacks = [];

    for (let midi = FIRST_MIDI; midi <= LAST_MIDI; midi++) {
      const lay = getNoteLayout(midi, pianoWidth);
      const pos = NOTE_POSITIONS.get(midi);
      if (!lay || !pos) continue;
      const isActive = activeNotes.includes(midi);
      const noteName = midiToName(midi);

      const handleDown = () => {
        Tone.start().then(() => {
          try { instrumentRef.current?.triggerAttack(noteName); } catch (_) {}
          setActiveNotes(p => [...new Set([...p, midi])]);
        });
      };
      const handleUp = () => {
        try { instrumentRef.current?.triggerRelease(noteName); } catch (_) {}
        setActiveNotes(p => p.filter(n => n !== midi));
      };

      const sharedEvents = {
        onMouseDown: handleDown,
        onMouseUp:   handleUp,
        onMouseLeave: handleUp,
        onTouchStart: e => { e.preventDefault(); handleDown(); },
        onTouchEnd:   e => { e.preventDefault(); handleUp(); },
      };

      if (pos.isWhite) {
        whites.push(
          <div
            key={midi}
            {...sharedEvents}
            style={{
              position: 'absolute',
              left:     lay.left,
              width:    Math.max(lay.width - 1, 2),
              height:   '100%',
              background: isActive
                ? 'linear-gradient(180deg,#e9d5ff 0%,#c084fc 100%)'
                : 'linear-gradient(180deg,#ffffff 0%,#efefef 100%)',
              border:       '1px solid #bbb',
              borderRadius: '0 0 5px 5px',
              zIndex:       1,
              cursor:       'pointer',
              userSelect:   'none',
              boxShadow:    isActive ? 'inset 0 -4px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          />
        );
      } else {
        blacks.push(
          <div
            key={midi}
            {...sharedEvents}
            style={{
              position: 'absolute',
              left:     lay.left,
              width:    lay.width,
              height:   '62%',
              background: isActive
                ? 'linear-gradient(180deg,#7c3aed,#a855f7)'
                : 'linear-gradient(180deg,#1e1e30,#0d0d1a)',
              border:       '1px solid #333',
              borderRadius: '0 0 4px 4px',
              zIndex:       3,
              cursor:       'pointer',
              userSelect:   'none',
              boxShadow:    isActive ? '0 0 10px rgba(168,85,247,0.7)' : '0 2px 4px rgba(0,0,0,0.5)',
            }}
          />
        );
      }
    }

    return (
      <div
        style={{
          width:      pianoWidth,
          height:     pianoHeight,
          position:   'relative',
          background: '#d0d0d8',
          borderTop:  '2px solid #888',
          userSelect: 'none',
          flexShrink: 0,
          overflowX:  'hidden',
        }}
      >
        {whites}
        {blacks}
      </div>
    );
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmtTime = s => {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2,'0')}`;
  };
  const volPct = Math.round(((volume + 40) / 40) * 100);

  const effectiveViewMode = viewMode;

  // ── Song Analysis ─────────────────────────────────────────────────────────────
  const playChordNotes = useCallback((notes) => {
    Tone.start().then(() => {
      try {
        const notesWithOctave = notes.map((n, i) => n + (i === 0 ? '3' : '4'));
        instrumentRef.current?.triggerAttackRelease(notesWithOctave, '2n', Tone.now());
      } catch (_) {}
    });
  }, []);

  const SongAnalysisPanel = chordData ? (
    <div className={`sa-panel${showAnalysis ? ' open' : ''}`}>
      <div className="sa-header">
        <span className="sa-title">Song Analysis</span>
        <button className="sa-close" onClick={() => setShowAnalysis(false)} title="Close">✕</button>
      </div>
      <div className="sa-body">

        <div>
          <div className="sa-section-label">Key &amp; Scale</div>
          <div className="sa-key-row">
            <span className="sa-key-badge">{chordData.key}</span>
            <span className="sa-mode-badge">{chordData.mode}</span>
          </div>
          <div className="sa-scale-row">
            {chordData.scale_notes.map(n => (
              <span key={n} className={`sa-scale-note${n === chordData.key ? ' root' : ''}`}>{n}</span>
            ))}
          </div>
        </div>

        {chordData.chords.length > 0 && (
          <div>
            <div className="sa-section-label">Chords Used ({chordData.chords.length})</div>
            <div className="sa-chord-grid">
              {chordData.chords.map((chord, i) => (
                <div
                  key={i}
                  className={`sa-chord-card${selectedChord === i ? ' active' : ''}`}
                  onClick={() => setSelectedChord(selectedChord === i ? null : i)}
                >
                  <span className="sa-chord-roman">{chord.roman || ''}</span>
                  <span className="sa-chord-root">{chord.root}</span>
                  <span className="sa-chord-sym" title={chord.symbol}>{chord.symbol}</span>
                  <div className="sa-chord-notes-row">
                    {chord.notes.slice(0, 4).map((n, ni) => <span key={ni} className="sa-chord-note-dot" />)}
                  </div>
                </div>
              ))}
            </div>

            {selectedChord !== null && chordData.chords[selectedChord] && (() => {
              const c = chordData.chords[selectedChord];
              return (
                <div className="sa-chord-detail">
                  <div className="sa-detail-name">{c.root} {c.symbol}</div>
                  <div className="sa-detail-row">
                    <span className="sa-detail-label">Notes</span>
                    <div className="sa-detail-val">
                      {c.notes.map(n => <span key={n} className="sa-detail-pill">{n}</span>)}
                    </div>
                  </div>
                  {c.roman && (
                    <div className="sa-detail-row">
                      <span className="sa-detail-label">Degree</span>
                      <div className="sa-detail-val">
                        <span className="sa-detail-pill">{c.roman}</span>
                        <span className="sa-detail-pill" style={{ color: 'var(--text-mid)', textTransform: 'capitalize' }}>{c.quality}</span>
                      </div>
                    </div>
                  )}
                  <button className="sa-play-btn" onClick={() => playChordNotes(c.notes)}>
                    ▶ Play
                  </button>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  ) : null;

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const sidebar = (
    <aside className={`score-sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="sb-header">
        <span className="sb-header-title">Controls</span>
        <button className="sb-close" onClick={() => setSidebarOpen(false)} title="Close sidebar"><X size={16} /></button>
      </div>

      {/* Transport */}
      <div className="sb-section">
        <div className="sb-label">Transport</div>
        <div className="sb-transport">
          <button className="sb-transport-btn" onClick={resetMidi} disabled={!midiUrl} title="Restart">
            <span className="sb-t-icon"><SkipBack size={16} /></span>
          </button>
          <button className="sb-transport-btn sb-transport-btn--seek" onClick={() => seekMidi(-10)} disabled={!midiUrl} title="-10s">
            <span className="sb-t-icon">−10s</span>
          </button>
          <button
            className={`sb-transport-btn sb-transport-btn--play${isPlaying ? ' active' : ''}`}
            onClick={() => isPlaying ? stopMidi() : playMidi(midiUrl, currentTime)}
            disabled={!midiUrl}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="sb-t-icon">{isPlaying ? <Pause size={16} /> : <Play size={16} />}</span>
          </button>
          <button className="sb-transport-btn sb-transport-btn--seek" onClick={() => seekMidi(10)} disabled={!midiUrl} title="+10s">
            <span className="sb-t-icon">+10s</span>
          </button>
          <button className="sb-transport-btn" onClick={resetMidi} disabled={!midiUrl} title="Stop">
            <span className="sb-t-icon"><Square size={16} /></span>
          </button>
        </div>
        <div className="sb-time" style={{ marginTop: '0.6rem' }}>
          <span className="sb-time-cur">{fmtTime(currentTime)}</span>
          <div className="sb-time-bar">
            <div className="sb-time-fill" style={{ width: `${playedProgress}%` }} />
          </div>
          <span className="sb-time-total">{fmtTime(midiDuration)}</span>
        </div>
      </div>

      {/* Instrument */}
      <div className="sb-section">
        <div className="sb-label">Instrument</div>
        <div className="sb-inst-grid">
          {INSTRUMENTS.map((inst, i) => (
            <button
              key={inst.id}
              className={`sb-inst-btn${instrumentIndex === i ? ' active' : ''}`}
              onClick={() => { resetMidi(); setInstrumentIndex(i); }}
            >
              <span className="sb-inst-code">{inst.code}</span>
              <span className="sb-inst-name">{inst.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div className="sb-section">
        <div className="sb-label-row">
          <span className="sb-label">Volume</span>
          <span className="sb-value">{volPct}%</span>
        </div>
        <div className="sb-slider-row">
          <span className="sb-slider-icon">—</span>
          <input
            type="range" min="-40" max="0" step="1"
            value={volume} className="sb-slider"
            onChange={e => setVolume(Number(e.target.value))}
          />
          <span className="sb-slider-icon">+</span>
        </div>
      </div>

      {/* Tempo */}
      <div className="sb-section">
        <div className="sb-label-row">
          <span className="sb-label">Tempo</span>
          <span className="sb-value">{tempo} bpm</span>
        </div>
        <div className="sb-slider-row">
          <span className="sb-slider-icon">30</span>
          <input
            type="range" min="30" max="300" step="1"
            value={tempo} className="sb-slider"
            onChange={e => {
              const v = Number(e.target.value);
              setTempo(v);
              Tone.Transport.bpm.value = v;
            }}
          />
          <span className="sb-slider-icon">300</span>
        </div>
        <input
          type="number" className="sb-bpm-input"
          value={tempo} min={30} max={300}
          onChange={e => { const v = Number(e.target.value); setTempo(v); Tone.Transport.bpm.value = v; }}
        />
      </div>

      {/* View */}
      <div className="sb-section">
        <div className="sb-label">View</div>
        <div className="sb-view-toggle">
          <button
            className={`sb-view-btn${viewMode === 'notes' ? ' active' : ''}`}
            onClick={() => setViewMode('notes')}
          >
            <Music size={13} /> Notes
          </button>
          <button
            className={`sb-view-btn${viewMode === 'roll' ? ' active' : ''}`}
            onClick={() => setViewMode('roll')}
          >
            <AlignJustify size={13} /> Roll
          </button>
        </div>
      </div>

      {/* Tools */}
      <div className="sb-section">
        <div className="sb-label">Tools</div>
        <div className="sb-tools">
          <Link to="/chords" className="sb-tool-btn" style={{ textDecoration:'none', textAlign:'left' }}>
            ♯ Chord Library
          </Link>
          {data && (
            <>
              <button className="sb-tool-btn" onClick={() => downloadFile(data.musicxml)}>↓ Download XML</button>
              <button className="sb-tool-btn" onClick={() => downloadFile(data.midi)}>↓ Download MIDI</button>
            </>
          )}
        </div>
      </div>

    </aside>
  );

  // ── Content ──────────────────────────────────────────────────────────────────
  const content = (
    <div className="score-content">
      {SongAnalysisPanel}

      {/* Notes mode: large notation + collapsible roll */}
      {effectiveViewMode === 'notes' && (
        <>
          <div className="notation-area">
            {musicXML ? (
              <MusicNotation musicXML={musicXML} activeMeasure={activeMeasure} currentTime={currentTime} isPlaying={isPlaying} tempo={tempo} />
            ) : (
              <div className="notation-placeholder">
                <div className="notation-loading">
                  <div className="mb-spinner-sm" />
                  <span>Loading notation…</span>
                </div>
              </div>
            )}
          </div>
          <div className={`roll-section${rollOpen ? ' open' : ''}`}>
            <button className="roll-toggle" onClick={() => setRollOpen(o => !o)}>
              <span>Piano Roll</span>
              <span>{rollOpen ? '▼' : '▲'}</span>
            </button>
            {rollOpen && (
              <PianoRoll noteQueue={noteQueue} isPlaying={isPlaying} pausedAt={currentTime} isDark={isDark} />
            )}
          </div>
        </>
      )}

      {/* Roll mode: compact notation bar + large piano roll */}
      {effectiveViewMode === 'roll' && (
        <>
          <div className="notation-bar">
            {musicXML ? (
              <MusicNotation musicXML={musicXML} activeMeasure={activeMeasure} singleRow currentTime={currentTime} isPlaying={isPlaying} tempo={tempo} />
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#7a7490', fontSize:'0.82rem', fontStyle:'italic' }}>
                Loading notation…
              </div>
            )}
            <div className="notation-bar-badge">
              {activeMeasure >= 0 ? `M${activeMeasure + 1}` : '–'}
            </div>
          </div>
          <div className="roll-area">
            <PianoRoll noteQueue={noteQueue} isPlaying={isPlaying} pausedAt={currentTime} isDark={isDark} fillContainer />
          </div>
        </>
      )}

      <div className="keyboard-section" ref={pianoWrapRef} style={{ overflowX: 'auto' }}>
        <div className={`chord-detect-bar${detectedChord ? ' visible' : ''}`}>
          <span className="chord-detect-label">CHORD</span>
          <span className="chord-detect-name">{detectedChord || ''}</span>
        </div>
        {renderPianoKeyboard()}
      </div>
    </div>
  );

  return (
    <div className="score-root">
      {/* ── Toolbar ── */}
      <div className="score-toolbar">
        <div className="toolbar-left">
          <button className="tb-back-btn" onClick={handleBackNav}>
            <span className="tb-back-arrow"><ArrowLeft size={16} /></span>
            <span className="tb-back-label">Back</span>
          </button>
        </div>

        <div className="toolbar-center">
          <span className="toolbar-wordmark">
            <span className="toolbar-note-glyph"><Music size={16} /></span>
            MUSICBOX
          </span>
        </div>

        <div className="toolbar-right">
          {chordData && (
            <button
              className={`sa-toggle-btn${showAnalysis ? ' active' : ''}`}
              onClick={() => setShowAnalysis(o => !o)}
              style={{ marginRight: '8px' }}
            >
              ♪ Analysis
            </button>
          )}
          <Link to="/learn" className="mb-nav-link" style={{ fontSize: '13px', marginRight: '8px' }}>🎹 Learn</Link>
          <button className="theme-toggle" onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className={`tb-panel-btn${sidebarOpen ? ' open' : ''}`}
            onClick={() => setSidebarOpen(o => !o)}
            title="Toggle controls panel"
          >
            <span className="tb-panel-icon">
              <span /><span /><span />
            </span>
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div
        className="progress-bar"
        onClick={handleProgressClick}
        style={{ cursor: midiUrl ? 'pointer' : 'default' }}
        title="Click to seek"
      >
        <div className="progress-fill" style={{ width:`${playedProgress}%` }} />
        <div className="progress-thumb" style={{ left:`${playedProgress}%` }} />
      </div>

      {/* ── Main area ── */}
      <div className="score-main">
        {content}
        {sidebar}
      </div>
    </div>
  );
}

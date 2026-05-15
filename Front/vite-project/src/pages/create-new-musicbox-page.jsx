import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../useTheme';
import {
  Sun, Moon, Upload, Music2, Piano as PianoIcon, FileText, Search,
  X, ArrowRight, ChevronRight,
} from 'lucide-react';
import * as Tone from 'tone';
import { Piano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';

const KEY_MAP = {
  a:'A3', w:'A#3', s:'B3', d:'C4', r:'C#4',
  f:'D4', t:'D#4', g:'E4', h:'F4', u:'F#4',
  j:'G4', i:'G#4', k:'A4', o:'A#4', l:'B4',
  ';':'C5', '[':'C#5', "'":'D5',
};
const PIANO_FIRST = MidiNumbers.fromNote('A3');
const PIANO_LAST  = MidiNumbers.fromNote('D5');

const STEPS = [
  { id:'upload', label:'Image Processing', Icon: Upload },
  { id:'omr',    label:'Note Recognition', Icon: Search },
  { id:'midi',   label:'MIDI Generation',  Icon: Music2 },
];

const STEP_SUBS = [
  'Preprocessing image with OpenCV…',
  'Recognizing notation with homr…',
  'Generating MIDI with music21…',
];

const FAQ = [
  { q:'What is MUSICBOX?', a:'A web app that converts sheet music photos into MIDI and interactive visual notation. Upload an image — we handle the rest.' },
  { q:'Which file formats are supported?', a:'PNG, JPG and PDF. Maximum file size is 20 MB.' },
  { q:'Can I upload PDFs?', a:'Yes! Each page in the PDF is processed separately. Up to 10 pages supported.' },
  { q:'How long does processing take?', a:'Usually 30–90 seconds depending on image quality.' },
  { q:'Can I download the MIDI?', a:'Yes — both MusicXML and MIDI downloads are available on the player page.' },
];

const DEVS = [
  {
    name:     'Alphan Tulukcu',
    image:    '/alphan_pp.jpeg',
    role:     'Full Stack & AI',
    bio:      'Architected the end-to-end pipeline — from OMR backend to the interactive piano player.',
    linkedin: 'https://linkedin.com/in/alphantulukcu',
    github:   'https://github.com/alphantulukcu',
  },
  {
    name:     'İlhami Uluğtürkkan',
    image:    '/ilhami.jpeg',
    role:     'Full Stack & AI',
    bio:      'Integrated homr and music21 for sheet-music recognition and MIDI generation.',
    linkedin: 'https://linkedin.com/in/ilhami-ulugtürkkan',
    github:   null,
  },
  {
    name:     'Yasemin Akın',
    image:    '/yasemin.jpeg',
    role:     'Full Stack & AI',
    bio:      'Built the notation viewer and piano-roll visualisation with VexFlow and Tone.js.',
    linkedin: 'https://linkedin.com/in/yasemin-akin',
    github:   null,
  },
  {
    name:     'Oğulcan Karakollukçu',
    image:    '/ogi.jpeg',
    role:     'Full Stack & AI',
    bio:      'Designed the REST API, session management, and file-processing infrastructure.',
    linkedin: 'https://linkedin.com/in/ogulcan-karakollukcu',
    github:   null,
  },
  {
    name:     'Denizcan Özdemir',
    image:    '/deniz.jpeg',
    role:     'Full Stack & AI',
    bio:      'Tuned the OMR model pipeline and benchmarked recognition accuracy across score formats.',
    linkedin: 'https://linkedin.com/in/denizcan-ozdemir',
    github:   null,
  },
];

function dataURItoBlob(dataURI) {
  const bytes = atob(dataURI.split(',')[1]);
  const mime  = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ── Hero piano roll canvas ──────────────────────────────────────────────────
// NOTE_COLS is set after DECO_WHITE is defined (below PianoDeco section)
// Musical patterns use white-key indices (0 = C2, 7 = C3, 14 = C4, 21 = C5)
const ROLL_PATTERNS = [
  [0, 2, 4, 7, 9],           // C major pentatonic
  [7, 9, 11, 14, 16],        // C major pentatonic, octave up
  [0, 3, 5, 7, 10, 12],      // C minor pentatonic
  [14, 16, 18, 21, 23],      // C major scale (C4–)
  [7, 11, 14, 18, 21],       // C–E–G–B–D (Cmaj7 spread)
  [9, 12, 14, 16, 19, 21],   // A minor scale
  [4, 7, 11, 14, 18],        // E–G–B–D–F# (Em7)
];

// landedRef: Set<colIndex> — written by RAF loop, read by PianoDeco poll
function HeroPianoRoll({ landedRef }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const notes = [];
    let frame  = 0;
    let patIdx = 0;
    const PIANO_DECO_H = 120; // must match CSS .hero-piano-deco height

    const spawnNote = () => {
      const totalCols = landedRef ? (window.__decoWhiteCount || 28) : 28;

      // 30% chance: spawn a black-key bar using chord patterns
      if (Math.random() < 0.3) {
        const chord    = DECO_CHORDS[patIdx % DECO_CHORDS.length];
        const semitone = chord[Math.floor(Math.random() * chord.length)];
        const noteName = semitoneToDecoNote(semitone);
        const bk       = DECO_BLACK.find(b => b.note === noteName);
        if (bk) {
          notes.push({
            col:      bk.wi + bk.offset,
            noteName,
            isBlack:  true,
            y:        -Math.random() * 200 - 40,
            h:        28 + Math.random() * 38,
            speed:    0.5 + Math.random() * 0.65,
            bright:   true,
            alpha:    0.38 + Math.random() * 0.38,
          });
          patIdx++;
          return;
        }
      }

      // Default: white-key bar
      const pat = ROLL_PATTERNS[patIdx % ROLL_PATTERNS.length];
      const col = pat[Math.floor(Math.random() * pat.length)] % totalCols;
      notes.push({
        col,
        noteName: DECO_WHITE[col] || '',
        isBlack:  false,
        y:        -Math.random() * 200 - 40,
        h:        36 + Math.random() * 68,
        speed:    0.5 + Math.random() * 0.65,
        bright:   Math.random() > 0.5,
        alpha:    0.32 + Math.random() * 0.42,
      });
      patIdx++;
    };

    // Pre-seed
    for (let i = 0; i < 26; i++) {
      spawnNote();
      notes[notes.length - 1].y = Math.random() * (canvas.height || 600);
    }

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const totalCols = landedRef ? (window.__decoWhiteCount || 28) : 28;
      const colW = width / totalCols;
      const landZone = height - PIANO_DECO_H;

      if (frame % 13 === 0) spawnNote();

      // Reset landed set each frame, then re-populate
      if (landedRef) landedRef.current.clear();

      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.y += n.speed;

        // Remove when fully past bottom
        if (n.y > height + 80) {
          notes.splice(i, 1);
          continue;
        }

        // Mark as landing when bottom edge enters piano deco zone
        const bottomEdge = n.y + n.h;
        const isLanding  = bottomEdge > landZone && n.y < height;
        if (isLanding && landedRef) landedRef.current.add(n.noteName);

        const x = n.isBlack ? n.col * colW        : n.col * colW + 1.5;
        const w = n.isBlack ? 0.55 * colW         : colW - 3;

        // Fade out as it enters the deco zone
        let alpha = n.alpha;
        if (isLanding) {
          const overlap = bottomEdge - landZone;
          alpha *= Math.max(0, 1 - overlap / (PIANO_DECO_H * 0.8));
        }

        if (n.bright) {
          ctx.fillStyle    = '#c4a8ff';
          ctx.globalAlpha  = alpha;
          ctx.shadowColor  = '#9370db';
          ctx.shadowBlur   = 9;
        } else {
          ctx.fillStyle    = '#7c5cbf';
          ctx.globalAlpha  = alpha * 0.85;
          ctx.shadowBlur   = 0;
        }

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, n.y, w, n.h, 3);
        else ctx.rect(x, n.y, w, n.h);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      frame++;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (landedRef) landedRef.current.clear();
    };
  }, [landedRef]);

  return <canvas ref={canvasRef} className="hero-roll-canvas" />;
}

// ── Waveform bars ───────────────────────────────────────────────────────────
const WAVE_HEIGHTS = [0.2, 0.5, 0.8, 0.6, 1.0, 0.7, 0.4, 0.9, 0.5, 0.3,
                      0.8, 0.6, 1.0, 0.4, 0.7, 0.9, 0.5, 0.3, 0.8, 0.6];

function Waveform() {
  return (
    <div className="waveform-wrap" aria-hidden="true">
      {WAVE_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: `${Math.round(h * 52) + 8}px`,
            animationDelay: `${(i * 0.055).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Floating glyphs ─────────────────────────────────────────────────────────
const GLYPHS  = ['♩','♪','♫','♬','𝄞','♩','♪','𝄢'];
const GLYPH_X = [12, 25, 40, 55, 68, 80, 90, 48]; // % left

function FloatingGlyphs() {
  return (
    <div className="floating-glyphs" aria-hidden="true">
      {GLYPHS.map((g, i) => (
        <span
          key={i}
          className="float-glyph"
          style={{
            left:             `${GLYPH_X[i]}%`,
            bottom:           '8%',
            animationDelay:   `${i * 0.42}s`,
            animationDuration:`${2.4 + (i % 3) * 0.5}s`,
          }}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

// ── Piano key deco ──────────────────────────────────────────────────────────
// Layout for C2–B5 (4 octaves = 28 white keys, 20 black keys)
const DECO_OCTAVES = [2, 3, 4, 5];
const WHITE_PATTERN = ['C','D','E','F','G','A','B'];
// Black key offsets within each octave (fraction of white-key slot from left)
// null = no black key after that white key (E, B)
const BLACK_AFTER = [0.68, 0.65, null, 0.68, 0.66, 0.65, null];

const DECO_WHITE = DECO_OCTAVES.flatMap(oct => WHITE_PATTERN.map(n => `${n}${oct}`));
const DECO_BLACK = []; // { note, wi, offset }
DECO_OCTAVES.forEach((oct, oi) => {
  WHITE_PATTERN.forEach((_, i) => {
    const off = BLACK_AFTER[i];
    if (off !== null) {
      const sharpNames = ['C#','D#','','F#','G#','A#',''];
      const sharpName  = sharpNames[i];
      if (sharpName) DECO_BLACK.push({ note: `${sharpName}${oct}`, wi: oi * 7 + i, offset: off });
    }
  });
});

// Musical patterns (semitone offsets from C) to make animation look musical
const DECO_CHORDS = [
  [0, 4, 7],         // major
  [0, 3, 7],         // minor
  [0, 4, 7, 11],     // maj7
  [0, 3, 7, 10],     // min7
  [0, 2, 4, 7, 9],   // pentatonic
  [7, 11, 14],       // G major
  [9, 12, 16],       // A major
  [5, 9, 12],        // F major
];

const ALL_DECO_NOTES = [
  ...DECO_WHITE,
  ...DECO_BLACK.map(b => b.note),
];

function semitoneToDecoNote(semitone) {
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const name = noteNames[semitone % 12];
  const oct  = Math.floor(semitone / 12) + 2;
  return `${name}${oct}`;
}

function PianoDeco({ landedRef }) {
  const [pressed, setPressed] = useState(new Set());
  const totalWhite = DECO_WHITE.length;

  // Expose white key count so HeroPianoRoll can read it
  useEffect(() => { window.__decoWhiteCount = totalWhite; }, [totalWhite]);

  useEffect(() => {
    if (!landedRef) return;
    // Poll the RAF-written ref at 40ms — no React updates in the hot loop
    const id = setInterval(() => {
      const cols = landedRef.current;
      if (cols.size === 0) {
        setPressed(p => p.size === 0 ? p : new Set());
        return;
      }
      const keys = new Set([...cols].filter(Boolean));
      setPressed(prev => {
        // Shallow compare to avoid spurious renders
        if (prev.size === keys.size && [...keys].every(k => prev.has(k))) return prev;
        return keys;
      });
    }, 40);
    return () => clearInterval(id);
  }, [landedRef]);

  return (
    <div className="hero-piano-deco" aria-hidden="true">
      <div className="piano-deco-keys">
        {/* White keys */}
        {DECO_WHITE.map((key, i) => (
          <div
            key={key}
            className={`pdk-white${pressed.has(key) ? ' pdk-pressed' : ''}`}
            style={{ left: `${(i / totalWhite) * 100}%`, width: `${100 / totalWhite}%` }}
          />
        ))}
        {/* Black keys */}
        {DECO_BLACK.map(({ note, wi, offset }) => (
          <div
            key={note}
            className={`pdk-black${pressed.has(note) ? ' pdk-pressed' : ''}`}
            style={{
              left:  `${((wi + offset) / totalWhite) * 100}%`,
              width: `${(0.58 / totalWhite) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function CreateNewMusicbox() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [imagePreviews, setImagePreviews] = useState([]);
  const [pdfFile, setPdfFile]             = useState(null);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [loading, setLoading]             = useState(false);
  const [loadingStep, setLoadingStep]     = useState(0);
  const [error, setError]                 = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const [activeNotes, setActiveNotes]     = useState([]);
  const [pianoWidth, setPianoWidth]       = useState(0);
  const [openFaq, setOpenFaq]             = useState(null);

  const piano       = useRef(null);
  const pressedKeys = useRef(new Set());
  const pianoRef    = useRef(null);
  const uploadRef   = useRef(null);
  const landedRef   = useRef(new Set()); // shared between HeroPianoRoll and PianoDeco
  const navigate    = useNavigate();

  useEffect(() => {
    const sampler = new Tone.Sampler({
      urls: {
        A0:'A0.mp3', C1:'C1.mp3', 'D#1':'Ds1.mp3', 'F#1':'Fs1.mp3',
        A1:'A1.mp3', C2:'C2.mp3', 'D#2':'Ds2.mp3', 'F#2':'Fs2.mp3',
        A2:'A2.mp3', C3:'C3.mp3', 'D#3':'Ds3.mp3', 'F#3':'Fs3.mp3',
        A3:'A3.mp3', C4:'C4.mp3', 'D#4':'Ds4.mp3', 'F#4':'Fs4.mp3',
        A4:'A4.mp3', C5:'C5.mp3', 'D#5':'Ds5.mp3', 'F#5':'Fs5.mp3',
        A5:'A5.mp3', C6:'C6.mp3', 'D#6':'Ds6.mp3', 'F#6':'Fs6.mp3',
        A6:'A6.mp3', C7:'C7.mp3', 'D#7':'Ds7.mp3', 'F#7':'Fs7.mp3',
        A7:'A7.mp3', C8:'C8.mp3',
      },
      baseUrl:'https://tonejs.github.io/audio/salamander/',
    }).toDestination();
    piano.current = sampler;
    return () => sampler.dispose();
  }, []);

  useEffect(() => {
    if (!pianoRef.current) return;
    const ro = new ResizeObserver(e => setPianoWidth(Math.floor(e[0].contentRect.width)));
    ro.observe(pianoRef.current);
    setPianoWidth(Math.floor(pianoRef.current.clientWidth));
    return () => ro.disconnect();
  }, [loading]);

  const handleKeyDown = useCallback(e => {
    const note = KEY_MAP[e.key];
    if (note && piano.current && !pressedKeys.current.has(note)) {
      piano.current.triggerAttack(note);
      setActiveNotes(p => [...p, MidiNumbers.fromNote(note)]);
      pressedKeys.current.add(note);
    }
  }, []);

  const handleKeyUp = useCallback(e => {
    const note = KEY_MAP[e.key];
    if (note && piano.current) {
      piano.current.triggerRelease(note);
      setActiveNotes(p => p.filter(n => n !== MidiNumbers.fromNote(note)));
      pressedKeys.current.delete(note);
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

  const processFiles = files => {
    if (!files.length) return;
    const file = files[0];
    if (file.type === 'application/pdf') {
      if (imagePreviews.length > 0) { setError('Remove images first.'); return; }
      setPdfFile(file); setError(null); return;
    }
    if (file.type.startsWith('image/')) {
      if (pdfFile) { setError('Remove the PDF first.'); return; }
      const readers = Array.from(files).map(f =>
        new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(f); })
      );
      Promise.all(readers).then(results => {
        setImagePreviews(p => [...p, ...results]);
        setCurrentIndex(0); setError(null);
      });
      return;
    }
    setError('Unsupported file type. Upload PNG, JPG or PDF.');
  };

  const handleFileInput = e => { processFiles(Array.from(e.target.files)); e.target.value = null; };
  const handleDrop      = e => { e.preventDefault(); setDragOver(false); processFiles(Array.from(e.dataTransfer.files)); };
  const handleDragOver  = e => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const deleteImage = idx => {
    setImagePreviews(p => {
      const next = p.filter((_, i) => i !== idx);
      if (currentIndex >= next.length) setCurrentIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    setLoadingStep(0);
    const t1 = setTimeout(() => setLoadingStep(1), 4000);
    const t2 = setTimeout(() => setLoadingStep(2), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading]);

  const handleSubmit = async () => {
    setError(null);
    const formData = new FormData();
    let endpoint = '';
    if (pdfFile) {
      formData.append('pdf', pdfFile);
      endpoint = '/process-pdf';
    } else {
      imagePreviews.forEach((img, i) => formData.append('images', dataURItoBlob(img), `image${i}.png`));
      endpoint = '/process-images';
    }
    setLoading(true);
    try {
      const res  = await fetch(`http://localhost:3000${endpoint}`, { method:'POST', credentials:'include', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Processing failed.'); return; }
      setImagePreviews([]); setPdfFile(null);
      navigate('/musicbox', { state: { data } });
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onUnload = () => fetch('http://localhost:3000/delete-user-files', { method:'POST', credentials:'include' }).catch(()=>{});
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const hasFiles = imagePreviews.length > 0 || pdfFile;

  return (
    <div className="landing-root">
      {/* ── Nav ── */}
      <nav className="mb-nav">
        <div className="mb-nav-logo">MUSIC<span>BOX</span></div>
        <div className="mb-nav-links">
          <a href="#upload" className="mb-nav-link">Upload</a>
          <Link to="/chords" className="mb-nav-link">Chord Library</Link>
          <Link to="/learn" className="mb-nav-link">🎹 Learn Notation</Link>
          <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <HeroPianoRoll landedRef={landedRef} />
        <div className="hero-vignette" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-eyebrow">YOD-AI · Sheet Music Intelligence</div>
          <h1 className="hero-title">MUSICBOX</h1>
          <p className="hero-subtitle">
            Turn any sheet music image into playable MIDI —<br />
            rendered notation, piano roll, live playback.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => uploadRef.current?.scrollIntoView({ behavior:'smooth' })}>
              Upload Music
            </button>
            <Link to="/chords" className="btn-ghost">Chord Library <ArrowRight size={16} /></Link>
          </div>
        </div>
        <PianoDeco landedRef={landedRef} />
      </section>

      {/* ── Stats ── */}
      <div className="stats-strip">
        <div className="stat-item"><div className="stat-num">OMR</div><div className="stat-label">Optical Music Recognition</div></div>
        <div className="stat-item"><div className="stat-num">MIDI</div><div className="stat-label">Instant Conversion</div></div>
        <div className="stat-item"><div className="stat-num">88</div><div className="stat-label">Key Piano Playback</div></div>
        <div className="stat-item"><div className="stat-num">PDF</div><div className="stat-label">Multi-Page Support</div></div>
      </div>

      {/* ── How it works ── */}
      <section className="how-section">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to sound.</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <div className="step-icon"><FileText size={24} /></div>
            <div className="step-title">Upload Score</div>
            <p className="step-desc">Drop a PNG, JPG, or PDF of sheet music. Up to 10 pages, 20 MB max.</p>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <div className="step-icon"><Search size={24} /></div>
            <div className="step-title">OMR Conversion</div>
            <p className="step-desc">Our pipeline recognizes notes, rhythms, and accidentals via homr + music21.</p>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <div className="step-icon"><PianoIcon size={24} /></div>
            <div className="step-title">Play & Export</div>
            <p className="step-desc">Interactive notation, piano roll animation, Salamander piano sound. Download MIDI or MusicXML.</p>
          </div>
        </div>
      </section>

      {/* ── Upload ── */}
      <section className="upload-section" id="upload" ref={uploadRef}>
        <div className="upload-inner">
          <div className="section-label">Get Started</div>
          <h2 className="section-title" style={{ marginBottom:'1.5rem' }}>Upload Sheet Music</h2>

          <div
            className={`dropzone${dragOver ? ' dropzone--active' : ''}${hasFiles ? ' dropzone--has-files' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !hasFiles && document.getElementById('fileInput').click()}
          >
            {!hasFiles ? (
              <>
                <div className="dropzone-glyph">𝄞</div>
                <div className="dropzone-primary">Drop sheet music here</div>
                <div className="dropzone-secondary">or click to browse</div>
                <div className="dropzone-formats">PNG · JPG · PDF &nbsp;·&nbsp; Max 20 MB</div>
              </>
            ) : (
              <div className="file-preview">
                {pdfFile ? (
                  <div className="pdf-chip">
                    <FileText size={16} />
                    <span style={{ maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pdfFile.name}</span>
                    <button className="chip-remove" onClick={e => { e.stopPropagation(); setPdfFile(null); }}><X size={12} /></button>
                  </div>
                ) : (
                  <div className="thumb-row">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className={`thumb${i === currentIndex ? ' thumb--active' : ''}`}
                        onClick={e => { e.stopPropagation(); setCurrentIndex(i); }}>
                        <img src={src} alt={`Page ${i+1}`} />
                        <button className="thumb-remove" onClick={e => { e.stopPropagation(); deleteImage(i); }}><X size={12} /></button>
                      </div>
                    ))}
                    <button className="add-more" onClick={e => { e.stopPropagation(); document.getElementById('fileInput').click(); }}>+</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <input id="fileInput" type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileInput} />

          {error && <p className="mb-error">{error}</p>}

          {hasFiles && !loading && (
            <button
              className="btn-primary"
              style={{ marginTop:'1.25rem', width:'100%', fontSize:'1.15rem', padding:'1rem' }}
              onClick={handleSubmit}
            >
              Create Musicbox <ChevronRight size={18} />
            </button>
          )}

          {!hasFiles && !loading && (
            <div style={{ display:'flex', justifyContent:'center', marginTop:'1rem' }}>
              <button className="btn-ghost" onClick={() => document.getElementById('fileInput').click()}>
                Browse Files
              </button>
            </div>
          )}

          {/* ── Dynamic loading area ── */}
          {loading && (
            <div className="loading-area">
              {/* Animated top section */}
              <div className="loading-top">
                <FloatingGlyphs />
                <Waveform />
                <div className="loading-status">
                  <div className="loading-status-title">
                    {STEPS[loadingStep]?.label ?? 'Finalizing'}
                  </div>
                  <div className="loading-status-sub">
                    {STEP_SUBS[loadingStep] ?? 'Almost done…'}
                  </div>
                </div>
              </div>

              {/* Pipeline steps */}
              <div className="pipeline">
                {STEPS.map((step, i) => {
                  const done   = i < loadingStep;
                  const active = i === loadingStep;
                  return (
                    <div key={step.id} className={`pipe-cell${done ? ' done' : active ? ' active' : ''}`}>
                      <div className="pipe-row">
                        <div className="pipe-node">
                          {done
                            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3L11.5 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <span className="pipe-node-num">{String(i + 1).padStart(2, '0')}</span>
                          }
                          {active && <span className="pipe-node-ring" />}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className="pipe-line">
                            <div className="pipe-line-fill" style={{ width: done ? '100%' : '0%' }} />
                          </div>
                        )}
                      </div>
                      <div className="pipe-info">
                        <span className="pipe-icon"><step.Icon size={15} /></span>
                        <span className="pipe-label">{step.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Piano */}
              <div className="piano-wrapper" ref={pianoRef}>
                {pianoWidth > 0 && (
                  <Piano
                    noteRange={{ first: PIANO_FIRST, last: PIANO_LAST }}
                    playNote={midi => {
                      const note = MidiNumbers.getAttributes(midi).note;
                      piano.current?.triggerAttack(note);
                      setActiveNotes(p => [...p, midi]);
                    }}
                    stopNote={midi => {
                      const note = MidiNumbers.getAttributes(midi).note;
                      piano.current?.triggerRelease(note);
                      setActiveNotes(p => p.filter(n => n !== midi));
                    }}
                    activeNotes={activeNotes}
                    width={pianoWidth}
                  />
                )}
              </div>
              <div className="piano-note-hint">
                Do not close this tab — play piano while you wait!
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding:'5rem 2rem', maxWidth:680, margin:'0 auto', width:'100%' }}>
        <div className="section-label">FAQ</div>
        <h2 className="section-title" style={{ marginBottom:'1.5rem' }}>Common questions.</h2>
        <div className="faq-list">
          {FAQ.map((item, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' faq-item--open' : ''}`}>
              <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{item.q}</span>
                <span className="faq-arrow">{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && <p className="faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ── */}
      <section className="team-section">
        <div className="team-section-header">
          <div className="section-label">The Team</div>
          <h2 className="section-title">Built by.</h2>
          <p className="team-section-sub">
            Five engineers from Bilkent University — combining music theory,
            machine learning, and frontend craft.
          </p>
        </div>
        <div className="team-grid">
          {DEVS.map((dev, i) => (
            <article key={i} className="dev-card">
              {/* Index number */}
              <span className="dev-index">0{i + 1}</span>

              {/* Avatar */}
              <div className="dev-avatar">
                <img src={dev.image} alt={dev.name} onError={e => { e.target.style.display='none'; }} />
                <div className="dev-initials">{dev.name.split(' ').map(w => w[0]).join('')}</div>
                <div className="dev-avatar-ring" />
              </div>

              {/* Info */}
              <div className="dev-info">
                <div className="dev-role">{dev.role}</div>
                <h3 className="dev-name">{dev.name}</h3>
                <p className="dev-bio">{dev.bio}</p>
              </div>

              {/* Links */}
              <div className="dev-links">
                <a
                  href={dev.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dev-link dev-link--li"
                  aria-label={`${dev.name} LinkedIn`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
                {dev.github && (
                  <a
                    href={dev.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-link dev-link--gh"
                    aria-label={`${dev.name} GitHub`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                )}
              </div>

              {/* Hover glow */}
              <div className="dev-card-glow" />
            </article>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <div className="footer-logo">MUSICBOX</div>
        <div className="footer-tech">Powered by homr · music21 · VexFlow · Tone.js · YOD-AI</div>
      </footer>
    </div>
  );
}

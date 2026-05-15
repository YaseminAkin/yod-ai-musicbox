import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as Tone from 'tone';

const FIRST        = 21;  // A0
const LAST         = 108; // C8
const LOOKAHEAD    = 2.5;
const ROLL_H_DEFAULT = 180;

const WHITE_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
const TOTAL_WHITE   = 52;

const ROLL_POS = new Map();
{
  let wc = 0;
  for (let m = FIRST; m <= LAST; m++) {
    const isW = WHITE_CLASSES.has(m % 12);
    ROLL_POS.set(m, { isWhite: isW, wi: wc });
    if (isW) wc++;
  }
}

export default function PianoRoll({ noteQueue, isPlaying, pausedAt, fillContainer = false, isDark = true }) {
  const ROLL_H = ROLL_H_DEFAULT;
  const wrapperRef = useRef(null);
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const stateRef   = useRef({ noteQueue, isPlaying, pausedAt, isDark });

  stateRef.current = { noteQueue, isPlaying, pausedAt, isDark };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas  = canvasRef.current;
    if (!wrapper || !canvas) return;
    const sync = (w, h) => {
      canvas.width  = Math.floor(w) || 800;
      canvas.height = Math.floor(h) || ROLL_H;
    };
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      sync(width, height);
    });
    ro.observe(wrapper);
    const rect = wrapper.getBoundingClientRect();
    sync(rect.width, fillContainer ? rect.height : ROLL_H);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillContainer]);

  // ── Hand assignment ──────────────────────────────────────────────────────────
  // Returns a Map<note_index, 'rh'|'lh'> computed once when noteQueue changes.
  // Strategy:
  //   • If MIDI has ≥2 tracks: track 0 → RH, track 1 → LH (standard convention).
  //   • If single track: compute median MIDI pitch; notes ≥ median → RH, < median → LH.
  //     (Handles arrangements where both hands are merged into one track.)
  const handMapRef = useRef(new Map());
  useEffect(() => {
    const q = stateRef.current.noteQueue;
    const map = new Map();
    const tracks = new Set(q.map(n => n.track ?? 0));
    if (tracks.size >= 2) {
      q.forEach((n, i) => map.set(i, (n.track ?? 0) === 0 ? 'rh' : 'lh'));
    } else {
      const sorted = [...q].map(n => n.midi).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 60;
      q.forEach((n, i) => map.set(i, n.midi >= median ? 'rh' : 'lh'));
    }
    handMapRef.current = map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateRef.current.noteQueue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Colour palette (purple theme)
    // RH — violet/lavender
    const RH_BASE   = 'rgba(167,139,250,0.78)';  // violet-400
    const RH_ACTIVE = '#e879f9';                   // fuchsia-400
    const RH_GLOW   = '#c084fc';                   // purple-400
    // LH — indigo/blue
    const LH_BASE   = 'rgba(99,102,241,0.72)';    // indigo-500
    const LH_ACTIVE = '#818cf8';                   // indigo-400
    const LH_GLOW   = '#6366f1';                   // indigo-500

    const draw = () => {
      const { noteQueue: q, isPlaying: playing, pausedAt: paused, isDark: dark } = stateRef.current;
      const t   = playing ? Tone.Transport.seconds : paused;
      const W   = canvas.width;
      const H   = canvas.height;
      const wkw = W / TOTAL_WHITE;
      const PPS = H / LOOKAHEAD;

      if (W === 0) { rafRef.current = requestAnimationFrame(draw); return; }

      ctx.fillStyle = dark ? '#0d0a1a' : '#f0ecfc';
      ctx.fillRect(0, 0, W, H);

      // Octave separators at each C
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      for (let m = FIRST; m <= LAST; m++) {
        if (m % 12 === 0) {
          const rp = ROLL_POS.get(m);
          if (!rp) continue;
          const x = rp.wi * wkw;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
      }

      // Notes
      const hm = handMapRef.current;
      q.forEach((note, i) => {
        const noteBottom = H - (note.time - t) * PPS;
        const noteH      = Math.max(note.duration * PPS, 4);
        const noteTop    = noteBottom - noteH;

        if (noteBottom < -4 || noteTop > H + 4) return;

        const rp = ROLL_POS.get(note.midi);
        if (!rp) return;

        let nx, nw;
        if (rp.isWhite) {
          nw = wkw * 0.88;
          nx = rp.wi * wkw + (wkw - nw) / 2;
        } else {
          nw = wkw * 0.62;
          nx = rp.wi * wkw - nw / 2;
        }

        const drawT = Math.max(noteTop, 0);
        const drawB = Math.min(noteBottom, H);
        const drawH = drawB - drawT;
        if (drawH <= 0) return;

        const active = note.time <= t && note.time + note.duration > t;
        const isRH   = hm.get(i) !== 'lh';

        if (active) {
          ctx.shadowColor = isRH ? RH_GLOW : LH_GLOW;
          ctx.shadowBlur  = 12;
          ctx.fillStyle   = isRH ? RH_ACTIVE : LH_ACTIVE;
          ctx.globalAlpha = 1;
        } else {
          ctx.shadowBlur  = 0;
          ctx.fillStyle   = isRH ? RH_BASE : LH_BASE;
          ctx.globalAlpha = 0.85;
        }

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(nx, drawT, nw, drawH, 2);
          ctx.fill();
        } else {
          ctx.fillRect(nx, drawT, nw, drawH);
        }
      });

      ctx.shadowBlur  = 0;
      ctx.globalAlpha = 1;

      // Trigger line
      const grad = ctx.createLinearGradient(0, H - 5, 0, H);
      grad.addColorStop(0, 'rgba(196,168,255,0.95)');
      grad.addColorStop(1, 'rgba(124,92,191,0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - 5, W, 5);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: fillContainer ? '100%' : `${ROLL_H}px`, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: fillContainer ? '100%' : `${ROLL_H}px` }}
      />
    </div>
  );
}

PianoRoll.propTypes = {
  noteQueue:     PropTypes.array.isRequired,
  isPlaying:     PropTypes.bool.isRequired,
  pausedAt:      PropTypes.number.isRequired,
  fillContainer: PropTypes.bool,
  isDark:        PropTypes.bool,
};

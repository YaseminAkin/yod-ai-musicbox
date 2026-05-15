import { useEffect, useRef } from 'react';
import Vex from 'vexflow';

const { Renderer, Stave, StaveNote, Formatter, Voice, Accidental } = Vex.Flow;

// notes: [{ keys: string[], duration?: string, accidental?: '#'|'b'|'n', highlight?: bool }]
// duration defaults to 'q'. Rests use duration like 'wr','hr','qr','8r'.
const LessonNotation = ({ clef = 'treble', notes = [], timeSignature, width = 380, height = 140 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
    containerRef.current.innerHTML = '';

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(width, height);
    // SVG defaults to overflow:hidden — allow stems/ledger lines outside the viewbox
    const svgEl = containerRef.current.querySelector('svg');
    if (svgEl) svgEl.setAttribute('overflow', 'visible');
    const context = renderer.getContext();
    context.setFont('Arial', 10);

    const staveX = 8;
    // staveY=5 → VexFlow places first stave line at y≈45, bottom line at y≈85, C4 at y≈95 — fits in smallest containers (h=110)
    const staveY = 5;
    const staveWidth = width - 16;

    const stave = new Stave(staveX, staveY, staveWidth);
    stave.addClef(clef);
    if (timeSignature) stave.addTimeSignature(timeSignature);
    stave.setContext(context).draw();

    if (notes.length === 0) return;

    const vexNotes = notes.map((n) => {
      const dur = n.duration ?? 'q';
      const isRest = dur.endsWith('r');
      const vexNote = new StaveNote({
        keys: n.keys,
        duration: dur,
        clef,
        ...(isRest ? {} : { auto_stem: true }),
      });
      if (n.accidental) {
        vexNote.addModifier(new Accidental(n.accidental), 0);
      }
      if (n.highlight) {
        vexNote.setStyle({ fillStyle: '#7C3AED', strokeStyle: '#7C3AED' });
      }
      return vexNote;
    });

    const voice = new Voice({ num_beats: 4, beat_value: 4 });
    voice.setMode(Voice.Mode.SOFT);
    voice.addTickables(vexNotes);

    new Formatter().format([voice], staveWidth - 50);
    voice.draw(context, stave);
    } catch (err) {
      console.error('[LessonNotation] VexFlow error:', err?.message, { clef, notes, width, height });
    }
  }, [clef, JSON.stringify(notes), timeSignature, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, background: 'transparent' }}
    />
  );
};

export default LessonNotation;

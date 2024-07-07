import React, { useEffect, useRef } from 'react';
import Vex from 'vexflow';
import { xml2json } from 'xml-js';

const { Renderer, Stave, StaveNote, Formatter, Voice, Beam } = Vex.Flow;

const MusicNotation = ({ musicXML }) => {
  const containerRef = useRef(null);

  const durationMapping = {
    'whole': 'w',
    'half': 'h',
    'quarter': 'q',
    'eighth': '8',
    '16th': '16',
    '32nd': '32',
    '64th': '64'
  };

  useEffect(() => {
    if (!musicXML) return;

    // Clear the previous content
    containerRef.current.innerHTML = '';

    // Convert MusicXML to JSON
    const musicJSON = JSON.parse(xml2json(musicXML, { compact: true, spaces: 4 }));

    // Set up VexFlow
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const width = 800;
    const height = 400; // Adjust height dynamically if necessary
    const padding = 10;
    const staveWidth = width - 2 * padding;

    // Calculate height dynamically based on the number of measures
    const measures = musicJSON['score-partwise'].part.measure;
    const rows = Math.ceil(measures.length / 2); // 2 measures per row for simplicity
    renderer.resize(width, rows * height + padding * 2);
    const context = renderer.getContext();

    let x = padding;
    let y = padding;

    // Extract notes from musicJSON
    measures.forEach((measure, index) => {
      if (x + staveWidth > width - padding) {
        x = padding;
        y += height;
      }

      const stave = new Stave(x, y, staveWidth);
      if (index === 0) {
        stave.addClef('treble').addTimeSignature('4/4');
      }
      stave.setContext(context).draw();

      const notes = [];
      const measureNotes = Array.isArray(measure.note) ? measure.note : [measure.note];
      measureNotes.forEach(note => {
        const pitch = note.pitch;
        const rest = note.rest;
        const chord = note.chord;
        const keys = [];
        if (pitch) {
          const step = pitch.step._text.toLowerCase();
          const octave = pitch.octave._text;
          keys.push(`${step}/${octave}`);
        }
        if (rest) {
          keys.push('b/4');
        }
        if (keys.length > 0) {
          const duration = note.type ? durationMapping[note.type._text] : 'q'; // Default to quarter if type is missing
          const staveNote = new StaveNote({
            keys: keys,
            duration: duration,
          });
          if (chord) {
            staveNote.addModifier(new Vex.Flow.Annotation("a").setVerticalJustification(3), 0);
          }
          notes.push(staveNote);
        }
      });

      const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables(notes);
      new Formatter().joinVoices([voice]).format([voice], staveWidth - 50);
      voice.draw(context, stave);

      x += staveWidth + padding; // Move to the next measure position
    });
  }, [musicXML]);

  return <div ref={containerRef}></div>;
};

export default MusicNotation;

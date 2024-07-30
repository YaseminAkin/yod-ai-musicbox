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
    const width = 760;
    const height = 100; // Adjust height dynamically if necessary
    const padding = 50;
    const staveWidth = (width - (1.1 *padding));
    const measureWidth = staveWidth / 2 - 40;

    // Calculate height dynamically based on the number of measures
    const measures = musicJSON['score-partwise'].part.measure;
    const rows = Math.ceil(measures.length / 2); //Her satır için 2 measure alıcaz
    renderer.resize(width, rows * (height * 2) + padding);
    const context = renderer.getContext();

    let x = padding;
    let y = padding;

    Vex.Flow.Stem.DOWN;

    // Extract notes from musicJSON
    //MEASURE YAZILDIĞI YER!
    measures.forEach((measure, index) => {
      //Separate the measures
      //Draw a line (vertical)
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + height);
      context.stroke();

      // If the stave is full, move to the next row.
      if (x  > width - padding) {
        x = padding;
        y += height * 2;
      }

      //Stave -> Nota çizgisi
      const stave = new Stave(x, y, staveWidth);
      const stave2 = new Stave(x, y + height, staveWidth);
      if (index === 0) {
        stave.addClef('treble').addTimeSignature('4/4'); //Burası sıkıntılı??? 4/2 de
        stave2.addClef('bass').addTimeSignature('4/4');
      }
      else if (index % 2 === 0) {
        stave.addClef('treble');
        stave2.addClef('bass');
      }
      stave.setContext(context).draw();
      stave2.setContext(context).draw();

      const notes = [];
      const beams = [];
      const measureNotes = Array.isArray(measure.note) ? measure.note : [measure.note];

      measureNotes.forEach(note => {
        const staff = note.staff;
        if(staff._text == 1){ //EĞER İLK NOTA ÇİZGİSİNDEYSE YAZDIR ŞİMDİ
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
          //Printlenecek data
          if (keys.length > 0) {
            const duration = note.type ? durationMapping[note.type._text] : 'q'; // Default to quarter if type is missing
            const actualDuration = rest ? `${note.duration._text}r` : duration;
            let stemDirection = Vex.Flow.Stem.UP;
            if(pitch){
              const stemDir = String(note.stem._text).toUpperCase();
              stemDirection = Vex.Flow.Stem[stemDir];
            }
            const staveNote = new StaveNote({
              keys: keys,
              duration: actualDuration,
              stem_direction: stemDirection
            });
            if (chord) {
              staveNote.addModifier(new Vex.Flow.Annotation("a").setVerticalJustification(3), 0);
            }
            //Print the note
            notes.push(staveNote);
            if (duration === '8' || duration === '16' || duration === '32' || duration === '64') {
              beams.push(staveNote);
            }
          }
        }
      });//Notaların basılmasının bitişi

      const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables(notes);
      new Formatter().joinVoices([voice]).format([voice], measureWidth);
      voice.draw(context, stave);

      /*if (beams.length > 1) {
        const beam = new Beam(beams);
        beam.setContext(context).draw();
      }*/

      x += measureWidth + padding; // Move to the next measure position
    });//Bir measure'ın bitişi
  }, [musicXML]);

  return (
    <div
      id="scrollable-container"
      style={{ width: '760px', height: '400px', overflow: 'auto', overflowX: 'hidden', border: '2px solid black'  }}
    >
      <div id="rendering-area" ref={containerRef}
      style={{marginLeft: '-40px', marginTop: '-80px'}}></div>
    </div>
  );
};

export default MusicNotation;
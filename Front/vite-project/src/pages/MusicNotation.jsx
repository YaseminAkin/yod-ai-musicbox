import { useEffect, useRef } from 'react';
import Vex from 'vexflow';
import { xml2json } from 'xml-js';

const { Renderer, Stave, StaveNote, Formatter, Voice, Beam } = Vex.Flow;

// eslint-disable-next-line react/prop-types
const MusicNotation = ({ musicXML, currentTime = 0, midiDuration = 0 }) => {
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

    let currentActiveY = -1;

    containerRef.current.innerHTML = '';

    const musicJSON = JSON.parse(xml2json(musicXML, { compact: true, spaces: 4 }));

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const width = 760;
    const height = 100;
    const padding = 50;
    const staveWidth = (width - (1.1 * padding));
    const measureWidth = staveWidth / 2 - 40;

    const measures = musicJSON['score-partwise'].part.measure;
    const rows = Math.ceil(measures.length / 2);
    renderer.resize(width, rows * (height * 2) + padding + 40);
    const context = renderer.getContext();

    // Parse time signature and divisions from MusicXML structure
    let divisions = 4;
    let beatsPerMeasure = 4;
    let beatType = 4;

    measures.forEach(m => {
      if (m.attributes) {
        if (m.attributes.divisions?._text) divisions = parseInt(m.attributes.divisions._text);
        if (m.attributes.time?.beats?._text) beatsPerMeasure = parseInt(m.attributes.time.beats._text);
        if (m.attributes.time?.['beat-type']?._text) beatType = parseInt(m.attributes.time['beat-type']._text);
      }
    });

    // Derive tempo from MIDI duration — avoids unreliable MusicXML tempo parsing
    // totalBeats = total quarter-note beats in the piece
    const totalMeasures = measures.length;
    const totalBeats = totalMeasures * beatsPerMeasure * (4 / beatType);
    const tempo = midiDuration > 0 ? (totalBeats * 60 / midiDuration) : 120;
    const secondsPerDivision = 60 / (tempo * divisions);
    const measureDuration = midiDuration > 0 ? (midiDuration / totalMeasures) : (beatsPerMeasure * (4 / beatType) * 60 / 120);

    // 3-state note style picker
    const noteStyle = (noteStart, noteEnd) => {
      if (currentTime <= 0) return null; // not playing — default VexFlow black
      if (currentTime >= noteEnd) return { fillStyle: 'rgba(0,0,0,0.85)', strokeStyle: 'rgba(0,0,0,0.85)' };
      if (currentTime >= noteStart) return { fillStyle: 'rgba(196,124,255,1)', strokeStyle: 'rgba(196,124,255,1)' };
      return { fillStyle: 'rgba(0,0,0,0.2)', strokeStyle: 'rgba(0,0,0,0.2)' };
    };

    let measureStartTime = 0;
    let x = padding;
    let y = padding;

    Vex.Flow.Stem.DOWN;

    measures.forEach((measure, index) => {
      if (x > width - padding) {
        x = padding;
        y += height * 2;
      }

      const stave = new Stave(x, y, staveWidth);
      const stave2 = new Stave(x, y + height, staveWidth);
      if (index === 0) {
        stave.addClef('treble');
        stave2.addClef('bass');
      } else if (index % 2 === 0) {
        stave.addClef('treble');
        stave2.addClef('bass');
      }
      stave.setContext(context).draw();
      stave2.setContext(context).draw();

      const staff1 = [];
      const staff2 = [];
      const notes = [];
      const notes2 = [];
      let beams = [];
      let totalBeams = [];
      let beam1Count = 0;
      let beams2 = [];
      let totalBeams2 = [];
      let beam2Count = 0;

      const measureNotes = Array.isArray(measure.note) ? measure.note : [measure.note];
      measureNotes.forEach(note => {
        if (note && note.staff && note.staff._text == '1') staff1.push(note);
        else if (note && note.staff && note.staff._text == '2') staff2.push(note);
      });

      let staff1Time = measureStartTime;
      let staff2Time = measureStartTime;

      // Staff 1
      staff1.forEach((note, indexx) => {
        const pitch = note.pitch;
        const rest = note.rest;
        const chord = note.chord;

        const noteDivisions = parseInt(note.duration?._text || String(divisions));
        const noteStart = staff1Time;
        const noteEnd = noteStart + noteDivisions * secondsPerDivision;
        if (!chord) staff1Time = noteEnd;

        const keys = [];
        if (pitch) {
          const step = pitch.step._text.toLowerCase();
          const octave = pitch.octave._text;
          keys.push(`${step}/${octave}`);
        }
        if (rest) keys.push('b/4');

        if (keys.length > 0) {
          const duration = note.type ? durationMapping[note.type._text] : 'q';
          let actualDuration = rest ? `${duration}r` : duration;
          if (rest) {
            let dd = note.duration._text;
            if (!['4','2','1','8','16','32','64'].includes(dd)) dd = '4';
            actualDuration = `${dd}r`;
          }
          console.log(actualDuration);
          let stemDirection = Vex.Flow.Stem.UP;
          if (pitch) {
            const stemDir = note.stem?._text ? String(note.stem._text).toUpperCase() : 'UP';
            stemDirection = Vex.Flow.Stem[stemDir] ?? Vex.Flow.Stem.UP;
          }
          if (staff1[indexx + 1] && staff1[indexx + 1].chord && staff1[indexx + 1].staff?._text == '1') {
            const pitchh = staff1[indexx + 1].pitch;
            keys.push(`${pitchh.step._text.toLowerCase()}/${pitchh.octave._text}`);
          }

          const staveNote = new StaveNote({ keys, duration: actualDuration, stem_direction: stemDirection });

          // Apply 3-state style to pitched notes (not rests, not chord notes already handled)
          if (pitch && !chord) {
            const style = noteStyle(noteStart, noteEnd);
            if (style) staveNote.setStyle(style);
            if (currentTime >= noteStart && currentTime < noteEnd && currentActiveY < 0) currentActiveY = y;
          }

          if (chord) return;

          const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
          if (lastNote && lastNote.duration !== actualDuration || (actualDuration === 'qr') || (lastNote && lastNote.stem_direction !== stemDirection)) {
            if (beams.length > 1) {
              totalBeams[beam1Count] = [];
              for (let i = 0; i < beams.length; i++) {
                totalBeams[beam1Count].push(beams[i]);
                notes[notes.length - (1 + i)].setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
              }
              beam1Count++;
              beams = [];
            } else {
              beams = [];
            }
          }
          notes.push(staveNote);
          if (['8','16','32','64'].includes(duration)) beams.push(staveNote);
        }
      });

      // Staff 2
      if (staff2.length > 0) {
        staff2.forEach((note, indexx) => {
          const pitch = note.pitch;
          const rest = note.rest;
          const chord = note.chord;

          const noteDivisions = parseInt(note.duration?._text || String(divisions));
          const noteStart = staff2Time;
          const noteEnd = noteStart + noteDivisions * secondsPerDivision;
          if (!chord) staff2Time = noteEnd;

          const keys = [];
          if (pitch) {
            const step = pitch.step._text.toLowerCase();
            const octave = pitch.octave._text;
            keys.push(`${step}/${octave}`);
          }
          if (rest) keys.push('b/2');

          if (keys.length > 0) {
            const duration = note.type ? durationMapping[note.type._text] : 'q';
            let actualDuration = rest ? `${duration}r` : duration;
            if (rest) {
              let dd = note.duration._text;
              if (!['4','2','1','8','16','32','64'].includes(dd)) dd = '4';
              actualDuration = `${dd}r`;
            }
            let stemDirection = Vex.Flow.Stem.UP;
            if (pitch) {
              const stemDir = note.stem?._text ? String(note.stem._text).toUpperCase() : 'UP';
              stemDirection = Vex.Flow.Stem[stemDir] ?? Vex.Flow.Stem.UP;
            }
            if (staff2[indexx + 1] && staff2[indexx + 1].chord && staff2[indexx + 1].staff?._text == '2') {
              const pitchh = staff2[indexx + 1].pitch;
              keys.push(`${pitchh.step._text.toLowerCase()}/${pitchh.octave._text}`);
            }

            const staveNote = new StaveNote({ keys, duration: actualDuration, clef: 'bass', stem_direction: stemDirection });

            if (pitch && !chord) {
              const style = noteStyle(noteStart, noteEnd);
              if (style) staveNote.setStyle(style);
              if (currentTime >= noteStart && currentTime < noteEnd && currentActiveY < 0) currentActiveY = y;
            }

            if (chord) return;

            const lastNote = notes2.length > 0 ? notes2[notes2.length - 1] : null;
            if (lastNote && lastNote.duration !== actualDuration || (actualDuration === 'qr') || rest || (lastNote && lastNote.stem_direction !== stemDirection)) {
              if (beams2.length > 1) {
                totalBeams2[beam2Count] = [];
                for (let i = 0; i < beams2.length; i++) {
                  totalBeams2[beam2Count].push(beams2[i]);
                  notes2[notes2.length - (1 + i)].setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
                }
                beam2Count++;
                beams2 = [];
              } else {
                beams2 = [];
              }
            }
            notes2.push(staveNote);
            if (['8','16','32','64'].includes(duration)) beams2.push(staveNote);
          }
        });
      }

      for (let i = 0; i < beams.length; i++) {
        notes[notes.length - (1 + i)].setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
      }
      for (let i = 0; i < beams2.length; i++) {
        notes2[notes2.length - (1 + i)].setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
      }

      try {
        const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables(notes);
        new Formatter().joinVoices([voice]).format([voice], measureWidth);
        voice.draw(context, stave);
      } catch (error) { /* ignore formatting errors */ }

      try {
        const voice2 = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables(notes2);
        new Formatter().joinVoices([voice2]).format([voice2], measureWidth);
        voice2.draw(context, stave2);
      } catch (error) { /* ignore formatting errors */ }

      if (beams.length > 1) new Beam(beams).setContext(context).draw();
      if (beams2.length > 1) new Beam(beams2).setContext(context).draw();
      if (beam1Count > 0) {
        for (let i = 0; i < beam1Count; i++) new Beam(totalBeams[i]).setContext(context).draw();
      }
      if (beam2Count > 0) {
        for (let i = 0; i < beam2Count; i++) new Beam(totalBeams2[i]).setContext(context).draw();
      }

      x += measureWidth + padding;
      measureStartTime += measureDuration;
    });

    if (currentActiveY >= 0 && containerRef.current) {
      const container = containerRef.current.parentElement;
      if (container) container.scrollTop = Math.max(0, currentActiveY - 60);
    }
  }, [musicXML, currentTime]);

  return (
    <div
      id="scrollable-container"
      style={{ width: '760px', height: '420px', overflow: 'auto', overflowX: 'hidden', border: '2px solid black' }}
    >
      <div id="rendering-area" ref={containerRef}
        style={{ marginLeft: '-40px', marginTop: '-40px' }}>
      </div>
    </div>
  );
};

export default MusicNotation;

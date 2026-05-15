import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as Tone from 'tone';
import { Piano, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';

// Props:
//   firstNote: string like 'A3'
//   lastNote: string like 'C6'
//   onNotePlayed: (noteName: string) => void
//   highlightedKeys: number[] (midi numbers to highlight as hint)
//   width: number
//
// Ref methods: { playNote(noteName) }
const LessonPiano = forwardRef(function LessonPiano(
  { firstNote = 'A3', lastNote = 'C6', onNotePlayed, highlightedKeys = [], width = 700 },
  ref
) {
  const [piano, setPiano] = useState(null);
  const [activeNotes, setActiveNotes] = useState([]);
  const pressedKeys = useRef(new Set());

  useEffect(() => {
    const sampler = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
        A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
        A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
        A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
        A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
        A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
        A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
        A7: 'A7.mp3', C8: 'C8.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination();
    setPiano(sampler);
    return () => sampler.dispose();
  }, []);

  // Expose playNote to parent via ref
  useImperativeHandle(ref, () => ({
    playNote(noteName, toneDuration = '2n') {
      if (piano) piano.triggerAttackRelease(noteName, toneDuration);
    },
  }), [piano]);

  const handlePlayNote = (midiNumber) => {
    if (!piano) return;
    const noteName = MidiNumbers.getAttributes(midiNumber).note;
    piano.triggerAttack(noteName);
    setActiveNotes((prev) => [...prev, midiNumber]);
    onNotePlayed?.(noteName);
  };

  const handleStopNote = (midiNumber) => {
    if (!piano) return;
    const noteName = MidiNumbers.getAttributes(midiNumber).note;
    piano.triggerRelease(noteName);
    setActiveNotes((prev) => prev.filter((n) => n !== midiNumber));
  };

  const keyMap = {
    a: 'A3', w: 'A#3', s: 'B3', d: 'C4', r: 'C#4', f: 'D4',
    t: 'D#4', g: 'E4', h: 'F4', u: 'F#4', j: 'G4', i: 'G#4',
    k: 'A4', o: 'A#4', l: 'B4', ';': 'C5', '[': 'C#5', "'": 'D5',
    z: 'D#5', x: 'E5', c: 'F5', v: 'F#5', b: 'G5', n: 'G#5', m: 'A5',
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      const note = keyMap[e.key];
      if (!note || !piano || pressedKeys.current.has(note)) return;
      pressedKeys.current.add(note);
      piano.triggerAttack(note);
      const midi = MidiNumbers.fromNote(note);
      setActiveNotes((prev) => [...prev, midi]);
      onNotePlayed?.(note);
    };
    const onKeyUp = (e) => {
      const note = keyMap[e.key];
      if (!note || !piano) return;
      pressedKeys.current.delete(note);
      piano.triggerRelease(note);
      setActiveNotes((prev) => prev.filter((n) => n !== MidiNumbers.fromNote(note)));
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [piano]);

  const first = MidiNumbers.fromNote(firstNote);
  const last = MidiNumbers.fromNote(lastNote);
  const allActive = [...new Set([...activeNotes, ...highlightedKeys])];

  return (
    <div className="w-full flex justify-center">
      <Piano
        noteRange={{ first, last }}
        playNote={handlePlayNote}
        stopNote={handleStopNote}
        activeNotes={allActive}
        width={width}
      />
    </div>
  );
});

export default LessonPiano;

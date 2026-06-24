export interface Sound {
  id: string;
  name: string;
  icon: string;
  desc: string;
  playStart: (ctx: AudioContext) => void;
  playEnd: (ctx: AudioContext) => void;
}

export function playTones(
  ctx: AudioContext,
  freqs: number[],
  type: OscillatorType,
  dur: number,
  gap: number,
  vol: number
) {
  freqs.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = type;
    o.frequency.value = freq;
    const s = ctx.currentTime + i * gap;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(vol, s + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, s + dur);
    o.start(s);
    o.stop(s + dur);
  });
}

export const SOUNDS: Sound[] = [
  {
    id: 'chord',
    name: 'Chord',
    icon: '🎵',
    desc: 'Gentle C-E-G',
    playStart: (c) => playTones(c, [523, 659, 784], 'sine', 0.55, 0.2, 0.15),
    playEnd: (c) => playTones(c, [784, 659, 523, 392], 'sine', 0.7, 0.2, 0.15),
  },
  {
    id: 'bell',
    name: 'Bell',
    icon: '🔔',
    desc: 'Crystal bell',
    playStart: (c) => playTones(c, [880, 1100], 'sine', 1.2, 0.3, 0.12),
    playEnd: (c) => playTones(c, [1100, 880, 660], 'sine', 1.4, 0.35, 0.12),
  },
  {
    id: 'soft',
    name: 'Soft',
    icon: '🌊',
    desc: 'Warm sine fade',
    playStart: (c) => playTones(c, [330, 415, 494], 'sine', 0.8, 0.35, 0.1),
    playEnd: (c) => playTones(c, [494, 415, 330, 247], 'sine', 1.0, 0.4, 0.1),
  },
  {
    id: 'pop',
    name: 'Pop',
    icon: '✨',
    desc: 'Quick staccato',
    playStart: (c) => playTones(c, [600, 800, 1000], 'triangle', 0.18, 0.08, 0.18),
    playEnd: (c) => playTones(c, [1000, 750, 500], 'triangle', 0.2, 0.09, 0.18),
  },
  {
    id: 'deep',
    name: 'Deep',
    icon: '🎶',
    desc: 'Low warm tones',
    playStart: (c) => playTones(c, [130, 164, 196], 'sine', 0.9, 0.3, 0.13),
    playEnd: (c) => playTones(c, [196, 164, 130, 98], 'sine', 1.1, 0.35, 0.13),
  },
];

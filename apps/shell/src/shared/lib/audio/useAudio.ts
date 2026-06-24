import { useRef } from 'react';
import { SOUNDS } from './sounds';

export function useAudio(soundId: string) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const sound = SOUNDS.find((s) => s.id === soundId) || SOUNDS[0];

  return {
    playStart: () => sound.playStart(getCtx()),
    playEnd: () => sound.playEnd(getCtx()),
    preview: (id: string) => {
      const s = SOUNDS.find((x) => x.id === id) || SOUNDS[0];
      s.playStart(getCtx());
    },
  };
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { WORK, REST, CIRC } from '../../shared/config/timer';

export interface Task {
  id: number | string;
  text: string;
  done: boolean;
  pomos: number;
  source?: string;
  habType?: 'daily' | 'todo';
}

export interface StateRef {
  tasks: Task[];
  activeId: number | string | null;
  isWork: boolean;
  elapsed: number;
  pomos: number;
}

export function useTimer(
  stateRef: React.MutableRefObject<StateRef>,
  audio: { playStart: () => void; playEnd: () => void },
  setTl: (fn: (prev: number) => number) => void,
  setRunning: (fn: (prev: boolean) => boolean) => void,
  setIsWork: (fn: (prev: boolean) => boolean) => void,
  setElapsed: (fn: (prev: number) => number) => void,
  setPomos: (fn: (prev: number) => number) => void,
  setTasks: (fn: (prev: Task[]) => Task[]) => void,
  setActiveId: (fn: (prev: number | string | null) => number | string | null) => void
) {
  const [tl, setTlState] = useState(WORK);
  const [running, setRunningState] = useState(false);
  const [isWork, setIsWorkState] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const tick = useCallback(() => {
    setTl((prev) => {
      const s = stateRef.current;
      if (s.isWork) setElapsed((e) => e + 1);
      if (prev <= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunningState(false);
        audio.playEnd();
        if (s.isWork) {
          setPomos((p) => p + 1);
          if (s.activeId) {
            setTasks((ts) =>
              ts.map((t) =>
                t.id === s.activeId ? { ...t, pomos: (t.pomos || 0) + 1 } : t
              )
            );
          }
          setIsWorkState(false);
          return REST;
        } else {
          setIsWorkState(true);
          return WORK;
        }
      }
      return prev - 1;
    });
  }, [audio, setTl, setElapsed, setPomos, setTasks, setActiveId, stateRef]);

  const toggleTimer = () => {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunningState(false);
    } else {
      audio.playStart();
      setRunningState(true);
      intervalRef.current = setInterval(tick, 1000);
    }
  };

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunningState(false);
    setIsWorkState(true);
    setTl(() => WORK);
  };

  const skipPhase = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunningState(false);
    setIsWorkState((w) => !w);
    setTl(() => (isWork ? REST : WORK));
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    tl,
    running,
    isWork,
    toggleTimer,
    resetTimer,
    skipPhase,
  };
}

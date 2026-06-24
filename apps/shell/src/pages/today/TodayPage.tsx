import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAudio, SOUNDS } from "../../shared/lib/audio";
import { storage } from "../../shared/lib/storage";
import {
  WORK,
  REST,
  CIRC,
  DATA_KEY,
  SOUND_KEY,
  HAB_KEY,
} from "../../shared/config/timer";
import { Input } from "../../shared/ui";
import { TaskItem } from "./TaskItem";
import { useHabitica } from "./useHabitica";
import type { Task } from "./useTimer";

export const TodayPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [tl, setTl] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [pomos, setPomos] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [soundId, setSoundId] = useState("chord");
  const [soundOpen, setSoundOpen] = useState(false);

  // Habitica state
  const [habOpen, setHabOpen] = useState(false);
  const [habUserId, setHabUserId] = useState("");
  const [habToken, setHabToken] = useState("");
  const [habConnected, setHabConnected] = useState(false);
  const { habStatus, habMsg, syncHabitica: syncHabiticaFn } = useHabitica();

  const audio = useAudio(soundId);
  const stateRef = useRef({ tasks, activeId, isWork, elapsed, pomos });

  useEffect(() => {
    stateRef.current = { tasks, activeId, isWork, elapsed, pomos };
  }, [tasks, activeId, isWork, elapsed, pomos]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toDateString();
        const r = storage.get(DATA_KEY);
        if (r) {
          const d = JSON.parse(r);
          if (d.date === today) {
            setTasks(d.tasks);
            setPomos(d.pomos);
            setElapsed(d.elapsed);
            setLoaded(true);
            return;
          }
        }
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    };

    const loadSound = async () => {
      try {
        const r = storage.get(SOUND_KEY);
        setSoundId(r || "chord");
      } catch {
        setSoundId("chord");
      }
    };

    const loadHabCreds = async () => {
      try {
        const r = storage.get(HAB_KEY);
        if (r) {
          const c = JSON.parse(r);
          if (c.userId) {
            setHabUserId(c.userId);
            setHabToken(c.token);
            setHabConnected(true);
          }
        }
      } catch {
        // Ignore
      }
    };

    loadData();
    loadSound();
    loadHabCreds();
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (!loaded) return;
    try {
      storage.set(
        DATA_KEY,
        JSON.stringify({
          date: new Date().toDateString(),
          tasks,
          pomos,
          elapsed,
        }),
      );
    } catch {
      // Ignore
    }
  }, [tasks, pomos, elapsed, loaded]);

  // Timer logic
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tick = useCallback(() => {
    setTl((prev) => {
      const s = stateRef.current;
      if (s.isWork) setElapsed((e) => e + 1);
      if (prev <= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        audio.playEnd();
        if (s.isWork) {
          setPomos((p) => p + 1);
          if (s.activeId) {
            setTasks((ts) =>
              ts.map((t) =>
                t.id === s.activeId ? { ...t, pomos: (t.pomos || 0) + 1 } : t,
              ),
            );
          }
          setIsWork(false);
          return REST;
        } else {
          setIsWork(true);
          return WORK;
        }
      }
      return prev - 1;
    });
  }, [audio]);

  const toggleTimer = () => {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      audio.playStart();
      setRunning(true);
      intervalRef.current = setInterval(tick, 1000);
    }
  };

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setIsWork(true);
    setTl(WORK);
  };

  const skipPhase = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setIsWork((w) => !w);
    setTl(isWork ? REST : WORK);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Task handlers
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTask.trim()) {
      setTasks((ts) => [
        { id: Date.now(), text: newTask.trim(), done: false, pomos: 0 },
        ...ts,
      ]);
      setNewTask("");
    }
  };

  const toggleDone = (id: number | string) => {
    setTasks((ts) =>
      ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
    if (activeId === id) setActiveId(null);
  };

  const delTask = (id: number | string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const focusTask = (id: number | string) => {
    setActiveId((a) => (a === id ? null : id));
  };

  const selectSound = (id: string) => {
    setSoundId(id);
    try {
      storage.set(SOUND_KEY, id);
    } catch {
      // Ignore
    }
  };

  const syncHabitica = async () => {
    await syncHabiticaFn(habUserId, habToken, setTasks);
  };

  const disconnectHabitica = () => {
    setHabUserId("");
    setHabToken("");
    setHabConnected(false);
    try {
      storage.set(HAB_KEY, "");
    } catch {
      // Ignore
    }
    setTasks((ts) => ts.filter((t) => t.source !== "habitica"));
  };

  // Computed values
  const pending = tasks.filter((t) => !t.done).length;
  const done = tasks.filter((t) => t.done).length;
  const frac = tl / (isWork ? WORK : REST);
  const offset = CIRC * (1 - frac);
  const mm = String(Math.floor(tl / 60)).padStart(2, "0");
  const ss = String(tl % 60).padStart(2, "0");
  const activeTask = tasks.find((t) => t.id === activeId);
  const filtered = tasks.filter((t) => !t.done);
  const curSound = SOUNDS.find((s) => s.id === soundId) || SOUNDS[0];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200 font-sans overflow-hidden">
      {/* ── SIDEBAR ── */}
      <div className="w-52 min-w-52 bg-gray-900 border-r border-gray-800 p-3 pt-5 flex flex-col overflow-y-auto">
        <div className="px-3 pb-4 mb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xs font-bold text-white">
              Y
            </div>
            <span className="text-gray-400 text-sm font-medium">
              yalovyysanya
            </span>
          </div>
        </div>

        <div className="px-3 py-3 flex items-center gap-2 text-gray-300 hover:bg-gray-800/50 rounded transition-all">
          <span className="text-base">☀️</span>
          <span className="flex-1 text-sm font-medium">Today</span>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">
            {pending}
          </span>
        </div>

        {/* HABITICA */}
        <div className="border-t border-gray-800 mt-2">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer"
            onClick={() => setHabOpen((o) => !o)}
          >
            <span className="text-xs text-gray-600 uppercase font-medium">
              ⚔️ Habitica
              {habConnected && (
                <span className="ml-2 inline-block text-xs bg-green-900/15 text-green-400 px-2 py-0.5 rounded">
                  connected
                </span>
              )}
            </span>
            <span className="text-xs text-gray-700">{habOpen ? "▲" : "▼"}</span>
          </div>

          {habOpen && (
            <div className="px-3 pb-3 space-y-3">
              {habConnected && (
                <div className="p-2.5 bg-green-900/10 border border-green-700/20 rounded text-xs text-green-400 flex items-center justify-between">
                  <span className="font-medium">✓ Synced</span>
                  <button
                    onClick={disconnectHabitica}
                    className="text-xs text-gray-600 hover:text-gray-400 bg-none border-0"
                  >
                    Disconnect
                  </button>
                </div>
              )}
              <div className="space-y-2.5">
                <Input
                  placeholder="User ID"
                  value={habUserId}
                  onChange={(e) => setHabUserId(e.target.value)}
                  spellCheck={false}
                  className="text-xs"
                />
                <Input
                  placeholder="API Token"
                  type="password"
                  value={habToken}
                  onChange={(e) => setHabToken(e.target.value)}
                  spellCheck={false}
                  className="text-xs"
                />
              </div>
              <button
                onClick={syncHabitica}
                disabled={habStatus === "loading"}
                className="w-full px-3 py-2 bg-tomato text-white text-xs font-medium rounded hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {habStatus === "loading" ? "⏳ Syncing…" : "⟳ Sync Tasks"}
              </button>
              {habMsg && (
                <div
                  className={`text-xs px-2.5 py-2 rounded text-center font-medium ${
                    habStatus === "ok"
                      ? "bg-green-900/10 text-green-400"
                      : habStatus === "error"
                        ? "bg-red-900/10 text-red-400"
                        : "bg-gray-900/20 text-gray-500"
                  }`}
                >
                  {habStatus === "ok"
                    ? "✓ "
                    : habStatus === "error"
                      ? "✕ "
                      : ""}
                  {habMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SOUND */}
        <div className="border-t border-gray-800 mt-2">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer"
            onClick={() => setSoundOpen((o) => !o)}
          >
            <span className="text-xs text-gray-600 uppercase font-medium">
              🔊 Sound
            </span>
            <span className="text-xs text-gray-700">
              {soundOpen ? "▲" : "▼"}
            </span>
          </div>

          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-xs">
              <span className="text-lg">{curSound.icon}</span>
              <span className="flex-1 text-gray-300 font-medium">
                {curSound.name}
              </span>
              <span className="text-gray-600 text-xs">{curSound.desc}</span>
            </div>
          </div>

          {soundOpen && (
            <div className="px-2.5 pb-2.5 space-y-2">
              {SOUNDS.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer border transition-all ${
                    s.id === soundId
                      ? "bg-red-900/10 border-red-700/35"
                      : "border-transparent hover:bg-gray-800/50"
                  }`}
                  onClick={() => selectSound(s.id)}
                >
                  <span className="text-lg flex-shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-medium ${
                        s.id === soundId ? "text-tomato" : "text-gray-300"
                      }`}
                    >
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-600">{s.desc}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.preview(s.id);
                    }}
                    className="text-xs px-2.5 py-1.5 bg-gray-800 border border-gray-700 text-gray-600 rounded hover:text-gray-400 flex-shrink-0 transition-all"
                  >
                    ▶
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="mt-auto px-3 py-3 border-t border-gray-800 text-gray-600 text-sm cursor-pointer hover:text-gray-400 hover:bg-gray-800/50 rounded-b transition-all"
          onClick={() => document.getElementById("task-input")?.focus()}
        >
          ＋ Add Task
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-800 bg-gray-950">
          <h1 className="text-3xl font-bold text-gray-50 mb-8">Today</h1>
          <div className="grid grid-cols-5 gap-6 text-center">
            <div>
              <div
                className={`text-2xl font-light ${
                  true ? "text-tomato" : "text-gray-200"
                }`}
              >
                {pending * 30}m
              </div>
              <div className="text-xs text-gray-500 mt-1.5">Estimated</div>
            </div>
            <div>
              <div className="text-2xl font-light text-gray-200">{pending}</div>
              <div className="text-xs text-gray-500 mt-1.5">To Complete</div>
            </div>
            <div>
              <div
                className={`text-2xl font-light ${
                  true ? "text-tomato" : "text-gray-200"
                }`}
              >
                {Math.floor(elapsed / 60)}m
              </div>
              <div className="text-xs text-gray-500 mt-1.5">Elapsed</div>
            </div>
            <div>
              <div className="text-2xl font-light text-gray-200">{done}</div>
              <div className="text-xs text-gray-500 mt-1.5">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-light text-gray-200">{pomos}🍅</div>
              <div className="text-xs text-gray-500 mt-1.5">Pomodoros</div>
            </div>
          </div>
        </div>

        {/* TIMER */}
        <div className="mx-8 mt-8 mb-4 p-6 bg-gray-900 border border-gray-800 rounded-xl flex items-center gap-6">
          <div
            className="w-24 h-24 rounded-full flex flex-col items-center justify-center relative flex-shrink-0 cursor-pointer"
            onClick={toggleTimer}
          >
            <svg
              className="absolute top-0 left-0 w-24 h-24 -rotate-90"
              viewBox="0 0 74 74"
            >
              <circle
                cx="37"
                cy="37"
                r="33"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gray-700"
              />
              <circle
                cx="37"
                cy="37"
                r="33"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                className={isWork ? "text-tomato" : "text-green-500"}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="relative z-10 text-2xl font-semibold text-gray-50">
              {mm}:{ss}
            </div>
            <div className="relative z-10 text-xs text-gray-500">
              {isWork ? "Work" : "Rest"}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-400 mb-3 truncate">
              {activeTask ? `🍅 ${activeTask.text}` : "No task — free pomodoro"}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <button
                onClick={toggleTimer}
                className={`text-sm font-medium px-4 py-2 rounded flex items-center gap-1 transition-all ${
                  running
                    ? "bg-gray-800 text-gray-300"
                    : "bg-tomato text-white hover:opacity-90"
                }`}
              >
                {running ? "⏸ Pause" : "▶ Start"}
              </button>
              <button
                onClick={resetTimer}
                className="text-sm px-3 py-2 bg-transparent border border-gray-700 text-gray-500 rounded hover:text-gray-400 transition-all"
              >
                ↺
              </button>
              <button
                onClick={skipPhase}
                className="text-sm px-3 py-2 bg-transparent border border-gray-700 text-gray-500 rounded hover:text-gray-400 transition-all"
              >
                ⏭
              </button>
              <span
                className={`text-xs px-3 py-1 rounded font-medium ${
                  isWork
                    ? "bg-red-900/15 text-tomato"
                    : "bg-green-900/15 text-green-400"
                }`}
              >
                {isWork ? "Work" : "Rest"}
              </span>
            </div>
          </div>
        </div>

        {/* ADD TASK */}
        <div className="mx-8 mb-4 px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-3">
          <span className="text-gray-600 text-lg">＋</span>
          <input
            id="task-input"
            type="text"
            placeholder="Add a task, press Enter to save"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent border-0 text-gray-300 text-sm focus:outline-none placeholder-gray-600"
          />
        </div>

        {/* TASK LIST */}
        <div className="flex-1 overflow-y-auto px-8 pt-2 pb-8">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-base text-gray-400 mb-2">No Tasks</p>
              <small className="text-sm text-gray-600">
                Add a task or sync Habitica
              </small>
            </div>
          ) : (
            <>
              {/* Habitica group */}
              {filtered.some((t) => t.source === "habitica") && (
                <>
                  <div className="text-xs text-gray-600 uppercase font-medium px-2 py-2 mb-3">
                    ⚔️ Habitica ·{" "}
                    <span className="text-gray-700">
                      {
                        filtered.filter(
                          (t) =>
                            t.source === "habitica" && t.habType === "daily",
                        ).length
                      }{" "}
                      dailies ·{" "}
                      {
                        filtered.filter(
                          (t) =>
                            t.source === "habitica" && t.habType === "todo",
                        ).length
                      }{" "}
                      todos
                    </span>
                  </div>
                  {filtered
                    .filter((t) => t.source === "habitica")
                    .map((t) => (
                      <TaskItem
                        key={t.id}
                        t={t}
                        isActive={t.id === activeId}
                        onDone={() => toggleDone(t.id)}
                        onDel={() => delTask(t.id)}
                        onFocus={() => focusTask(t.id)}
                      />
                    ))}
                </>
              )}

              {/* Local tasks */}
              {filtered.some((t) => !t.source) && (
                <>
                  {filtered.some((t) => t.source === "habitica") && (
                    <div className="text-xs text-gray-600 uppercase font-medium px-2 py-3 mb-3 mt-4">
                      📋 Local
                    </div>
                  )}
                  {filtered
                    .filter((t) => !t.source)
                    .map((t) => (
                      <TaskItem
                        key={t.id}
                        t={t}
                        isActive={t.id === activeId}
                        onDone={() => toggleDone(t.id)}
                        onDel={() => delTask(t.id)}
                        onFocus={() => focusTask(t.id)}
                      />
                    ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

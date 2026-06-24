import React, { useState } from 'react';
import { Task } from './useTimer';

interface TaskItemProps {
  t: Task;
  isActive: boolean;
  onDone: () => void;
  onDel: () => void;
  onFocus: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  t,
  isActive,
  onDone,
  onDel,
  onFocus,
}) => {
  const [hover, setHover] = useState(false);
  const isHab = t.source === 'habitica';

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 mb-2 rounded-lg border transition-all ${
        isActive
          ? 'bg-red-900/10 border-red-700/45'
          : 'bg-gray-900 border-gray-800'
      } ${t.done ? 'opacity-40' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={t.text}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all ${
          t.done
            ? 'border-tomato bg-tomato text-white text-xs'
            : 'border-gray-600'
        }`}
        onClick={onDone}
      >
        {t.done && '✓'}
      </div>

      <div
        className={`flex-1 text-sm min-w-0 ${
          t.done
            ? 'line-through text-gray-600'
            : 'text-gray-300'
        } overflow-hidden text-ellipsis whitespace-nowrap`}
      >
        {t.text}
      </div>

      {isHab && (
        <span
          className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
            t.habType === 'daily'
              ? 'bg-purple-900/15 text-purple-300'
              : 'bg-blue-900/15 text-blue-300'
          }`}
        >
          {t.habType === 'daily' ? 'daily' : 'todo'}
        </span>
      )}

      <div className="flex gap-1.5 items-center flex-shrink-0" title={`${t.pomos} pomo(s)`}>
        {t.pomos > 0
          ? Array.from({ length: t.pomos }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-tomato"
              />
            ))
          : <span className="text-xs text-gray-700">0</span>}
      </div>

      {!t.done && (hover || isActive) && (
        <button
          onClick={onFocus}
          className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-600 hover:text-gray-400 whitespace-nowrap transition-all"
        >
          {isActive ? '⏹ Unlink' : '▶ Focus'}
        </button>
      )}

      <button
        onClick={onDel}
        className="text-sm text-gray-700 hover:text-gray-500 flex-shrink-0 p-1 border-0 bg-none transition-all"
      >
        ✕
      </button>
    </div>
  );
};

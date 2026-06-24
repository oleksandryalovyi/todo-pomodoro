import { useState } from 'react';
import { storage } from '../../shared/lib/storage';
import { HAB_KEY } from '../../shared/config/timer';
import { Task } from './useTimer';

interface HabiticaCreds {
  userId: string;
  token: string;
}

interface HabiticaTask {
  id: string;
  text: string;
  completed?: boolean;
  isDue?: boolean;
}

async function fetchHabitica(userId: string, token: string): Promise<Task[]> {
  const headers = {
    'x-api-user': userId,
    'x-api-key': token,
    'x-client': 'pomodoro-app',
    'Content-Type': 'application/json',
  };

  const [todosRes, dailiesRes] = await Promise.all([
    fetch('https://habitica.com/api/v3/tasks/user?type=todos', { headers }),
    fetch('https://habitica.com/api/v3/tasks/user?type=dailys', { headers }),
  ]);

  if (!todosRes.ok || !dailiesRes.ok) {
    throw new Error(`Habitica error: ${todosRes.status}`);
  }

  const [todosData, dailiesData] = await Promise.all([
    todosRes.json(),
    dailiesRes.json(),
  ]);

  const todos = (todosData.data || [])
    .filter((t: HabiticaTask) => !t.completed)
    .map((t: HabiticaTask) => ({
      id: 'hab_' + t.id,
      text: t.text,
      done: false,
      pomos: 0,
      source: 'habitica',
      habType: 'todo' as const,
    }));

  const dailies = (dailiesData.data || [])
    .filter((t: HabiticaTask) => !t.completed && t.isDue)
    .map((t: HabiticaTask) => ({
      id: 'hab_' + t.id,
      text: t.text,
      done: false,
      pomos: 0,
      source: 'habitica',
      habType: 'daily' as const,
    }));

  return [...todos, ...dailies];
}

export function useHabitica() {
  const [habStatus, setHabStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [habMsg, setHabMsg] = useState('');

  const syncHabitica = async (userId: string, token: string, setTasks: (fn: (ts: Task[]) => Task[]) => void) => {
    if (!userId.trim() || !token.trim()) {
      setHabMsg('Enter userId and token');
      setHabStatus('error');
      return;
    }
    setHabStatus('loading');
    setHabMsg('');
    try {
      const habTasks = await fetchHabitica(userId.trim(), token.trim());
      await storage.set(HAB_KEY, JSON.stringify({ userId: userId.trim(), token: token.trim() }));
      setTasks((ts) => {
        const local = ts.filter((t) => t.source !== 'habitica');
        return [...habTasks, ...local];
      });
      setHabStatus('ok');
      setHabMsg(
        `Synced ${habTasks.length} task${habTasks.length !== 1 ? 's' : ''}`
      );
    } catch (e) {
      setHabStatus('error');
      setHabMsg((e as Error).message || 'Sync failed');
    }
  };

  return { habStatus, habMsg, syncHabitica };
}

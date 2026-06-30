import { useMemo } from 'react';
import {
  GistStorageProvider,
  LocalStorageProvider,
  createHistoryStorage,
} from '@todo-pomodoro/history-storage';
import { storage } from '../storage';

const TOKEN_KEY = 'pm_gist_token';
const GIST_ID_KEY = 'pm_gist_id';

export function useHistoryStorage(token?: string) {
  return useMemo(() => {
    const resolvedToken = token ?? storage.get(TOKEN_KEY) ?? '';

    if (resolvedToken) {
      const gistId = storage.get(GIST_ID_KEY) ?? undefined;
      const provider = new GistStorageProvider(resolvedToken, gistId);
      const base = createHistoryStorage(provider);

      return {
        ...base,
        async appendPomodoro(record: Parameters<typeof base.appendPomodoro>[0]) {
          await base.appendPomodoro(record);
          const id = provider.getGistId();
          if (id) storage.set(GIST_ID_KEY, id);
        },
        provider: 'gist' as const,
      };
    }

    return {
      ...createHistoryStorage(new LocalStorageProvider()),
      provider: 'local' as const,
    };
  }, [token]);
}

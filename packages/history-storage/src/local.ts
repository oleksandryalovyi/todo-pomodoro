import type { HistoryData, HistoryStorageProvider } from './types';

const KEY = 'pm_history';

const empty = (): HistoryData => ({
  pomodoros: [],
  tasks: [],
  metricDefinitions: [],
  metricEntries: [],
});

export class LocalStorageProvider implements HistoryStorageProvider {
  isConfigured(): boolean {
    return true;
  }

  async load(): Promise<HistoryData> {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as HistoryData) : empty();
    } catch {
      return empty();
    }
  }

  async save(data: HistoryData): Promise<void> {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  }
}

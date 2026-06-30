import type {
  HistoryStorageProvider,
  PomodoroRecord,
  TaskRecord,
  MetricDefinition,
  MetricEntry,
} from './types';

export function createHistoryStorage(provider: HistoryStorageProvider) {
  return {
    isConfigured: () => provider.isConfigured(),

    async loadAll() {
      return provider.load();
    },

    async appendPomodoro(record: PomodoroRecord): Promise<void> {
      const data = await provider.load();
      data.pomodoros.push(record);
      await provider.save(data);
    },

    async upsertTask(record: TaskRecord): Promise<void> {
      const data = await provider.load();
      const idx = data.tasks.findIndex((t) => t.id === record.id);
      if (idx >= 0) {
        data.tasks[idx] = record;
      } else {
        data.tasks.push(record);
      }
      await provider.save(data);
    },

    async addMetricDefinition(def: MetricDefinition): Promise<void> {
      const data = await provider.load();
      const exists = data.metricDefinitions.some((d) => d.id === def.id);
      if (!exists) data.metricDefinitions.push(def);
      await provider.save(data);
    },

    async appendMetricEntry(entry: MetricEntry): Promise<void> {
      const data = await provider.load();
      data.metricEntries.push(entry);
      await provider.save(data);
    },
  };
}

export type HistoryStorage = ReturnType<typeof createHistoryStorage>;

export interface PomodoroRecord {
  id: string;
  taskId: string | number | null; // null = free pomodoro
  startedAt: number;              // unix ms
  finishedAt: number;             // unix ms
  plannedDuration: number;        // seconds
}

export interface TaskRecord {
  id: string | number;
  text: string;
  source: 'local' | 'habitica';
  habiticaId?: string;            // stable id for recurring habitica tasks
  recurringGroupId?: string;      // for future local recurring tasks
  createdAt: number;              // unix ms
  finishedAt: number | null;      // null = still open
  pomodoroIds: string[];
}

export interface MetricDefinition {
  id: string;
  name: string;
  unit?: string;                  // e.g. "resume" → display as "3 resumes"
}

export interface MetricEntry {
  id: string;
  metricId: string;               // → MetricDefinition.id
  loggedAt: number;               // unix ms
}

export interface HistoryData {
  pomodoros: PomodoroRecord[];
  tasks: TaskRecord[];
  metricDefinitions: MetricDefinition[];
  metricEntries: MetricEntry[];
}

export interface HistoryStorageProvider {
  isConfigured(): boolean;
  load(): Promise<HistoryData>;
  save(data: HistoryData): Promise<void>;
}

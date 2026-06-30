import type { HistoryData, HistoryStorageProvider } from './types';

const FILENAME = 'pomodoro-history.json';
const API = 'https://api.github.com';

const empty = (): HistoryData => ({
  pomodoros: [],
  tasks: [],
  metricDefinitions: [],
  metricEntries: [],
});

export class GistStorageProvider implements HistoryStorageProvider {
  private gistId: string | null;

  constructor(private token: string, gistId?: string) {
    this.gistId = gistId ?? null;
  }

  getGistId(): string | null {
    return this.gistId;
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  async load(): Promise<HistoryData> {
    if (!this.gistId) return empty();

    const res = await fetch(`${API}/gists/${this.gistId}`, {
      headers: this.headers(),
    });

    if (!res.ok) return empty();

    const gist = await res.json();
    const content = gist.files?.[FILENAME]?.content;
    return content ? (JSON.parse(content) as HistoryData) : empty();
  }

  async save(data: HistoryData): Promise<void> {
    const content = JSON.stringify(data, null, 2);

    if (this.gistId) {
      await fetch(`${API}/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({ files: { [FILENAME]: { content } } }),
      });
    } else {
      const res = await fetch(`${API}/gists`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          description: 'Pomodoro History',
          public: false,
          files: { [FILENAME]: { content } },
        }),
      });

      if (!res.ok) throw new Error('Failed to create gist');
      const gist = await res.json();
      this.gistId = gist.id as string;
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    };
  }
}

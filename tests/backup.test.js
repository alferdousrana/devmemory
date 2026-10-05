import { describe, it, expect } from 'vitest';
import { backupToMarkdown, serializeRecords } from '../src/services/backupService.js';
import { buildDemoData } from '../src/data/demoData.js';

describe('backup formats', () => {
  const d = buildDemoData();
  const backup = { exportedAt: '2026-10-06T00:00:00.000Z', data: Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'profile').map(([k, v]) => [k, serializeRecords(v)])) };
  it('serialises timestamps to ISO strings', () => {
    expect(backup.data.memories[0].createdAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });
  it('produces readable Markdown with every section', () => {
    const md = backupToMarkdown(backup);
    for (const h of ['## Memories (10)', '## Snippets (6)', '## Commands (8)', '## Projects (4)', '## Bookmarks (5)']) expect(md).toContain(h);
    expect(md).toContain('### Docker PostgreSQL connection refused');
    expect(md).toContain('```dockerfile');
  });
});

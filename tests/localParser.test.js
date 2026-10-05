import { describe, it, expect } from 'vitest';
import { parseCapture, guessCodeLanguage, titleCase } from '../src/services/localParser.js';

describe('localParser.parseCapture', () => {
  it('structures the spec example exactly', () => {
    const r = parseCapture("Django CORS error because frontend origin wasn't allowed. Installed django-cors-headers and added CORS_ALLOWED_ORIGINS.");
    expect(r.title).toBe('Django CORS Error');
    expect(r.problem).toBe('Frontend origin was not allowed.');
    expect(r.solution).toBe('Installed django-cors-headers and added CORS_ALLOWED_ORIGINS.');
    expect(r.tags).toEqual(['django', 'cors', 'debugging']);
    expect(r.type).toBe('BUG');
    expect(r.commands).toContain('pip install django-cors-headers');
  });

  it('extracts "fixed by" solutions and does not treat prose as a command', () => {
    const r = parseCapture('Docker Postgres connection refused. The web container used localhost. Fixed by setting DB_HOST=db in docker-compose.yml');
    expect(r.type).toBe('BUG');
    expect(r.title).toBe('Docker Postgres Connection Refused');
    expect(r.solution).toMatch(/DB_HOST=db/);
    expect(r.commands).toEqual([]);
    expect(r.tags).toEqual(expect.arrayContaining(['docker', 'postgresql', 'networking']));
  });

  it('detects named exceptions and the error message', () => {
    const r = parseCapture("Got ModuleNotFoundError: No module named 'rest_framework' in Django. Ran pip install djangorestframework.");
    expect(r.type).toBe('BUG');
    expect(r.title).toBe('Django ModuleNotFoundError');
    expect(r.errorMessage).toMatch(/^ModuleNotFoundError: No module named/);
    expect(r.commands).toContain('pip install djangorestframework');
  });

  it('recognises commands, learnings and snippets', () => {
    expect(parseCapture('git rebase -i HEAD~3')).toMatchObject({ type: 'COMMAND', title: 'git rebase -i HEAD~3' });
    expect(parseCapture("TIL Python's lru_cache caches by arguments").type).toBe('LEARNING');
    expect(parseCapture('def add(a, b):\n    return a + b\n').type).toBe('SNIPPET');
  });

  it('returns an empty structure for empty input', () => {
    expect(parseCapture('   ').title).toBe('');
  });
});

describe('helpers', () => {
  it('title-cases with tech names and acronyms', () => {
    expect(titleCase('django cors error with jwt and api')).toBe('Django CORS Error with JWT and API');
  });
  it('guesses code languages', () => {
    expect(guessCodeLanguage('FROM python:3.12\nRUN pip install x')).toBe('dockerfile');
    expect(guessCodeLanguage('SELECT * FROM users;')).toBe('sql');
    expect(guessCodeLanguage('const x = () => 1;')).toBe('javascript');
    expect(guessCodeLanguage('def f():\n  pass')).toBe('python');
  });
});

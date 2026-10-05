import { describe, it, expect } from 'vitest';
import { html, raw, escapeHtml, safeUrl, highlightText, render } from '../src/utils/html.js';

describe('safe templating', () => {
  it('escapes interpolated user content', () => {
    const evil = '<img src=x onerror=alert(1)>"\'';
    expect(html`<p title="${evil}">${evil}</p>`.toString()).not.toMatch(/<img/);
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });
  it('nests templates and arrays without double-escaping', () => {
    const items = ['a', '<b>'].map((x) => html`<li>${x}</li>`);
    expect(html`<ul>${items}</ul>`.toString()).toBe('<ul><li>a</li><li>&lt;b&gt;</li></ul>');
    expect(html`${raw('<svg></svg>')}`.toString()).toBe('<svg></svg>');
  });
  it('render() refuses raw strings', () => {
    expect(() => render(document.createElement('div'), '<b>x</b>')).toThrow();
  });
  it('blocks javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#');
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
  });
  it('highlights search terms safely', () => {
    expect(highlightText('<docker> compose', 'docker')).toBe('&lt;<mark>docker</mark>&gt; compose');
  });
});

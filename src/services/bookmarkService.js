import { createEntityService } from './entityService.js';
import { buildSearchKeywords, normalizeTags } from '../utils/keywords.js';
import { codedError } from '../utils/errors.js';

export function detectCategory(url) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return 'other'; }
  if (/github\.com|gitlab\.com/.test(host)) return 'github';
  if (/stackoverflow\.com|stackexchange\.com|serverfault\.com/.test(host)) return 'stackoverflow';
  if (/youtube\.com|youtu\.be/.test(host)) return 'youtube';
  if (/^docs\.|developer\.mozilla\.org|readthedocs|devdocs|\.dev\/docs|docs\.python\.org|learn\.microsoft/.test(host)) return 'documentation';
  if (/medium\.com|dev\.to|hashnode|substack|blog/.test(host)) return 'blog';
  if (/freecodecamp|tutorial|realpython|digitalocean\.com\/community/.test(host)) return 'tutorial';
  return 'other';
}

export function normalizeUrl(url) {
  const v = String(url || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function prepare(r) {
  const url = normalizeUrl(r.url);
  if (!url) throw codedError('invalid-argument', 'Enter a URL.');
  try { new URL(url); } catch { throw codedError('invalid-argument', 'That URL doesn’t look right.'); }
  let title = String(r.title || '').trim();
  if (!title) { try { title = new URL(url).hostname.replace(/^www\./, ''); } catch { title = url; } }
  const out = { ...r, url, title, tags: normalizeTags(r.tags) };
  if (!r.category || r.category === 'auto') out.category = detectCategory(url);
  out.searchKeywords = buildSearchKeywords(out.title, out.description, out.notes, out.tags, out.category, url.replace(/https?:\/\//, '').split(/[/.?=&#-]/));
  return out;
}

export const bookmarkService = createEntityService({ collection: 'bookmarks', label: 'Bookmark', kind: 'bookmark', prepare });

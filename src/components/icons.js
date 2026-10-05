/** Original line icons (24×24, stroke = currentColor). Trusted static markup. */
import { raw } from '../utils/html.js';

const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16.2 16.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12.5 4.5 4.5L20 6.5"/>',
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2h8.8A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>',
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="m7 9 3 3-3 3M12.5 15H17"/>',
  code: '<path d="m15.5 17.5 5.5-5.5-5.5-5.5M8.5 6.5 3 12l5.5 5.5"/>',
  bug: '<rect x="7.5" y="7" width="9" height="13" rx="4.5"/><path d="M12 11v9M7.5 13H3.5M20.5 13h-4M7.5 9.5 5 7.5M16.5 9.5 19 7.5M7.5 17 5 19M16.5 17l2.5 2M9.5 7a2.5 2.5 0 0 1 5 0"/>',
  bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  layers: '<path d="m12 3.5 9 4.5-9 4.5L3 8z"/><path d="m3 12.5 9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
  repeat: '<path d="m17 2.5 3.5 3.5L17 9.5"/><path d="M3.5 11V9.5a3.5 3.5 0 0 1 3.5-3.5h13.5"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5"/>',
  brain: '<path d="M9.5 4A2.8 2.8 0 0 0 6.7 6.8 3 3 0 0 0 4.5 9.7a3 3 0 0 0 .8 2.1 3.2 3.2 0 0 0 .7 4.6A3 3 0 0 0 9 20a2.5 2.5 0 0 0 3-1V5.5A2.4 2.4 0 0 0 9.5 4z"/><path d="M14.5 4a2.8 2.8 0 0 1 2.8 2.8 3 3 0 0 1 2.2 2.9 3 3 0 0 1-.8 2.1 3.2 3.2 0 0 1-.7 4.6A3 3 0 0 1 15 20a2.5 2.5 0 0 1-3-1"/>',
  graph: '<circle cx="5.5" cy="6" r="2.2"/><circle cx="18.5" cy="7" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7.6 6.3 16.3 6.8M6.6 8 10.9 16M17.4 9 13.1 16"/>',
  timeline: '<path d="M6 3v18"/><circle cx="6" cy="6.5" r="2"/><circle cx="6" cy="13" r="2"/><circle cx="6" cy="19" r="1.5"/><path d="M10.5 6.5H20M10.5 13H17"/>',
  chart: '<path d="M3.5 20.5h17M6.5 17v-6M11.5 17V6.5M16.5 17v-9"/>',
  sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  logout: '<path d="M9.5 4H5.5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="m15.5 16.5 4.5-4.5-4.5-4.5M20 12H9.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2"/><path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v.5"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 2 2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9.5 7V4h5v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  upload: '<path d="M12 15V3.5M7 8l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  download: '<path d="M12 3.5V15M7 10.5l5 5 5-5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4M12 17v.5"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 1 1 1-8.9A6 6 0 0 1 19.2 11 3.8 3.8 0 0 1 18 18.5z"/>',
  cloudOff: '<path d="M7 18.5a4.5 4.5 0 1 1 1-8.9A6 6 0 0 1 19.2 11 3.8 3.8 0 0 1 18 18.5z"/><path d="M3 3l18 18"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  tag: '<path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8.5 8.5z"/><circle cx="8" cy="8" r="1.5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  rocket: '<path d="M5.5 15.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="m9 15-3-3c1-4.5 4.5-8 10.5-8.5 0 6-4 9.5-7.5 11.5z"/><circle cx="15" cy="9" r="1.5"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
  shield: '<path d="M12 3.5 19.5 6v6c0 4.5-3.2 7.6-7.5 8.5-4.3-.9-7.5-4-7.5-8.5V6z"/>',
  filter: '<path d="M3.5 5h17l-6.5 7.5v6l-4 2v-8z"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  list: '<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flame: '<path d="M12 21.5c4 0 7-2.6 7-6.6 0-3-1.8-5.3-3.4-6.9-.4 1.9-1.4 3-2.4 3 .4-3-1-6.3-3.9-8.5 0 3.6-5.3 6.6-5.3 12.4 0 3.9 3.2 6.6 8 6.6z"/>',
  merge: '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7.5v9M6 7.5c0 3 3 4.5 10 4.5"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5S9.5 6.1 12 3.5z"/>',
  heart: '<path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  database: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  inbox: '<path d="M3.5 13.5 6 5h12l2.5 8.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/>',
  google: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12h6.5M18.5 12a6.5 6.5 0 1 1-1.9-4.6"/>',
};

export function icon(name, { size = 18, label = '', className = '' } = {}) {
  const body = P[name] || P.spark;
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return raw(`<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`);
}

/** DevMemory mark: a "D" bracket holding a memory node. */
export function logo(size = 28) {
  return raw(`<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M11 8.5h4.5a7.5 7.5 0 0 1 0 15H11z" fill="none" stroke="var(--on-accent)" stroke-width="2.6" stroke-linejoin="round"/><circle cx="15.5" cy="16" r="2.4" fill="var(--on-accent)"/></svg>`);
}

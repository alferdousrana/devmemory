/**
 * Memory Graph — memories, projects, tags, snippets and commands as a network.
 * Lazy-loaded page. Layout: small force simulation computed up front (no
 * continuous animation). Zoom with wheel/buttons/+ −, pan by dragging or arrow keys.
 */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonList } from '../components/ui.js';
import { dataStore } from '../state/dataStore.js';
import { techDisplay } from '../services/insightsService.js';

const KINDS = {
  tag: { label: 'Tags', r: 9 }, project: { label: 'Projects', r: 12 }, memory: { label: 'Memories', r: 6 },
  snippet: { label: 'Snippets', r: 5 }, command: { label: 'Commands', r: 5 },
};

export function buildGraph(d, enabled) {
  const nodes = []; const links = []; const index = new Map();
  const add = (id, kind, label, href) => { if (!index.has(id)) { index.set(id, nodes.length); nodes.push({ id, kind, label, href, deg: 0 }); } return id; };
  const tagCounts = {};
  const items = [];
  if (enabled.memory) d.memories.slice(0, 150).forEach((m) => items.push({ id: `m:${m.id}`, kind: 'memory', label: m.title, href: `#/memories/${m.id}`, tags: m.tags || [], projectId: m.projectId }));
  if (enabled.snippet) d.snippets.slice(0, 60).forEach((s) => items.push({ id: `s:${s.id}`, kind: 'snippet', label: s.title, href: `#/snippets?open=${s.id}`, tags: s.tags || [], projectId: s.projectId }));
  if (enabled.command) d.commands.slice(0, 60).forEach((c) => items.push({ id: `c:${c.id}`, kind: 'command', label: c.command, href: `#/commands?open=${c.id}`, tags: c.tags || [], projectId: c.projectId }));
  for (const it of items) for (const t of it.tags) if (t !== 'debugging') tagCounts[t] = (tagCounts[t] || 0) + 1;
  const topTags = new Set(Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t]) => t));
  if (enabled.project) d.projects.forEach((p) => add(`p:${p.id}`, 'project', p.name, `#/projects/${p.id}`));
  if (enabled.tag) topTags.forEach((t) => add(`t:${t}`, 'tag', techDisplay(t), `#/search?q=${encodeURIComponent(`#${t}`)}`));
  for (const it of items) {
    add(it.id, it.kind, it.label, it.href);
    if (enabled.tag) for (const t of it.tags) if (topTags.has(t)) links.push({ s: it.id, t: `t:${t}`, w: 1 });
    if (enabled.project && it.projectId && index.has(`p:${it.projectId}`)) links.push({ s: it.id, t: `p:${it.projectId}`, w: 1.4 });
  }
  if (enabled.tag) {
    // tag ↔ tag when they co-occur (Python — Django — REST API — PostgreSQL — Docker)
    const pair = {};
    for (const it of items) {
      const ts = it.tags.filter((t) => topTags.has(t));
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) { const k = [ts[i], ts[j]].sort().join('|'); pair[k] = (pair[k] || 0) + 1; }
    }
    for (const [k, n] of Object.entries(pair)) if (n >= 2) { const [a, b] = k.split('|'); links.push({ s: `t:${a}`, t: `t:${b}`, w: 0.6 + n * 0.2, tagLink: true }); }
  }
  const resolved = links.filter((l) => index.has(l.s) && index.has(l.t)).map((l) => ({ ...l, a: nodes[index.get(l.s)], b: nodes[index.get(l.t)] }));
  resolved.forEach((l) => { l.a.deg++; l.b.deg++; });
  return { nodes, links: resolved };
}

export function layout(nodes, links, { width = 1000, height = 700, iterations = 260 } = {}) {
  const n = nodes.length;
  nodes.forEach((nd, i) => { const a = (i / Math.max(n, 1)) * Math.PI * 2 * 7; const r = 60 + (i % 37) * 7; nd.x = width / 2 + Math.cos(a) * r; nd.y = height / 2 + Math.sin(a) * r; nd.vx = 0; nd.vy = 0; });
  const k = Math.sqrt((width * height) / Math.max(n, 1)) * 0.55;
  for (let it = 0; it < iterations; it++) {
    const temp = 1 - it / iterations;
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        let dx = a.x - b.x; let dy = a.y - b.y; let dist2 = dx * dx + dy * dy;
        if (dist2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist2 = 0.5; }
        if (dist2 > 160000) continue;
        const f = (k * k) / dist2 * 0.9;
        a.vx += dx * f * 0.02; a.vy += dy * f * 0.02; b.vx -= dx * f * 0.02; b.vy -= dy * f * 0.02;
      }
    }
    for (const l of links) {
      const dx = l.b.x - l.a.x; const dy = l.b.y - l.a.y; const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((dist - k) / dist) * 0.06 * l.w;
      l.a.vx += dx * f; l.a.vy += dy * f; l.b.vx -= dx * f; l.b.vy -= dy * f;
    }
    for (const nd of nodes) {
      nd.vx += (width / 2 - nd.x) * 0.004; nd.vy += (height / 2 - nd.y) * 0.004;
      nd.x += Math.max(-30, Math.min(30, nd.vx)) * temp; nd.y += Math.max(-30, Math.min(30, nd.vy)) * temp;
      nd.vx *= 0.6; nd.vy *= 0.6;
    }
  }
  return nodes;
}

export default function graphPage(el, { navigate }) {
  const enabled = { tag: true, project: true, memory: true, snippet: false, command: false };
  render(el, html`<div class="page page--wide graph-page">
    ${pageHeader({ title: 'Memory graph', subtitle: 'How your memories, tags and projects connect. Click a node to open it.' })}
    <div class="toolbar">
      <div class="chips" role="group" aria-label="Show">${Object.entries(KINDS).map(([k, v]) => html`<button type="button" class="chip-btn ${enabled[k] ? 'is-on' : ''} chip-btn--${k}" aria-pressed="${enabled[k]}" data-kind="${k}"><span class="dot dot--${k}" aria-hidden="true"></span>${v.label}</button>`)}</div>
      <span class="spacer"></span>
      <div class="seg" role="group" aria-label="Zoom"><button type="button" class="seg__btn" data-zoom="out" aria-label="Zoom out">−</button><button type="button" class="seg__btn" data-zoom="reset">Fit</button><button type="button" class="seg__btn" data-zoom="in" aria-label="Zoom in">+</button></div>
    </div>
    <div class="graph" data-graph tabindex="0" aria-label="Knowledge graph. Use plus and minus to zoom, arrow keys to pan. A text version follows below." role="application"></div>
    <details class="graph-list"><summary>Text version of the graph</summary><div data-list></div></details>
  </div>`);
  const box = el.querySelector('[data-graph]');
  const listBox = el.querySelector('[data-list]');
  let view = { x: 0, y: 0, k: 1 };
  let svg; let world;
  const W = 1000; const H = 700;

  const apply = () => { if (world) world.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`); };
  const zoomAt = (factor, cx = W / 2, cy = H / 2) => {
    const k = Math.max(0.3, Math.min(4, view.k * factor));
    view.x = cx - ((cx - view.x) * k) / view.k; view.y = cy - ((cy - view.y) * k) / view.k; view.k = k; apply();
  };

  const draw = () => {
    const d = dataStore.get();
    if (!d.loaded.memories) { render(box, skeletonList(3)); return; }
    const { nodes, links } = buildGraph(d, enabled);
    if (!nodes.length) { render(box, emptyState({ iconName: 'graph', title: 'Nothing to connect yet', text: 'Save a few tagged memories and they’ll show up here.' })); render(listBox, html``); return; }
    layout(nodes, links, { width: W, height: H });
    view = { x: 0, y: 0, k: 1 };
    render(box, html`<svg viewBox="0 0 ${W} ${H}" class="graph__svg" role="img" aria-label="${nodes.length} nodes, ${links.length} connections">
      <g data-world>
        <g class="graph__links">${links.map((l) => html`<line x1="${l.a.x.toFixed(1)}" y1="${l.a.y.toFixed(1)}" x2="${l.b.x.toFixed(1)}" y2="${l.b.y.toFixed(1)}" class="${l.tagLink ? 'is-tag' : ''}" data-s="${l.a.id}" data-t="${l.b.id}"/>`)}</g>
        <g class="graph__nodes">${nodes.map((n) => {
          const r = KINDS[n.kind].r + Math.min(8, n.deg * (n.kind === 'tag' ? 0.6 : 0.3));
          const showLabel = n.kind === 'tag' || n.kind === 'project' || n.deg >= 3;
          return html`<g class="node node--${n.kind}" data-id="${n.id}" data-href="${n.href}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})">
            <circle r="${r.toFixed(1)}"/><title>${n.label}</title>
            ${showLabel ? html`<text y="${(r + 12).toFixed(1)}" text-anchor="middle">${n.label.length > 28 ? `${n.label.slice(0, 26)}…` : n.label}</text>` : ''}</g>`;
        })}</g>
      </g></svg>`);
    svg = box.querySelector('svg'); world = box.querySelector('[data-world]');
    apply();
    const byKind = {};
    nodes.forEach((n) => (byKind[n.kind] ||= []).push(n));
    const neighbors = (id) => links.filter((l) => l.a.id === id || l.b.id === id).map((l) => (l.a.id === id ? l.b : l.a));
    render(listBox, html`${(byKind.tag || []).map((t) => html`<h3 class="mem__h">${t.label}</h3><ul class="graph-list__items">${neighbors(t.id).map((n) => html`<li><a href="${n.href}">${n.label}</a> <span class="muted small">${n.kind}</span></li>`)}</ul>`)}
      ${(byKind.project || []).map((p) => html`<h3 class="mem__h">${p.label} (project)</h3><ul class="graph-list__items">${neighbors(p.id).map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}</ul>`)}`);
  };

  // pointer pan + click
  let drag = null;
  box.addEventListener('pointerdown', (e) => {
    if (!svg) return;
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, node: e.target.closest('.node') };
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag) {
      const n = e.target.closest?.('.node');
      box.querySelectorAll('.is-hot').forEach((x) => x.classList.remove('is-hot'));
      if (n) {
        const id = n.dataset.id; n.classList.add('is-hot');
        box.querySelectorAll(`line[data-s="${CSS.escape(id)}"], line[data-t="${CSS.escape(id)}"]`).forEach((l) => l.classList.add('is-hot'));
      }
      return;
    }
    const rect = svg.getBoundingClientRect(); const scale = W / rect.width;
    const dx = (e.clientX - drag.x) * scale; const dy = (e.clientY - drag.y) * scale;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    view.x = drag.vx + dx; view.y = drag.vy + dy; apply();
  });
  box.addEventListener('pointerup', () => {
    if (drag && !drag.moved && drag.node) navigate(drag.node.dataset.href);
    drag = null;
  });
  box.addEventListener('wheel', (e) => {
    if (!svg) return;
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, ((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H);
  }, { passive: false });
  box.addEventListener('keydown', (e) => {
    const step = 40;
    const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (map[e.key]) { e.preventDefault(); view.x += map[e.key][0]; view.y += map[e.key][1]; apply(); }
    else if (e.key === '+' || e.key === '=') zoomAt(1.2);
    else if (e.key === '-') zoomAt(1 / 1.2);
    else if (e.key === '0') { view = { x: 0, y: 0, k: 1 }; apply(); }
  });
  el.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z) { if (z.dataset.zoom === 'reset') { view = { x: 0, y: 0, k: 1 }; apply(); } else zoomAt(z.dataset.zoom === 'in' ? 1.25 : 0.8); }
    const k = e.target.closest('[data-kind]');
    if (k) { enabled[k.dataset.kind] = !enabled[k.dataset.kind]; k.classList.toggle('is-on'); k.setAttribute('aria-pressed', String(enabled[k.dataset.kind])); draw(); }
  });
  draw();
  const unsub = dataStore.subscribe((s) => { if (s.loaded.memories && !svg) draw(); });
  return unsub;
}

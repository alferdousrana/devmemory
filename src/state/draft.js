/** Hands a draft from Quick Capture to the full editor (in memory only). */
let pending = null;
export function setPendingDraft(d) { pending = d; }
export function takePendingDraft() { const d = pending; pending = null; return d; }

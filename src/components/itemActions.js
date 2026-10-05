/** Delegated handlers for the buttons rendered by components/items.js. */
import { runAction } from '../services/notify.js';
import { memoryService } from '../services/memoryService.js';
import { snippetService } from '../services/snippetService.js';
import { commandService } from '../services/commandService.js';
import { bookmarkService } from '../services/bookmarkService.js';
import { projectService } from '../services/projectService.js';

export function bindItemActions(root) {
  const handler = (e) => {
    const t = e.target;
    const hit = (attr) => t.closest(`[${attr}]`)?.getAttribute(attr);
    let id;
    if ((id = hit('data-fav-memory'))) { e.preventDefault(); runAction(() => memoryService.toggleFavorite(id)); }
    else if ((id = hit('data-fav-snippet'))) runAction(() => snippetService.toggleFavorite(id));
    else if ((id = hit('data-fav-command'))) runAction(() => commandService.toggleFavorite(id));
    else if ((id = hit('data-fav-bookmark'))) runAction(() => bookmarkService.toggleFavorite(id));
    else if ((id = hit('data-fav-project'))) { e.preventDefault(); runAction(() => projectService.toggleFavorite(id)); }
    else if ((id = hit('data-copy-command'))) runAction(() => commandService.copy(id));
    else if ((id = hit('data-copy-snippet'))) runAction(() => snippetService.copy(id));
    else if ((id = hit('data-open-snippet'))) import('./editors.js').then((m) => m.openSnippetEditor(snippetService.get(id)));
    else if ((id = hit('data-edit-command'))) import('./editors.js').then((m) => m.openCommandEditor(commandService.get(id)));
    else if ((id = hit('data-edit-bookmark'))) import('./editors.js').then((m) => m.openBookmarkEditor(bookmarkService.get(id)));
  };
  root.addEventListener('click', handler);
  return () => root.removeEventListener('click', handler);
}

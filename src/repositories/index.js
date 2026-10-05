/**
 * Repository factory. Swap implementations here (e.g. a REST backend or a
 * team workspace) without touching services or UI.
 */
export async function createFirestoreRepositories() {
  const m = await import('./FirestoreCollectionRepository.js');
  const { UserRepository } = await import('./UserRepository.js');
  return {
    memories: new m.MemoryRepository(),
    snippets: new m.SnippetRepository(),
    commands: new m.CommandRepository(),
    projects: new m.ProjectRepository(),
    bookmarks: new m.BookmarkRepository(),
    collections: new m.CollectionRepository(),
    reviews: new m.ReviewRepository(),
    activity: new m.ActivityRepository(),
    users: new UserRepository(),
  };
}

export async function createDemoRepositories() {
  const { DemoCollectionRepository, DemoUserRepository } = await import('./DemoRepository.js');
  const { buildDemoData } = await import('../data/demoData.js');
  const data = buildDemoData();
  const repos = { users: new DemoUserRepository(data.profile) };
  for (const name of ['memories', 'snippets', 'commands', 'projects', 'bookmarks', 'collections', 'reviews', 'activity']) {
    repos[name] = new DemoCollectionRepository(name, data[name] || []);
  }
  return repos;
}

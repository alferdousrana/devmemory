# Firestore indexes

`firestore.indexes.json` defines three composite indexes. Firestore creates single-field indexes automatically; composite indexes are needed when a query filters on one field and orders by another.

| Collection | Fields | Used by | Why |
| --- | --- | --- | --- |
| `memories` | `status` ASC, `nextReviewAt` ASC | `MemoryRepository.queryDueForReview()` | "Which memories are due?" — `status in […]` + `nextReviewAt <= now` + `orderBy(nextReviewAt)`. |
| `memories` | `projectId` ASC, `updatedAt` DESC | `MemoryRepository.queryByProject()` | Newest memories for one project. |
| `memories` | `type` ASC, `updatedAt` DESC | `MemoryRepository.queryByType()` | Newest memories of one type (e.g. bugs). |

**Current usage.** Today the UI reads from one live listener per collection, which is efficient for personal libraries (hundreds to a few thousand records) and makes everything work offline. These query methods are the scaling path: when a library outgrows the full listener, pages can switch to them without UI changes. Deploying the indexes now avoids "index required" errors later.

**Field overrides.** Indexing is disabled for `memories.content`, `memories.stackTrace` and `snippets.code`. They are large free-text fields that are never queried on the server (search is local). Skipping them saves index storage and avoids Firestore's index-entry size limits.

Deploy with `npm run deploy:rules` (rules + indexes) or create them in Firebase Console → Firestore → Indexes.

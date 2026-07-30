## The view-counting path (3 files)

1. `src/routes/stories.$slug.tsx` (lines 206-240) — on mount, creates/reuses a per-browser key in `localStorage` (`r2r_view_session`), calls the view server function once, sets the on-page number from the response, and refreshes story lists and analytics caches.
2. `src/lib/story-views.functions.ts` — server function; calls the database routine with the service role, then re-reads the story's `view_count` and returns it. It now throws instead of failing silently.
3. Database routine `increment_story_view` — ignores unpublished stories, skips a repeat from the same browser key within 6 hours, inserts a `story_views` row, and increments `stories.view_count`.

## What I verified

- The database routine exists and is executable by the server role (it is intentionally not callable by browsers).
- In the backend this workspace is connected to (`vxtbe…`), there are **0 stories, 0 published stories and 0 view rows** — nothing can increment there.
- Both the browser config and the server config in this workspace point at that same empty `vxtbe…` backend, but the project's `supabase/config.toml` still names a **different** backend (`hybz…`).

Since you can see stories and your manual `view_count` edits show up, the app you are looking at is reading a different backend from the one the view-writer reaches. That mismatch — not the counting logic — is the most likely cause: reads come from the backend you edit, writes land somewhere else (or fail).

## Plan

1. Confirm the split: check which backend URL the running preview and the published site actually use at runtime, and which project holds your real stories.
2. Reconcile onto one backend — repoint the app (browser + server keys, `supabase/config.toml`) at the project that owns your stories, or migrate the stories into the connected project, whichever you prefer.
3. On that single backend, confirm the schema pieces the counter needs: `increment_story_view` present, executable by the server role, and `story_views` writable by it.
4. Re-check error surfacing: the view server function already throws on failure; confirm the browser console shows "Story view tracking failed" when it does, so silent failures are impossible.
5. Verify end to end on a real published story: note the current count, open the story in a fresh browser session, confirm one new `story_views` row, `view_count + 1`, and the updated number on the page, story cards, and writer analytics.
6. Confirm the 6-hour per-browser dedupe still behaves (a second reload does not add a count).

### Technical notes
No schema or business-logic changes are planned beyond the reconciliation above; the counting rules stay as they are. No demo or seed stories will be created except a temporary one for verification, removed immediately after.

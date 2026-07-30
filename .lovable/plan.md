## Confirmed findings
- The view-count database function exists, only counts published stories, deduplicates the same browser for 6 hours, inserts a view event, and increments `stories.view_count`.
- Its server-role permission is present.
- The currently connected backend contains **0 stories and 0 view events**, so there is presently no record that this environment can increment.
- The client currently calls the server function directly and the server function ignores database errors, allowing failures to look successful.
- The latest preview console also reports missing backend URL/publishable-key bindings, indicating the preview and backend configuration are not consistently connected.

## Implementation plan
1. Rebind the existing Lovable Cloud environment variables so preview server functions and browser queries use the same connected backend.
2. Update story view tracking to call `recordStoryView` through `useServerFn`, following the app’s authenticated server-function transport pattern.
3. Make `recordStoryView` check and report both RPC and follow-up query errors instead of silently returning `null`.
4. Preserve the existing 6-hour per-browser deduplication and cache invalidation behavior.
5. Verify end to end with a published story: record the initial count, open the story using a fresh session key, confirm one new `story_views` row and a `view_count + 1`, then confirm the updated number renders on the story page.

No stories or demo content will be created unless needed solely for a temporary verification and removed immediately afterward.
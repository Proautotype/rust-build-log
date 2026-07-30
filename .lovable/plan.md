## Problem

The preview is returning 500 for `GET /_serverFn/...getHomeXTrends`. The function currently has no internal try/catch around its Supabase reads or its X-trends fetch, so any thrown error becomes a 500.

## What I will change

1. **Wrap the whole `getHomeXTrends` handler body in a try/catch** that logs the real error and returns a safe degraded response (`{ connected: false, trends: [], stories: [] }`) instead of throwing.
2. **Read environment variables defensively** in `x-public.functions.ts` — fail with a clear message if `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` is missing, and never pass `undefined` into `createClient`.
3. **Guard the in-memory cache** so a stale or corrupt cache cannot crash subsequent requests.
4. **Verify the public Supabase client query** works for anonymous readers (it only selects from published stories, which should already have a public SELECT policy).
5. **Test end-to-end** by loading the home page and confirming:
   - No 500 in the browser network tab for `/_serverFn/getHomeXTrends`.
   - The "Trending on X" section renders the disconnected/empty state cleanly.

## Out of scope

- No changes to the view-counting design (you confirmed keep current: `story_views` as event log, `stories.view_count` as displayed counter).
- No changes to X trend logic itself — only error handling and graceful degradation.

## Expected result

The landing page loads without a server-function 500, and the X-trends strip shows a friendly empty/disconnected state when X is not configured.
## What I found

- The analytics view, its permissions, and the page code are all correct. The reason the page is empty is the **data**: the only 3 stories in the database are the original seeded demos with **no creator attached** (`creator_id` is null), so no writer's analytics query can ever match them. All view counts are also still 0.
- Trending today is a fake formula in the homepage code (`promoted ? 5 : 0` + monetization weight + reading minutes) — no views, no searches.

## Plan

### 1. Clean up + real analytics data
- Delete the 3 unowned demo stories (and any orphaned journeys/comments referencing them).
- Add a `story_views` table (story_id, viewer_id nullable, session key, created_at) so views are timestamped, not just a running total, and de-duplicated per session within a window. `increment_story_view` records a row and bumps `stories.view_count`.
- Extend the `story_analytics` view with recent-window columns (views last 7/30 days) so the creator page can show trend, not just lifetime totals.
- Analytics page: add explicit empty state ("no published stories yet"), show errors instead of silently rendering zeros, and add a 7-day views column.

### 2. Trending from real signals
- Add a `story_search_events` table (query text, matched story_id, created_at) written from the landing-page search when a result is clicked/shown.
- Add a `trending_stories` view scoring each story over a rolling 7-day window:
  `views*1 + searches*2 + comments*3 + tips*4 + unlocks*5`, with promoted given a small boost.
- Homepage "Top stories" row reads from this view instead of the hardcoded formula. Falls back to newest stories when there's no activity yet.

### 3. AI agent that can post (all three modes)
**a. Studio assistant** — a panel in the Creator Studio where the writer describes a topic and the agent drafts title, slug, summary, tags and content blocks (including markdown blocks) directly into the editor. Writer reviews and publishes. Uses Lovable AI via a server function.

**b. Configurable auto-posting agent** — new `creator_agents` table per writer: enabled flag, topic/prompt, tone, cadence (daily/weekly), publish-vs-draft mode, journey to attach to, monetization defaults. A new "AI Agent" page under the writer's studio to configure it. A scheduled endpoint at `/api/public/agents/run` (protected by a shared secret, called by a cron) generates and inserts stories under that creator's account, logged in an `agent_runs` table so the writer can see what was posted.

**c. API key for external agents** — `agent_api_keys` table (hashed key, label, creator, last used). Writers generate a key in the Studio; an endpoint `POST /api/public/agent/stories` accepts a story payload (or a prompt to generate from), authenticates by key, and posts under that creator. Key is shown once on creation.

All agent-created stories are marked with an `ai_generated` flag and shown with an "AI-assisted" badge in the Studio list and analytics.

### Technical notes
- New tables get GRANTs + RLS scoped to `auth.uid()`; search/view event tables allow anonymous inserts only.
- Agent generation runs server-side through Lovable AI (no key handling for you).
- Cron secret and API key hashing handled server-side; keys never stored in plaintext.

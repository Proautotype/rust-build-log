## Short answer

Yes. X has a first-class connector in Lovable, and its app-only read access can search recent public posts — enough to detect what's trending for a set of keywords. R2R then feeds those posts to the existing AI writer (`src/lib/agent.server.ts`) and produces an original article that cites the sources, rather than republishing posts.

## How it works

```text
X search (recent posts, ranked by engagement)
        ↓
cluster into "trends" per keyword
        ↓
Lovable AI writes an original article + summary + tags
        ↓
story row under the creator (draft or published)
```

## 1. Connect X

Connect the X connector (app-only API key). This gives read-only access to recent public post search and user lookup — no posting to X, which we don't need. All calls happen server-side through the connector gateway; nothing hits the browser.

## 2. Trend fetching

New server-only helper that, given keywords:
- searches recent public posts (last 24–48h) for each keyword, excluding retweets/replies
- ranks by engagement (likes + reposts + replies) and recency
- groups the top posts into 3–5 candidate "trends" with a short label
- returns post text, author handle, permalink and metrics

Results are cached briefly in the database so cron runs and Studio previews don't burn X rate limits. Repeated 4xx stops the loop; 429 backs off on `Retry-After`.

## 3. Manual: "Pull from X" in the Studio

New panel next to the existing AI Draft control:
- keyword/hashtag input, pre-filled from the writer's agent topic or from the R2R signup interest topics
- shows the fetched trends with engagement counts and links
- writer picks one → AI generates title, summary, tags and markdown, loaded straight into the editor
- a "Sources" list of the X permalinks is appended to the draft so the story attributes what it's based on
- writer reviews and publishes as usual

## 4. Scheduled: X as an agent source

Extend the existing `creator_agents` config with:
- source mode: `topic` (today's behaviour) or `x_trends`
- X keywords list, plus an option "use my readers' interest topics" that falls back to the R2R topic list
- optional minimum-engagement threshold so quiet days produce nothing instead of filler

The existing `/api/public/agents/run` cron endpoint gains the X branch: for each due agent in `x_trends` mode it fetches trends, skips any trend already used (deduped by a stored trend key), generates the story, and posts as draft or published according to `auto_publish`. Every run is logged in `agent_runs` with the trend label and source links, and stories keep the existing `ai_generated` flag / "AI-assisted" badge.

## 5. Content & safety guardrails

- The article is original prose about the topic; posts are used as source material and quoted sparingly with attribution and a link back to X.
- Prompt instructs the model to attribute claims, avoid presenting rumours as fact, and skip trends that are abusive, graphic or purely spam.
- Nothing auto-publishes unless the writer has already enabled auto-publish.

## Technical notes

- New table `agent_trend_sources` (agent/creator, trend key, label, source post URLs, used_at) for dedupe and audit, with GRANTs + RLS scoped to `auth.uid()`.
- Additional columns on `creator_agents` for source mode, keywords and engagement threshold.
- X calls live in a `.server.ts` helper called from a `createServerFn` (Studio) and from the cron route — the connector key is never exposed to the client.
- If the X connection is missing or rate-limited, the Studio panel shows the real provider error and the scheduled agent logs a `skipped` run instead of failing silently.

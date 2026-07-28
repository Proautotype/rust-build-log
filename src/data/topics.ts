/**
 * Reader interest topics. Used for signup onboarding, the "For you" feed and
 * guest topic chips. Each topic maps to categories/tags/keywords so we can
 * score any story against a reader's picks without extra database columns.
 */
export interface Topic {
  id: string;
  label: string;
  emoji: string;
  /** Words matched against a story's title, description, category and tags. */
  keywords: string[];
}

export const TOPICS: Topic[] = [
  { id: "sports", label: "Sports", emoji: "🏆", keywords: ["sport", "football", "soccer", "basketball", "nba", "nfl", "athlete", "match", "league", "olympic"] },
  { id: "politics", label: "Politics", emoji: "🏛️", keywords: ["politic", "election", "government", "policy", "senate", "president", "parliament", "vote"] },
  { id: "celebrity", label: "Celebrity", emoji: "🌟", keywords: ["celebrity", "star", "actor", "actress", "hollywood", "red carpet", "fame"] },
  { id: "gossip", label: "Gossip", emoji: "👀", keywords: ["gossip", "rumor", "rumour", "drama", "scandal", "tea", "buzz"] },
  { id: "social", label: "Social media", emoji: "📱", keywords: ["social media", "tiktok", "instagram", "twitter", "creator", "influencer", "viral", "youtube"] },
  { id: "entertainment", label: "Entertainment", emoji: "🎬", keywords: ["entertainment", "movie", "film", "series", "tv", "netflix", "show", "cinema"] },
  { id: "music", label: "Music", emoji: "🎧", keywords: ["music", "album", "song", "artist", "rap", "afrobeat", "concert", "playlist"] },
  { id: "tech", label: "Tech", emoji: "💻", keywords: ["tech", "software", "developer", "code", "programming", "rust", "ai", "startup", "web", "systems programming", "backend", "cli tools", "embedded", "web development", "fundamentals"] },
  { id: "business", label: "Business", emoji: "📈", keywords: ["business", "market", "startup", "economy", "finance", "money", "invest", "crypto"] },
  { id: "lifestyle", label: "Lifestyle", emoji: "🧘", keywords: ["lifestyle", "wellness", "fashion", "beauty", "home", "relationship", "self"] },
  { id: "health", label: "Health", emoji: "🩺", keywords: ["health", "fitness", "mental", "medicine", "nutrition", "diet", "workout"] },
  { id: "science", label: "Science", emoji: "🔬", keywords: ["science", "research", "space", "physics", "climate", "biology", "study"] },
  { id: "education", label: "Education", emoji: "📚", keywords: ["education", "learn", "tutorial", "guide", "course", "school", "student", "beginner"] },
  { id: "travel", label: "Travel", emoji: "✈️", keywords: ["travel", "trip", "destination", "city", "flight", "tourism", "adventure"] },
  { id: "food", label: "Food", emoji: "🍜", keywords: ["food", "recipe", "cook", "restaurant", "kitchen", "chef", "drink"] },
  { id: "gaming", label: "Gaming", emoji: "🎮", keywords: ["gaming", "game", "console", "playstation", "xbox", "esports", "steam"] },
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<string, Topic>;

export function topicLabel(id: string): string {
  return TOPIC_BY_ID[id]?.label ?? id;
}

export interface ScorableStory {
  title: string;
  shortDescription: string;
  category: string;
  tags: string[];
}

/** How strongly a story matches a set of topic ids. 0 = no signal. */
export function topicScore(story: ScorableStory, topicIds: string[]): number {
  if (topicIds.length === 0) return 0;
  const hay = [story.title, story.shortDescription, story.category, ...story.tags]
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const id of topicIds) {
    const topic = TOPIC_BY_ID[id];
    if (!topic) continue;
    if (hay.includes(topic.label.toLowerCase())) score += 3;
    for (const kw of topic.keywords) {
      if (hay.includes(kw)) score += 2;
    }
  }
  return score;
}

/** Best-guess topic for a story, used to label cards and group rows. */
export function primaryTopic(story: ScorableStory): Topic | null {
  let best: { topic: Topic; score: number } | null = null;
  for (const topic of TOPICS) {
    const score = topicScore(story, [topic.id]);
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }
  return best?.topic ?? null;
}

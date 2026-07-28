import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_X_SETTINGS, type WriterXSettings } from "./x-settings";

export { DEFAULT_X_SETTINGS };
export type { WriterXSettings };


const settingsInput = z.object({
  enabled: z.boolean(),
  keywords: z.array(z.string().max(80)).max(5),
  use_reader_interests: z.boolean(),
  min_engagement: z.number().int().min(0).max(1000000),
  default_category: z.string().max(80),
  default_tone: z.string().max(120),
  auto_publish: z.boolean(),
  show_on_home: z.boolean(),
});

/** Per-writer X trend preferences. Falls back to sane defaults on first use. */
export const getMyXSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WriterXSettings> => {
    const { data, error } = await context.supabase
      .from("writer_x_settings")
      .select(
        "enabled, keywords, use_reader_interests, min_engagement, default_category, default_tone, auto_publish, show_on_home",
      )
      .eq("creator_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ...DEFAULT_X_SETTINGS, ...(data ?? {}) } as WriterXSettings;
  });

export const saveMyXSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      creator_id: context.userId,
      ...data,
      keywords: data.keywords.map((k) => k.trim()).filter(Boolean),
    };
    const { error } = await context.supabase
      .from("writer_x_settings")
      .upsert(payload, { onConflict: "creator_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Turn one X trend into a story on the writer's own account, published straight
 * away when the writer enabled auto-publish (or asked for it explicitly).
 */
export const publishStoryFromTrend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        keyword: z.string().min(1).max(80),
        publish: z.boolean().optional(),
        posts: z
          .array(
            z.object({
              author: z.string().max(80),
              text: z.string().max(2000),
              url: z.string().max(300),
              likes: z.number().int().min(0),
              reposts: z.number().int().min(0),
            }),
          )
          .min(1)
          .max(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [{ generateStory }, { postStoryAsCreator }] = await Promise.all([
      import("./agent.server"),
      import("./agent-run.server"),
    ]);

    const { data: row } = await context.supabase
      .from("writer_x_settings")
      .select("default_category, default_tone, auto_publish")
      .eq("creator_id", context.userId)
      .maybeSingle();
    const settings = { ...DEFAULT_X_SETTINGS, ...(row ?? {}) };

    const briefing = data.posts
      .map(
        (p) =>
          `- @${p.author} (${p.likes} likes, ${p.reposts} reposts): ${p.text.replace(/\s+/g, " ").trim()} [${p.url}]`,
      )
      .join("\n");

    const draft = await generateStory({
      topic: `What is trending on X about "${data.keyword}"`,
      tone: settings.default_tone,
      category: settings.default_category,
      extraInstructions: [
        `These are the highest-engagement recent public posts on X about "${data.keyword}":`,
        briefing,
        ``,
        `Write an ORIGINAL article explaining the trend, why it matters and what readers should take from it.`,
        `Do not copy post text verbatim; paraphrase and attribute by @handle where you reference someone.`,
      ].join("\n"),
    });

    const sources = data.posts.map((p) => `- [@${p.author} on X](${p.url})`).join("\n");
    const story = await postStoryAsCreator({
      creatorId: context.userId,
      title: draft.title,
      slug: draft.slug,
      shortDescription: draft.shortDescription,
      markdown: `${draft.markdown}\n\n## Sources\n\nBased on public posts on X:\n\n${sources}\n`,
      tags: draft.tags,
      category: settings.default_category,
      readingMinutes: draft.readingMinutes,
      published: data.publish ?? settings.auto_publish,
      xTrendKeyword: data.keyword,
      xSourceUrls: data.posts.map((p) => p.url),
    });

    return story;
  });

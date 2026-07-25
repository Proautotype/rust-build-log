import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const storyInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  short_description: z.string().optional().default(""),
  cover: z.string().optional().default(""),
  category: z.string().optional().default("Fundamentals"),
  difficulty: z.string().optional().default("Beginner"),
  reading_minutes: z.number().int().nonnegative().default(5),
  tags: z.array(z.string()).default([]),
  content: z.array(z.any()).default([]),
  published: z.boolean().default(false),
  journey_id: z.string().uuid().nullable().optional(),
  monetization: z.enum(["free", "tips", "locked"]).default("free"),
  unlock_price: z.number().int().min(0).max(100000).default(0),
  tip_enabled: z.boolean().default(false),
  promoted: z.boolean().default(false),
});

const journeyInput = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional().default(""),
  cover: z.string().optional().default(""),
});

export const listMyStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stories")
      .select(
        "id, title, slug, short_description, cover, category, difficulty, reading_minutes, tags, content, published, journey_id, monetization, unlock_price, tip_enabled, promoted, created_at, updated_at",
      )
      .eq("creator_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyStory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("stories")
      .select("*")
      .eq("id", data.id)
      .eq("creator_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => storyInput.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      creator_id: context.userId,
      title: data.title,
      slug: data.slug,
      short_description: data.short_description,
      cover: data.cover,
      category: data.category,
      difficulty: data.difficulty,
      reading_minutes: data.reading_minutes,
      tags: data.tags,
      content: data.content as unknown as Json,
      published: data.published,
      journey_id: data.journey_id ?? null,
      monetization: data.monetization,
      unlock_price: data.monetization === "locked" ? data.unlock_price : 0,
      tip_enabled: data.monetization === "locked" ? false : data.tip_enabled,
      promoted: data.promoted,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("stories")
        .update(payload)
        .eq("id", data.id)
        .eq("creator_id", context.userId)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("stories")
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMyStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("stories")
      .delete()
      .eq("id", data.id)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Show the user's own journeys plus any other (public view is allowed)
    const { data, error } = await context.supabase
      .from("journeys")
      .select("id, title, slug, description, cover, creator_id, started_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => journeyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("journeys")
      .insert({
        creator_id: context.userId,
        title: data.title,
        slug: data.slug,
        description: data.description,
        cover: data.cover,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

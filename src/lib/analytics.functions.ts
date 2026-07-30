import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface StoryAnalyticsRow {
  story_id: string;
  creator_id: string | null;
  title: string;
  slug: string;
  published: boolean;
  view_count: number;
  unlock_count: number;
  unlock_revenue: number;
  tip_count: number;
  tip_revenue: number;
  comment_count: number;
}

export const getMyStoryAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoryAnalyticsRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa = context.supabase as any;
    const { data, error } = await supa.rpc("my_story_analytics");
    if (error) throw new Error(error.message);
    return (data ?? []) as StoryAnalyticsRow[];
  });

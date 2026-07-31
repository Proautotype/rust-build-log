import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/backend/client";

export interface SiteSettings {
  id: string;
  adsense_enabled: boolean;
  adsense_client: string | null;
  adsense_slot: string | null;
  adsense_global_enabled: boolean;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings | null> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("id, adsense_enabled, adsense_client, adsense_slot, adsense_global_enabled")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SiteSettings | null;
    },
    staleTime: 60_000,
  });
}

export interface WriterXSettings {
  enabled: boolean;
  keywords: string[];
  use_reader_interests: boolean;
  min_engagement: number;
  default_category: string;
  default_tone: string;
  auto_publish: boolean;
  show_on_home: boolean;
}

export const DEFAULT_X_SETTINGS: WriterXSettings = {
  enabled: true,
  keywords: [],
  use_reader_interests: true,
  min_engagement: 20,
  default_category: "social",
  default_tone: "clear, engaging, factual",
  auto_publish: false,
  show_on_home: true,
};

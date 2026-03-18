export type BaseMoodId = 'tension' | 'sadness' | 'excitement' | 'warmth' | 'mystery';
export type DynamicEventId = 'steady' | 'sudden_shock' | 'gradual_rise' | 'sudden_silence';

export interface BaseMoodSetting {
  id: BaseMoodId;
  label: string;
  description: string;
  color: string;
  enabled: boolean;
}

export interface DynamicEventSetting {
  id: DynamicEventId;
  label: string;
  description: string;
  enabled: boolean;
}

export interface ChannelSettings {
  baseMoods: BaseMoodSetting[];
  moodIntensity: number; // 0–100
  dynamicEvents: DynamicEventSetting[];
}

export interface PlaybackStats {
  completionRate: number;       // 0–100 (%)
  totalPlayCount: number;
  lastFeedbackRequestDate: number | null; // Date.now() timestamp
  totalFeedbackRequestCount: number;
}

export type BaseMoodLabel = 'tension' | 'sorrow' | 'uplift' | 'warmth' | 'unknown';
export type EventType = 'stable' | 'jump_scare' | 'swell' | 'sudden_drop';

export type BaseMood = {
  label: BaseMoodLabel;
  intensity: number; // 0~1
  start: number;     // sec
  end: number;       // sec
};

export type DynamicEvent = {
  type: EventType;
  trigger_time: number; // sec
  duration: number;     // sec
  strength: number;     // 0~1
};

export type EmotionTimeline = {
  schemaVersion: '1.0.0';
  videoUrl: string;
  base_moods: BaseMood[];
  events: DynamicEvent[];
};

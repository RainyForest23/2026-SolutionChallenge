import { BaseMoodLabel, EventType } from './emotionTypes';

export type BaseMoodVisualToken = {
  color: string;
  minOpacity: number;
  maxOpacity: number;
  glowWidthMin: number; // px
  glowWidthMax: number; // px
};

export const BASE_MOOD_TOKEN: Record<BaseMoodLabel, BaseMoodVisualToken> = {
  tension: { color: '#C81C30', minOpacity: 0.18, maxOpacity: 0.45, glowWidthMin: 2, glowWidthMax: 8 },
  sorrow:  { color: '#0388A6', minOpacity: 0.16, maxOpacity: 0.40, glowWidthMin: 2, glowWidthMax: 7 },
  uplift:  { color: '#F9B95C', minOpacity: 0.18, maxOpacity: 0.42, glowWidthMin: 2, glowWidthMax: 8 },
  warmth:  { color: '#A6B13C', minOpacity: 0.16, maxOpacity: 0.38, glowWidthMin: 2, glowWidthMax: 7 },
  unknown: { color: '#A1A1F7', minOpacity: 0.14, maxOpacity: 0.36, glowWidthMin: 2, glowWidthMax: 7 },
};

export type EventPreset = {
  minLengthRatio: number; // 0~1 (화면 폭 대비 바 길이)
  maxLengthRatio: number;
  minOpacity: number;
  maxOpacity: number;
  minThickness: number; // px
  maxThickness: number; // px
  impactMs?: number;
  recoverMs?: number;
  easing?: 'easeIn' | 'easeOut' | 'easeInOut' | 'easeOutCubic';
};

export const EVENT_PRESET: Record<EventType, EventPreset> = {
  stable: {
    minLengthRatio: 0.55,
    maxLengthRatio: 0.85,
    minOpacity: 0.55,
    maxOpacity: 0.85,
    minThickness: 4,
    maxThickness: 5,
    easing: 'easeInOut',
  },
  jump_scare: {
    minLengthRatio: 0.3,
    maxLengthRatio: 1.0,
    minOpacity: 0.4,
    maxOpacity: 0.9,
    minThickness: 2,
    maxThickness: 5,
    impactMs: 120,
    recoverMs: 300,
    easing: 'easeOut',
  },
  swell: {
    minLengthRatio: 0.3,
    maxLengthRatio: 1.0,
    minOpacity: 0.4,
    maxOpacity: 0.75,
    minThickness: 2,
    maxThickness: 5,
    easing: 'easeOutCubic',
  },
  sudden_drop: {
    minLengthRatio: 0.8,
    maxLengthRatio: 0.1,
    minOpacity: 0.05,
    maxOpacity: 0.4,
    minThickness: 1,
    maxThickness: 4,
    easing: 'easeIn',
  },
};

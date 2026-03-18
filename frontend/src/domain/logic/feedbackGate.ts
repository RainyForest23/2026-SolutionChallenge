import { PlaybackStats } from '../types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowFeedback(stats: PlaybackStats): boolean {
  if (stats.completionRate < 80) return false;
  if (stats.totalPlayCount < 5) return false;
  if (
    stats.lastFeedbackRequestDate !== null &&
    Date.now() - stats.lastFeedbackRequestDate < SEVEN_DAYS_MS
  ) return false;
  if (stats.totalFeedbackRequestCount >= 3) return false;
  return true;
}

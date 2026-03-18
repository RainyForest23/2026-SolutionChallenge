import { PlaybackStats } from '../domain/types';

// 모듈 레벨 상태 (API 연결 전 임시)
let _stats: PlaybackStats = {
  completionRate: 0,
  totalPlayCount: 0,
  lastFeedbackRequestDate: null,
  totalFeedbackRequestCount: 0,
};

export const getPlaybackStats = (): PlaybackStats => _stats;

export const recordPlaybackEnd = (completionRate: number) => {
  _stats = {
    ..._stats,
    completionRate,
    totalPlayCount: _stats.totalPlayCount + 1,
  };
};

export const recordFeedbackShown = () => {
  _stats = {
    ..._stats,
    lastFeedbackRequestDate: Date.now(),
    totalFeedbackRequestCount: _stats.totalFeedbackRequestCount + 1,
  };
};

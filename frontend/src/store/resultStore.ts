import { EmotionTimeline } from '../domain/emotionTypes';

type AnalysisResult = {
  timeline: EmotionTimeline;
  videoUrl: string; // Firebase Storage 다운로드 URL
};

let current: AnalysisResult | null = null;

export function setAnalysisResult(result: AnalysisResult) {
  current = result;
}

export function getAnalysisResult(): AnalysisResult | null {
  return current;
}

export function clearAnalysisResult() {
  current = null;
}

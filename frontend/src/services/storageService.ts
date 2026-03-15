import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { EmotionTimeline } from '../domain/emotionTypes';

// Firebase Storage 경로 → 다운로드 URL
export async function getStorageDownloadUrl(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return await getDownloadURL(storageRef);
}

// result.json 다운로드 → EmotionTimeline 파싱
export async function fetchEmotionTimeline(resultPath: string): Promise<EmotionTimeline> {
  const url = await getStorageDownloadUrl(resultPath);
  const res = await fetch(url);
  if (!res.ok) throw new Error('감정 분석 결과를 불러오지 못했습니다.');
  return res.json() as Promise<EmotionTimeline>;
}

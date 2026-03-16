import { getCurrentUserIdToken } from './authService';
import { EmotionTimeline } from '../domain/emotionTypes';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

export type JobStatus = 'queued' | 'downloading' | 'uploading' | 'processing' | 'done' | 'failed';

export type JobStatusResponse = {
  job_id: string;
  status: JobStatus;
  error?: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const idToken = await getCurrentUserIdToken();
  if (!idToken) throw new Error('로그인이 필요합니다.');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  };
}

export async function requestAnalysis(videoUrl: string): Promise<{ job_id: string; video_id: string }> {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ youtube_url: videoUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `요청 실패 (${res.status})`);
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${BASE_URL}/api/status?job_id=${jobId}`, {
    headers: await authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `상태 조회 실패 (${res.status})`);
  }

  return res.json();
}

export async function getResultFromApi(jobId: string): Promise<EmotionTimeline> {
  const res = await fetch(`${BASE_URL}/api/result?job_id=${jobId}`, {
    headers: await authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `결과 조회 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.result;
}

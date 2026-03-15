import { getCurrentUserIdToken } from './authService';
import { EmotionTimeline } from '../domain/emotionTypes';

// ← 백엔드 노트북 IP 받으면 여기만 교체 (예: 'http://192.168.0.xx:8080')
const BASE_URL = 'http://YOUR_BACKEND_IP:8080';

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

// POST /api/analyze → job_id 반환
export async function requestAnalysis(videoUrl: string): Promise<{ job_id: string; video_id: string }> {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ url: videoUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `요청 실패 (${res.status})`);
  }

  return res.json();
}

// GET /api/status?job_id=XYZ → 현재 상태 반환
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

// GET /api/result?job_id=XYZ → EmotionTimeline JSON 반환
export async function getResultFromApi(jobId: string): Promise<EmotionTimeline> {
  const res = await fetch(`${BASE_URL}/api/result?job_id=${jobId}`, {
    headers: await authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `결과 조회 실패 (${res.status})`);
  }

  return res.json();
}

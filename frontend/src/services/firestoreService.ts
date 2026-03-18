import {
  doc, onSnapshot,
  collection, query, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { JobStatus } from './analysisService';

export function listenJobStatus(
  uid: string,
  jobId: string,
  onUpdate: (status: JobStatus, videoId: string | null, error?: string) => void,
): () => void {
  const ref = doc(db, 'users', uid, 'jobs', jobId);
  const unsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    onUpdate(data.status as JobStatus, data.videoId ?? null, data.error ?? undefined);
  });
  return unsubscribe;
}

export async function getLatestResultPath(uid: string, videoId: string): Promise<string> {
  const colRef = collection(db, 'users', uid, 'videos', videoId, 'analysis_results');
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('분석 결과를 찾을 수 없습니다.');
  return snap.docs[0].data().resultPath as string;
}

export async function getVideoStoragePath(uid: string, videoId: string): Promise<string> {
  const { getDoc } = await import('firebase/firestore');
  const ref = doc(db, 'users', uid, 'videos', videoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('영상 정보를 찾을 수 없습니다.');
  return snap.data().storagePath as string;
}

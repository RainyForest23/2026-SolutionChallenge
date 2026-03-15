import { useEffect, useRef, useState } from 'react';
import { View, Text, ImageBackground, StyleSheet, Dimensions, Animated, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import HeartProgress from '../components/HeartProgess';
import { requestAnalysis, getJobStatus, getResultFromApi, JobStatus } from '../services/analysisService';
import { setAnalysisResult } from '../store/resultStore';

const { width, height } = Dimensions.get('window');
const HEART_SIZE = width * 0.55;
const WAVE_SIZE = width * 0.54;
const POLL_INTERVAL_MS = 3000; // 3초마다 폴링

const STATUS_PROGRESS: Record<JobStatus, number> = {
  queued:      10,
  downloading: 30,
  uploading:   55,
  processing:  75,
  done:        100,
  failed:      0,
};

const STATUS_LABEL: Record<JobStatus, string> = {
  queued:      '분석 대기 중...',
  downloading: '영상 다운로드 중...',
  uploading:   '저장 중...',
  processing:  'AI 분석 중...',
  done:        '완료',
  failed:      '분석 실패',
};

export default function LoadingScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState('분석 요청 중...');
  const navigatedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 심장 박동 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!url) return;

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const handleError = (message: string) => {
      stopPolling();
      Alert.alert('오류', message, [
        { text: '확인', onPress: () => router.back() },
      ]);
    };

    const run = async () => {
      try {
        // 1. POST /api/analyze → job_id 받기
        const { job_id } = await requestAnalysis(url);

        // 2. 3초마다 GET /api/status 폴링
        pollTimerRef.current = setInterval(async () => {
          if (navigatedRef.current) return;

          try {
            const { status, error } = await getJobStatus(job_id);

            setProgress(STATUS_PROGRESS[status]);
            setStatusLabel(STATUS_LABEL[status]);

            if (status === 'failed') {
              navigatedRef.current = true;
              handleError(error ?? '분석 중 문제가 발생했습니다.');
              return;
            }

            if (status === 'done') {
              navigatedRef.current = true;
              stopPolling();

              // 3. GET /api/result → EmotionTimeline JSON
              const timeline = await getResultFromApi(job_id);

              // 4. 저장 후 VideoScreen으로 이동
              setAnalysisResult({ timeline, videoUrl: timeline.videoUrl });
              router.replace('/video' as any);
            }
          } catch (e: any) {
            navigatedRef.current = true;
            handleError(e?.message ?? '상태 확인 중 오류가 발생했습니다.');
          }
        }, POLL_INTERVAL_MS);

      } catch (e: any) {
        handleError(e?.message ?? '분석 요청에 실패했습니다.');
      }
    };

    run();

    return () => stopPolling();
  }, [url]);

  return (
    <ImageBackground
      source={require('../../assets/images/loadingbg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Animated.View style={[styles.heartWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <HeartProgress progress={progress} size={WAVE_SIZE} />
        </Animated.View>

        <Text style={styles.percent}>{progress}%</Text>
        <Text style={styles.label}>{statusLabel}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: height * 0.015,
  },
  heartWrapper: {
    width: HEART_SIZE,
    height: HEART_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontSize: width * 0.09,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  label: {
    fontSize: width * 0.033,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
  },
});

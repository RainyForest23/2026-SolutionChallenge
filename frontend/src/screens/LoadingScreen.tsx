import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import HeartProgress from '../components/HeartProgess';
import { requestAnalysis, getJobStatus, getResultFromApi, JobStatus } from '../services/analysisService';
import { setAnalysisResult } from '../store/resultStore';

const POLL_INTERVAL_MS = 3000;

const STATUS_PROGRESS: Record<JobStatus, number> = {
  queued: 10,
  downloading: 30,
  uploading: 55,
  processing: 75,
  done: 100,
  failed: 0,
};

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: '분석 대기 중...',
  downloading: '영상 다운로드 중...',
  uploading: '저장 중...',
  processing: 'AI 분석 중...',
  done: '완료',
  failed: '분석 실패',
};

export default function LoadingScreen() {
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => getStyles(width, height), [width, height]);
  const heartSize = Platform.OS === 'web' ? clamp(width * 0.24, 180, 320) : clamp(width * 0.55, 180, 300);
  const { url } = useLocalSearchParams<{ url: string }>();
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState('분석 요청 중...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!url) {
      setErrorMessage('분석할 YouTube URL이 전달되지 않았습니다.');
      setStatusLabel('분석 실패');
      return;
    }

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const handleError = (message: string) => {
      stopPolling();
      setProgress(0);
      setStatusLabel('분석 실패');
      setErrorMessage(normalizeErrorMessage(message));
    };

    const pollStatus = async (jobId: string) => {
      if (navigatedRef.current) return;

      try {
        const { status, error } = await getJobStatus(jobId);
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

          const timeline = await getResultFromApi(jobId);
          setAnalysisResult({ timeline, videoUrl: timeline.videoUrl });
          router.replace('/video' as any);
        }
      } catch (e: any) {
        navigatedRef.current = true;
        handleError(e?.message ?? '상태 확인 중 오류가 발생했습니다.');
      }
    };

    const run = async () => {
      try {
        const { job_id } = await requestAnalysis(url);
        setProgress(STATUS_PROGRESS.queued);
        setStatusLabel(STATUS_LABEL.queued);

        await pollStatus(job_id);
        if (navigatedRef.current) return;

        pollTimerRef.current = setInterval(() => {
          pollStatus(job_id);
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
          <HeartProgress progress={progress} size={heartSize} />
        </Animated.View>

        <Text style={styles.percent}>{progress}%</Text>
        <Text style={styles.label}>{statusLabel}</Text>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>분석을 완료하지 못했어요</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/home' as any)}>
                <Text style={styles.secondaryButtonText}>홈으로</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace({ pathname: '/loading' as any, params: { url } })}>
                <Text style={styles.primaryButtonText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.helperText}>
            공개 웹 데모에서는 YouTube 보안 정책 때문에 일부 링크가 실패할 수 있습니다.
          </Text>
        )}
      </View>
    </ImageBackground>
  );
}

function normalizeErrorMessage(message: string) {
  const text = (message || '').trim();

  if (text.includes('Sign in to confirm you’re not a bot') || text.includes("Sign in to confirm you're not a bot")) {
    return 'YouTube가 현재 서버 요청을 봇으로 판단해 다운로드를 막고 있습니다. 공개 Cloud Run 환경에서는 일부 링크가 실패할 수 있어요. 로컬 데모나 대체 샘플 링크로 시연하는 편이 더 안정적입니다.';
  }

  return text || '분석 중 문제가 발생했습니다.';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getStyles(width: number, height: number) {
  const isWeb = Platform.OS === 'web';
  const spacing = clamp(height * 0.018, 14, 24);
  const maxCardWidth = isWeb ? 620 : width - 40;

  return StyleSheet.create({
    background: { flex: 1, width: '100%', height: '100%' },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isWeb ? 24 : 18,
      paddingVertical: isWeb ? 40 : 24,
      gap: spacing,
    },
    heartWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: clamp(height * 0.01, 0, 8),
    },
    percent: {
      fontSize: clamp(width * 0.09, 56, 116),
      fontWeight: '700',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.12)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
      lineHeight: clamp(width * 0.1, 64, 124),
    },
    label: {
      fontSize: clamp(width * 0.024, 16, 26),
      fontWeight: '600',
      color: 'rgba(255,255,255,0.92)',
      letterSpacing: 1.2,
      textAlign: 'center',
    },
    helperText: {
      marginTop: 4,
      maxWidth: maxCardWidth,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.82)',
      fontSize: clamp(width * 0.018, 13, 16),
      lineHeight: clamp(width * 0.028, 20, 24),
      paddingHorizontal: 12,
    },
    errorCard: {
      width: '100%',
      maxWidth: maxCardWidth,
      marginTop: 8,
      paddingHorizontal: isWeb ? 28 : 20,
      paddingVertical: isWeb ? 24 : 18,
      backgroundColor: 'rgba(255,255,255,0.76)',
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.86)',
      shadowColor: '#5D6485',
      shadowOpacity: isWeb ? 0.16 : 0,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    errorTitle: {
      fontSize: clamp(width * 0.03, 20, 26),
      fontWeight: '700',
      color: '#353535',
      textAlign: 'center',
      marginBottom: 10,
    },
    errorBody: {
      fontSize: clamp(width * 0.02, 15, 18),
      lineHeight: clamp(width * 0.03, 22, 28),
      color: '#525252',
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: isWeb ? 'row' : 'column',
      gap: 12,
      justifyContent: 'center',
      marginTop: 18,
    },
    secondaryButton: {
      minWidth: 132,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(130,130,130,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: '#555',
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButton: {
      minWidth: 132,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 999,
      backgroundColor: '#9694F2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}

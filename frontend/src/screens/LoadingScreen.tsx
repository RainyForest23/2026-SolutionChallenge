import { useEffect, useRef, useState } from 'react';
import { View, Text, ImageBackground, StyleSheet, Dimensions, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import HeartProgress from '../components/HeartProgess'; // 경로 확인 필요

const { width, height } = Dimensions.get('window');
const HEART_SIZE = width * 0.55;
const WAVE_SIZE = width * 0.54;

export default function LoadingScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 퍼센트 증가 로직
  useEffect(() => {
    navigatedRef.current = false;
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + 2;
        if (next >= 100) {
          clearInterval(intervalRef.current!);
          return 100;
        }
        return next;
      });
    }, 60);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [url]);

  // 심장 박동(Pulse) 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // 로딩 완료 후 이동
  useEffect(() => {
    if (progress >= 100 && !navigatedRef.current) {
      navigatedRef.current = true;
      router.replace({ pathname: '/video' as any, params: { url } });
    }
  }, [progress, url]);

  return (
    <ImageBackground
      source={require('../../assets/images/loadingbg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* 하트 진행 표시 */}
        <Animated.View style={[styles.heartWrapper, { transform: [{ scale: pulseAnim }] }]}>
          {/* 위치 어긋나게 하던 View 래퍼 제거하고 바로 SVG 렌더링 */}
          <HeartProgress progress={progress} size={WAVE_SIZE} />
        </Animated.View>

        <Text style={styles.percent}>{progress}%</Text>
        <Text style={styles.label}>LOADING</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: height * 0.015,
  },
  heartWrapper: {
    width: HEART_SIZE,
    height: HEART_SIZE,
    alignItems: 'center',      // 가로 중앙 정렬
    justifyContent: 'center',  // 세로 중앙 정렬
    // absolute 위치 관련 속성 모두 제거하여 Flexbox 기반으로 정중앙 위치
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
    letterSpacing: 3,
  },
});
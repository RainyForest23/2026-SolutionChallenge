import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import Video from 'react-native-video';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { getSettings } from '../store/settingsStore';
import { getAnalysisResult } from '../store/resultStore';
import { BASE_MOOD_TOKEN } from '../domain/emotionTokens';
import { BaseMood, DynamicEvent, EmotionTimeline } from '../domain/emotionTypes';
import MoodGlow from '../components/MoodGlow';
import DynamicEventBar from '../components/DynamicEventBar';

type Step = 'initial' | 'negative' | 'positive' | 'thanks';

const NEGATIVE_OPTIONS = ['색이 너무 강해요', '오히려 집중에 방해돼요', '변화가 잘 안 보여요'];
const POSITIVE_OPTIONS = ['감정이 잘 느껴졌어요', '분위기 파악이 쉬웠어요', '색 변화가 자연스러워요'];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function setNavBar(visible: boolean) {
  if (Platform.OS === 'android') {
    try {
      if (visible) {
        // 터치 시 nav bar가 뜨도록 behavior 먼저 설정 후 표시 (가로 모드 대응)
        await NavigationBar.setBehaviorAsync('inset-touch');
        await NavigationBar.setVisibilityAsync('visible');
      } else {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      }
    } catch (_) {}
  }
}

function getActiveMood(timeline: EmotionTimeline, t: number): BaseMood | null {
  return timeline.base_moods.find(m => t >= m.start && t < m.end) ?? null;
}

function getActiveEvent(timeline: EmotionTimeline, t: number): DynamicEvent | null {
  return timeline.events.find(e => t >= e.trigger_time && t < e.trigger_time + e.duration) ?? null;
}

export default function VideoScreen() {
  const settings = getSettings();
  const result = getAnalysisResult();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const DEFAULT_SHEET_H = height * 0.5;
  const THANKS_SHEET_H = height * 0.28;

  const videoRef = useRef<any>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarWidth = useRef(0);

  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [step, setStep] = useState<Step>('initial');

  const progress = duration > 0 ? currentTime / duration : 0;

  // 컨트롤 자동 숨김 타이머
  const startHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const showControlsFor = useCallback(() => {
    setShowControls(true);
    startHideTimer();
  }, [startHideTimer]);

  // 기기 방향에 따라 자동으로 가로/세로 감지
  useEffect(() => {
    ScreenOrientation.unlockAsync();

    const sub = ScreenOrientation.addOrientationChangeListener((e) => {
      const { orientation } = e.orientationInfo;
      const landscape =
        orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setIsFullScreen(landscape);
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(sub);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setNavBar(true);
    };
  }, []);

  // 가로/세로 상관없이 컨트롤 표시 여부와 네비게이션 바 동기화
  useEffect(() => {
    setNavBar(showControls);
  }, [showControls]);

  const handleVideoTap = () => {
    if (showControls) {
      setShowControls(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      showControlsFor();
    }
  };

  const handleLoad = (data: { duration: number }) => {
    setDuration(data.duration);
    showControlsFor();
  };

  const handleProgress = (data: { currentTime: number }) => {
    setCurrentTime(data.currentTime);
  };

  const handleEnd = async () => {
    // 영상 종료 시 세로 고정 후 피드백
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    await setNavBar(true);
    setStep('initial');
    setShowFeedback(true);
  };

  const goHome = async () => {
    setShowFeedback(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    await setNavBar(true);
    router.replace('/home' as any);
  };

  const seek = (locationX: number) => {
    const w = seekBarWidth.current;
    if (duration > 0 && w > 0 && videoRef.current) {
      const ratio = Math.max(0, Math.min(1, locationX / w));
      const seekTo = ratio * duration;
      videoRef.current.seek(seekTo);
      setCurrentTime(seekTo);
    }
    showControlsFor();
  };

  const skipSeconds = (sec: number) => {
    if (!videoRef.current) return;
    const next = Math.max(0, Math.min(duration, currentTime + sec));
    videoRef.current.seek(next);
    setCurrentTime(next);
    showControlsFor();
  };

  const seekPan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => seek(e.nativeEvent.locationX),
    onPanResponderMove: (e) => seek(e.nativeEvent.locationX),
  });

  useEffect(() => {
    if (step === 'thanks') {
      const t = setTimeout(() => goHome(), 1200);
      return () => clearTimeout(t);
    }
  }, [step]);

  const activeMood = result?.timeline ? getActiveMood(result.timeline, currentTime) : null;
  const activeEvent = result?.timeline ? getActiveEvent(result.timeline, currentTime) : null;
  const glowColor = activeMood ? BASE_MOOD_TOKEN[activeMood.label].color : '#0388A6';
  const thumbLeft = `${(progress * 100).toFixed(2)}%` as any;

  return (
    <View style={styles.container}>
      <StatusBar hidden={isFullScreen} translucent backgroundColor="transparent" />

      {/* Video Layer */}
      <View style={styles.videoLayer}>
        <Video
          ref={videoRef}
          source={{ uri: result?.videoUrl ?? '' }}
          style={[styles.video, { height: isFullScreen ? height : width * (9 / 16) }]}
          resizeMode="contain"
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={handleEnd}
          paused={paused}
          controls={false}
          useTextureView
        />
        {/* 비디오가 터치를 삼키는 것을 막기 위한 투명 오버레이 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleVideoTap} />
      </View>

      {/* Mood Glow Layer */}
      <View pointerEvents="none" style={styles.moodLayer}>
        <MoodGlow color={glowColor} intensity={settings.moodIntensity} />
      </View>

      {/* 커스텀 컨트롤 */}
      {!showFeedback && showControls && (
        <View pointerEvents="box-none" style={styles.controlsLayer}>
          <View style={[styles.controlsBottom, { paddingBottom: 20 + insets.bottom }]}>
            {/* Seek bar 행 */}
            <View style={styles.seekRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

              <View
                style={styles.seekBarHitArea}
                onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width; }}
                {...seekPan.panHandlers}
              >
                <View style={styles.seekTrack}>
                  <View style={styles.seekFillBg} />
                  <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
                </View>
                <View style={[styles.seekThumb, { left: thumbLeft }]} />
              </View>

              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* 버튼 행 */}
            <View style={styles.buttonsRow}>
              {/* 나가기 */}
              <TouchableOpacity style={styles.sideBtn} onPress={goHome}>
                <Text style={styles.sideBtnIcon}>✕</Text>
                <Text style={styles.sideBtnLabel}>나가기</Text>
              </TouchableOpacity>

              {/* -10초 */}
              <TouchableOpacity style={styles.skipBtn} onPress={() => skipSeconds(-10)}>
                <Text style={styles.skipIcon}>↻</Text>
                <Text style={styles.skipLabel}>10</Text>
              </TouchableOpacity>

              {/* 재생 / 일시정지 */}
              <TouchableOpacity
                style={styles.playPauseBtn}
                onPress={() => { setPaused(p => !p); showControlsFor(); }}
              >
                {paused ? (
                  <Text style={styles.pauseIcon}>▶</Text>
                ) : (
                  <Image
                    source={require('../../assets/images/playbutton.png')}
                    style={styles.playBtnImage}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>

              {/* +10초 */}
              <TouchableOpacity style={styles.skipBtn} onPress={() => skipSeconds(10)}>
                <Text style={styles.skipIcon}>↺</Text>
                <Text style={styles.skipLabel}>10</Text>
              </TouchableOpacity>

              {/* 가로/세로는 기기 방향에 따라 자동 — 빈 자리 균형용 */}
              <View style={styles.sideBtn} />
            </View>
          </View>
        </View>
      )}

      {/* Dynamic Event Bar */}
      <View pointerEvents="none" style={[styles.dynamicBarContainer, { bottom: insets.bottom }]}>
        <DynamicEventBar
          baseMood={activeMood?.label ?? 'unknown'}
          baseMoodIntensity={activeMood?.intensity ?? 0.5}
          eventType={activeEvent?.type ?? 'stable'}
          eventStrength={activeEvent?.strength ?? 0.5}
          eventDurationMs={(activeEvent?.duration ?? 2) * 1000}
        />
      </View>

      {/* Feedback Overlay */}
      {showFeedback && (
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              {
                height: step === 'thanks' ? THANKS_SHEET_H : DEFAULT_SHEET_H,
                paddingBottom: 32 + insets.bottom,
              },
            ]}
          >
            <View style={styles.handle} />

            {step === 'initial' && (
              <>
                <Text style={styles.question}>색감이 감정 전달에 도움됐나요?</Text>
                <Text style={styles.questionSub}>
                  AI가 조정한 색상이 영상의 분위기를{'\n'}이해하는 데 도움이 됐는지 알려주세요
                </Text>
                <View style={styles.choiceRow}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, { backgroundColor: 'rgba(139,175,196,0.6)' }]}
                    onPress={() => setStep('negative')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.choiceEmoji}>😢</Text>
                    <Text style={[styles.choiceLabel, { color: '#8FB3C7' }]}>아쉬웠어요</Text>
                    <Text style={styles.choiceSub}>개선이 필요해요</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, { backgroundColor: 'rgba(196,144,144,0.6)' }]}
                    onPress={() => setStep('positive')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.choiceEmoji}>😍</Text>
                    <Text style={[styles.choiceLabel, { color: '#D97C7C' }]}>도움됐어요</Text>
                    <Text style={styles.choiceSub}>감정이 느껴졌어요</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={goHome} activeOpacity={0.85}>
                  <Text style={styles.skip}>건너뛰기</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'negative' && renderOptions(NEGATIVE_OPTIONS, '어떤 점이 아쉬우셨나요?', '#79C7DE', setStep)}
            {step === 'positive' && renderOptions(POSITIVE_OPTIONS, '어떤 점이 좋으셨나요?', '#E56A7B', setStep)}

            {step === 'thanks' && (
              <>
                <Text style={styles.question}>소중한 의견 감사해요</Text>
                <Text style={styles.questionSub}>
                  귀하의 피드백은 서비스 품질 향상에 큰 도움이 됩니다
                </Text>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function renderOptions(
  options: string[],
  question: string,
  dotColor: string,
  setStep: (step: Step) => void
) {
  return (
    <>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.questionSub}>하나만 선택해주세요</Text>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={styles.optionRow}
          onPress={() => setStep('thanks')}
          activeOpacity={0.85}
        >
          <View style={[styles.optionDot, { backgroundColor: dotColor }]} />
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
  },
  moodLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  /* ─── 컨트롤 ─── */
  controlsLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  controlsBottom: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 18,
    backgroundColor: 'rgba(0,0,0,0.52)',
    gap: 8,
  },

  /* Seek bar */
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 38,
    textAlign: 'center',
    fontWeight: '500',
  },
  seekBarHitArea: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  seekTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  seekFillBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
  },
  seekFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    top: '50%',
    marginTop: -7,
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },

  /* 버튼 행 */
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  playPauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnImage: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  pauseIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginLeft: 3,       // ▶ 문자 시각적 오프셋 보정
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: 44,
    height: 44,
    gap: 1,
  },
  skipIcon: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
  },
  skipLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 11,
  },
  sideBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 52,
    height: 44,
  },
  sideBtnIcon: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
  },
  sideBtnLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },

  /* ─── Feedback ─── */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 50,
    elevation: 50,
  },
  sheet: {
    backgroundColor: 'rgba(42,42,42,0.88)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    marginBottom: 24,
  },
  question: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  questionSub: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  choiceBtn: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  choiceEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  choiceLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  choiceSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  skip: {
    fontSize: 13,
    color: '#888',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  optionText: {
    fontSize: 15,
    color: '#EEE',
  },
  dynamicBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

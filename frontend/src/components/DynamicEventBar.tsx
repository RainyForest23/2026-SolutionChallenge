import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Filter, FeGaussianBlur, G } from 'react-native-svg';
import { BaseMoodLabel, EventType } from '../domain/emotionTypes';
import { BASE_MOOD_TOKEN, EVENT_PRESET } from '../domain/emotionTokens';

// ─── easing functions ────────────────────────────────────────────────────────
const Ease = {
  easeIn:       (t: number) => t * t,
  easeOut:      (t: number) => 1 - (1 - t) * (1 - t),
  easeInOut:    (t: number) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
};
type EasingKey = keyof typeof Ease;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp(t, 0, 1); }

// ─── animation state ─────────────────────────────────────────────────────────
interface BarValues {
  lengthRatio: number; // 0~1 center-out 길이 비율
  opacity: number;     // 중앙 최대 불투명도
  thickness: number;   // 바 두께 px
}

interface TweenState {
  from: BarValues;
  to: BarValues;
  startMs: number;
  durationMs: number;
  easing: EasingKey;
  onDone?: () => void;
}

// ─── props ───────────────────────────────────────────────────────────────────
interface Props {
  baseMood?: BaseMoodLabel;
  baseMoodIntensity?: number; // 0~1
  eventType?: EventType;
  eventStrength?: number;     // 0~1
  eventDurationMs?: number;   // swell 등 지속 시간 ms
}

const GLOW_H = 32;
const GLOW_BLUR = 6;

export default function DynamicEventBar({
  baseMood = 'sorrow',
  baseMoodIntensity = 0.5,
  eventType = 'stable',
  eventStrength = 0.5,
  eventDurationMs = 2000,
}: Props) {
  const { width } = useWindowDimensions();
  const token = BASE_MOOD_TOKEN[baseMood];
  const preset = EVENT_PRESET[eventType];

  const baseVal = (): BarValues => ({
    lengthRatio: lerp(preset.minLengthRatio, preset.maxLengthRatio, baseMoodIntensity),
    opacity:     lerp(token.minOpacity, token.maxOpacity, baseMoodIntensity),
    thickness:   lerp(preset.minThickness, preset.maxThickness, baseMoodIntensity),
  });

  const currentRef = useRef<BarValues>(baseVal());
  const tweenRef   = useRef<TweenState | null>(null);
  const [bar, setBar] = useState<BarValues>(currentRef.current);

  const startTween = (
    to: BarValues,
    durationMs: number,
    easing: EasingKey,
    onDone?: () => void,
  ) => {
    tweenRef.current = {
      from: { ...currentRef.current },
      to,
      startMs: Date.now(),
      durationMs,
      easing,
      onDone,
    };
  };

  // ─── 이벤트별 애니메이션 트리거 ────────────────────────────────────────────
  useEffect(() => {
    const p   = EVENT_PRESET[eventType];
    const t   = BASE_MOOD_TOKEN[baseMood];
    const s   = clamp(eventStrength, 0, 1);
    const bv  = baseVal();

    const peak: BarValues = {
      lengthRatio: lerp(p.minLengthRatio, p.maxLengthRatio, s),
      opacity:     lerp(p.minOpacity, p.maxOpacity, s),
      thickness:   lerp(p.minThickness, p.maxThickness, s),
    };
    const minVal: BarValues = {
      lengthRatio: lerp(p.minLengthRatio * 0.8, p.minLengthRatio, s),
      opacity:     lerp(t.minOpacity * 0.8, t.minOpacity, s),
      thickness:   p.minThickness,
    };

    switch (eventType) {
      case 'stable': {
        // micro-pulse: min ↔ max 느리게 진동 (~5s 주기)
        const half = 5000;
        const pulse = () => {
          startTween(peak, half, 'easeInOut', () => {
            startTween(minVal, half, 'easeInOut', pulse);
          });
        };
        pulse();
        break;
      }

      case 'jump_scare': {
        const impactMs  = p.impactMs  ?? 120;
        const recoverMs = p.recoverMs ?? 300;
        startTween(peak, impactMs, 'easeOut', () => {
          startTween(bv, recoverMs, 'easeInOut');
        });
        break;
      }

      case 'swell': {
        startTween(peak, eventDurationMs, 'easeOutCubic', () => {
          startTween(bv, 800, 'easeInOut');
        });
        break;
      }

      case 'sudden_drop': {
        const dropTo: BarValues = {
          lengthRatio: p.maxLengthRatio * 0.1,
          opacity:     p.minOpacity,
          thickness:   p.minThickness,
        };
        const dropMs   = Math.round(lerp(100, 200, s));
        const settleMs = Math.round(lerp(100, 400, s));
        startTween(dropTo, dropMs, 'easeIn', () => {
          startTween(bv, settleMs, 'easeInOut');
        });
        break;
      }
    }
  }, [eventType, eventStrength, baseMood, baseMoodIntensity, eventDurationMs]);

  // ─── 애니메이션 루프 (33ms ≈ 30fps) ─────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const tween = tweenRef.current;
      if (!tween) return;

      const rawT   = clamp((Date.now() - tween.startMs) / tween.durationMs, 0, 1);
      const easedT = Ease[tween.easing](rawT);

      const next: BarValues = {
        lengthRatio: lerp(tween.from.lengthRatio, tween.to.lengthRatio, easedT),
        opacity:     lerp(tween.from.opacity,     tween.to.opacity,     easedT),
        thickness:   lerp(tween.from.thickness,   tween.to.thickness,   easedT),
      };
      currentRef.current = next;
      setBar({ ...next });

      if (rawT >= 1) {
        const done = tween.onDone;
        tweenRef.current = null;
        done?.();
      }
    }, 33);
    return () => clearInterval(id);
  }, []);

  // ─── Center-out 그라데이션 stops 계산 ─────────────────────────────────────
  // lengthRatio가 0.3이면 화면 중앙에서 ±15% 범위만 불투명
  // lengthRatio가 1.0이면 전 화면 (양 끝만 약하게 페이드)
  const halfLen   = bar.lengthRatio / 2;
  const fadeW     = Math.max(0.03, halfLen * 0.25); // 페이드 구간 폭
  const edgeL  = clamp(0.5 - halfLen, 0, 0.49);
  const fullL  = clamp(edgeL + fadeW, edgeL, 0.5);
  const fullR  = clamp(0.5 + halfLen - fadeW, 0.5, 1 - fadeW);
  const edgeR  = clamp(0.5 + halfLen, fullR, 1);
  const op     = bar.opacity;
  const thick  = Math.max(1, Math.round(bar.thickness));
  const barY   = GLOW_H - thick;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg width={width} height={GLOW_H} viewBox={`0 0 ${width} ${GLOW_H}`}>
        <Defs>
          {/* Center-out 수평 그라데이션 */}
          <LinearGradient id="cGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"            stopColor={token.color} stopOpacity="0" />
            <Stop offset={String(edgeL)} stopColor={token.color} stopOpacity="0" />
            <Stop offset={String(fullL)} stopColor={token.color} stopOpacity={String(op)} />
            <Stop offset={String(fullR)} stopColor={token.color} stopOpacity={String(op)} />
            <Stop offset={String(edgeR)} stopColor={token.color} stopOpacity="0" />
            <Stop offset="1"            stopColor={token.color} stopOpacity="0" />
          </LinearGradient>

          {/* 글로우 블러 */}
          <Filter id="glow" x="-5%" y="-150%" width="110%" height="400%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation={String(GLOW_BLUR)} result="blur" />
          </Filter>
        </Defs>

        {/* 글로우 레이어 */}
        <G filter="url(#glow)">
          <Rect x={0} y={barY} width={width} height={thick} fill="url(#cGrad)" opacity={0.7} />
        </G>

        {/* 실선 레이어 */}
        <Rect x={0} y={barY} width={width} height={thick} fill="url(#cGrad)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: GLOW_H,
  },
});

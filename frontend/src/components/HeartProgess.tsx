import { useEffect, useRef, useState } from 'react';
import Svg, {
  Path,
  Defs,
  ClipPath,
  Rect,
  Filter,
  FeFlood,
  FeColorMatrix,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  FeBlend,
  G,
  LinearGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';

// ─── 하트 좌표계 (HTML 원본과 동일) ─────────────────────────────────────────
const HW = 430;
const HH = 400;

const HEART_PATH =
  'M228.33 380.765C221.02 383.345 208.98 383.345 201.67 380.765C139.32 359.48 0 270.685 0 120.185C0 53.75 53.535 0 119.54 0C158.67 0 193.285 18.92 215 48.16C236.715 18.92 271.545 0 310.46 0C376.465 0 430 53.75 430 120.185C430 270.685 290.68 359.48 228.33 380.765Z';

function makeWavePath(offsetX: number, amplitude: number, freq: number, fillY: number): string {
  let d = `M${-HW},${fillY}`;
  for (let x = -HW; x <= HW * 2; x += 6) {
    const y = fillY + Math.sin((x + offsetX) * freq) * amplitude;
    d += ` L${x},${y}`;
  }
  d += ` L${HW * 2},${HH + 50} L${-HW},${HH + 50} Z`;
  return d;
}

interface Props {
  progress: number;
  size?: number;
}

export default function HeartProgress({ progress, size = 260 }: Props) {
  const progressRef = useRef(progress);
  const w1xRef = useRef(0);
  const w2xRef = useRef(0);

  const [paths, setPaths] = useState({
    wave1: makeWavePath(0, 14, 0.022, HH),
    wave2: makeWavePath(0, 10, 0.03, HH - 5),
    baseFillY: HH + 10,
    baseFillH: 50,
  });

  // progress 변화 추적
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // 파도 애니메이션 루프 (HTML과 동일 속도)
  useEffect(() => {
    const interval = setInterval(() => {
      w1xRef.current -= 2.5;
      w2xRef.current += 1.8;

      // HTML: fillY = H - eased*(H+20), eased = progress/100
      const eased = progressRef.current / 100;
      const fillY = HH - eased * (HH + 20);

      setPaths({
        wave1: makeWavePath(w1xRef.current, 14, 0.022, fillY),
        wave2: makeWavePath(w2xRef.current, 10, 0.03, fillY - 5),
        baseFillY: fillY + 10,
        baseFillH: Math.max(0, HH - fillY + 50),
      });
    }, 33);

    return () => clearInterval(interval);
  }, []);

  // HTML 원본 비율: 260×240 / viewBox "-5 -8 480 435"
  const height = size * (240 / 260);

  return (
    <Svg width={size} height={height} viewBox="-5 -8 480 435">
      <Defs>
        <ClipPath id="hClip">
          <Path d={HEART_PATH} />
        </ClipPath>

        {/* 파도 채움: 밝은 핑크 → 코랄 → 밝은 하늘색 */}
        <LinearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0"    stopColor="#ffb8da" />
          <Stop offset="0.45" stopColor="#ffc99a" />
          <Stop offset="1"    stopColor="#82d9f2" />
        </LinearGradient>

        {/* 파도2 오버레이: 연보라 → 연파랑 */}
        <LinearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#dda0f0" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#88c4ff" stopOpacity="0.45" />
        </LinearGradient>

        {/* 유리 기본 */}
        <LinearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
        </LinearGradient>

        {/* 광택 */}
        <LinearGradient id="shineGrad" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>

        {/* 드롭섀도 + 3단 이너섀도 (HTML filter0_diii_61_81 동일) */}
        <Filter id="hFilter" x="-1" y="-4" width="471" height="426.7" filterUnits="userSpaceOnUse">
          <FeFlood floodOpacity="0" result="BackgroundImageFix" />
          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <FeOffset dx="20" dy="20" />
          <FeGaussianBlur stdDeviation="10" />
          <FeComposite in2="hardAlpha" operator="out" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" />
          <FeBlend mode="normal" in2="BackgroundImageFix" result="shadow1" />
          <FeBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />

          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <FeOffset dx="-1" dy="-1" />
          <FeGaussianBlur stdDeviation="1.5" />
          <FeComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
          <FeBlend mode="normal" in2="shape" result="inner1" />

          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <FeOffset dy="-10" />
          <FeGaussianBlur stdDeviation="2" />
          <FeComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <FeColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
          <FeBlend mode="normal" in2="inner1" result="inner2" />

          <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <FeOffset dy="4" />
          <FeGaussianBlur stdDeviation="5" />
          <FeComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend mode="normal" in2="inner2" result="inner3" />
          <FeBlend mode="normal" in="inner3" in2="shadow1" />
        </Filter>
      </Defs>

      {/* 1. 유리 빈 하트 기본 */}
      <G clipPath="url(#hClip)">
        <Rect x="-10" y="-10" width="450" height="420" fill="url(#glassGrad)" />
      </G>

      {/* 2. 파도 채움 레이어 */}
      <G clipPath="url(#hClip)">
        {/* 파도 아래 고정 채움 */}
        <Rect
          x={-HW}
          y={paths.baseFillY}
          width={HW * 3}
          height={paths.baseFillH}
          fill="url(#fillGrad)"
        />
        {/* 파도 1 */}
        <Path d={paths.wave1} fill="url(#fillGrad)" />
        {/* 파도 2 */}
        <Path d={paths.wave2} fill="url(#waveGrad2)" />
        {/* 광택 타원 */}
        <Ellipse
          cx={155}
          cy={95}
          rx={100}
          ry={48}
          fill="url(#shineGrad)"
          transform="rotate(-18, 155, 95)"
        />
      </G>

      {/* 3. 이너섀도/글로우 오버레이 */}
      <G filter="url(#hFilter)" opacity={0.9}>
        <Path d={HEART_PATH} fill="white" fillOpacity={0.08} />
      </G>
    </Svg>
  );
}

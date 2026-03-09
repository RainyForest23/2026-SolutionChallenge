import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type MoodGlowProps = {
  color: string;
  intensity?: number;
};

export default function MoodGlow({
  color,
  intensity = 0.5,
}: MoodGlowProps) {
  // 투명도(알파값)는 기존 유지 (필요시 이 부분도 조정 가능)
  const alpha = 0.002 + intensity * 0.006;

  const edgeColor = hexToRgba(color, alpha);
  const transparent = hexToRgba(color, 0);

  // 💡 수정 포인트 1: 두께를 얇게 고정 (원하는 픽셀 크기로 조절하세요)
  // 기존: 5 + intensity * 3 -> 변경: 최소 10px ~ 최대 40px 정도로 제한
  const glowThickness = 7 + (intensity * 2); 

  // 💡 수정 포인트 2: locations 속성을 추가하여 가장자리에 색상을 응집시킴
  // 0에서 시작해서 0.6(60%) 지점에서 이미 완전히 투명해지도록 설정
  const gradientLocations = [0, 0.6];

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* top */}
      <LinearGradient
        pointerEvents="none"
        colors={[edgeColor, transparent]}
        locations={gradientLocations}
        style={[styles.top, { height: glowThickness }]}
      />

      {/* bottom */}
      <LinearGradient
        pointerEvents="none"
        colors={[transparent, edgeColor]}
        // bottom은 아래에서 위로 퍼지므로 역순으로 적용된 것처럼 보임
        locations={[0.4, 1]} 
        style={[styles.bottom, { height: glowThickness }]}
      />

      {/* left */}
      <LinearGradient
        pointerEvents="none"
        colors={[edgeColor, transparent]}
        locations={gradientLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.left, { width: glowThickness }]}
      />

      {/* right */}
      <LinearGradient
        pointerEvents="none"
        colors={[transparent, edgeColor]}
        locations={[0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.right, { width: glowThickness }]}
      />
    </View>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  left: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  right: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
});
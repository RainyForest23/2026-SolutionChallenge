import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const TRACK_W = width * 0.095;
const TRACK_H = width * 0.053;
const THUMB_SIZE = TRACK_H - width * 0.011;

interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeColor?: string;
}

export default function Toggle({ value, onValueChange, activeColor = '#A1A1F7' }: ToggleProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.005, TRACK_W - THUMB_SIZE - width * 0.005],
  });

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#D0D0D0', activeColor],
  });

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

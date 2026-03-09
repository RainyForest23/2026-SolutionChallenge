import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageBackground } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  return (
    <ImageBackground
      source={require('../../assets/images/bg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* 1. 아이콘 영역 (화면 정중앙 고정) */}
      <View style={styles.iconWrapper}>
        <Image
          source={require('../../assets/images/splash_icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
        />
      </View>

      {/* 2. 로고 & 글자 영역 (함께 묶어서 하단에 배치) */}
      <View style={styles.textLogoWrapper}>
        <Image
          source={require('../../assets/images/soundsight_logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.description}>
          들을 수 없었던 감정까지, 눈으로 느낄 수 있도록.
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // 🌟 아이콘 영역 (중앙 고정 해제 -> 원하는 위치로 변경)
  iconWrapper: {
    position: 'absolute',
    top: height * 0.2, // 화면 맨 위에서 20% 내려온 지점 (이 숫자로 조절!)
    width: '100%',
    alignItems: 'center',
  },
  // 🌟 로고와 글자를 함께 묶어주는 영역
  textLogoWrapper: {
    position: 'absolute',
    top: height * 0.65, // 화면 위에서 2/3 지점 (약 66% 위치)
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
  },
  splashIcon: {
    width: width * 1,
    height: width * 1,
  },
  logoImage: {
    width: width * 0.5,
    height: (width * 0.5) / 4,
    marginBottom: height * 0.02, // 묶음 안에서 로고와 글자 사이의 간격
  },
  description: {
    fontSize: width * 0.025,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
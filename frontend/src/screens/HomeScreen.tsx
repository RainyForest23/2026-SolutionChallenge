import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageBackground, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { router } from 'expo-router';
import SearchField from '../components/SearchField';
import SettingButton from '../components/SettingButton';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const handleUrlSubmit = (url: string) => {
    router.push({ pathname: '/loading' as any, params: { url } });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground
        source={require('../../assets/images/homebg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/soundsight_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.description}>
              들을 수 없었던 감정까지, 눈으로 느낄 수 있도록.
            </Text>
          </View>

          <SearchField onSubmit={handleUrlSubmit} />
        </View>

        <SettingButton onPress={() => router.push('/settings')} />
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: height * 0.22 },
  header: { alignItems: 'center', marginBottom: height * 0.05 },
  logoImage: {
    width: width * 0.6,
    height: (width * 0.6) / 4,
    marginBottom: 8,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: {
    fontSize: width * 0.027,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
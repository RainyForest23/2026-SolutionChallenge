import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ImageBackground, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import SearchField from '../components/SearchField';
import SettingButton from '../components/SettingButton';
import { signOutUser } from '../services/authService';

const { width, height } = Dimensions.get('window');

type Props = {
  onLogout?: () => void;
};

export default function HomeScreen({ onLogout }: Props) {
  const handleUrlSubmit = (url: string) => {
    router.push({ pathname: '/loading' as any, params: { url } });
  };

  const handleLogout = async () => {
    await signOutUser();
    onLogout?.();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground
        source={require('../../assets/images/homebg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={width * 0.06} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

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
  logoutBtn: {
    position: 'absolute',
    top: height * 0.06,
    right: width * 0.07,
    zIndex: 10,
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: (width * 0.14) / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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

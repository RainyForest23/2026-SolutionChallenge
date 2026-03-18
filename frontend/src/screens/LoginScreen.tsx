import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import GoogleLogo from '../../assets/images/googlelogo.svg';
import { signInWithEmail } from '../services/authService';
import { useGoogleSignIn } from '../../hooks/use-google-signin';

type Props = {
  onLoginSuccess: () => void;
  onPressSignUp: () => void;
};

export default function LoginScreen({ onLoginSuccess, onPressSignUp }: Props) {
  const { width, height } = useWindowDimensions();
  const styles = getStyles(width, height);
  const googleIconSize = clamp(width * 0.05, 18, 24);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle } = useGoogleSignIn({
    onSuccess: onLoginSuccess,
    onError: (msg) => Alert.alert('구글 로그인 실패', msg),
  });

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('로그인 실패', getErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground
        source={require('../../assets/images/bg.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.container}>
            <Image
              source={require('../../assets/images/soundsight_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>들을 수 없었던 감정까지, 눈으로 느낄 수 있도록.</Text>

            <View style={styles.card}>
              <Text style={styles.title}>로그인</Text>
              <Text style={styles.subtitle}>계정으로 로그인하세요</Text>

              <View style={styles.headerDivider} />

              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor="#AAA"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor="#AAA"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>로그인</Text>
                )}
              </TouchableOpacity>

              {Platform.OS !== 'web' ? (
                <>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>또는</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.googleButton}
                    onPress={signInWithGoogle}
                    activeOpacity={0.85}
                  >
                    <GoogleLogo width={googleIconSize} height={googleIconSize} style={styles.googleLogo} />
                    <Text style={styles.googleButtonText}>Google로 로그인</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.webHint}>
                  웹 데모에서는 이메일 로그인 또는 회원가입을 사용해 주세요.
                </Text>
              )}
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>계정이 없으신가요?</Text>
              <TouchableOpacity onPress={onPressSignUp} activeOpacity={0.7}>
                <Text style={styles.signupLink}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

function getErrorMessage(code?: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/too-many-requests':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    default:
      return '로그인 중 오류가 발생했습니다.';
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getStyles(width: number, height: number) {
  const isWeb = Platform.OS === 'web';
  const contentWidth = isWeb ? Math.min(width - 48, 560) : width;
  const cardRadius = isWeb ? 28 : width * 0.07;
  const controlHeight = clamp(height * 0.058, 52, 62);
  const inputFontSize = clamp(width * 0.038, 18, 26);
  const titleSize = clamp(width * 0.05, 28, 42);
  const subtitleSize = clamp(width * 0.03, 18, 24);
  const helperSize = clamp(width * 0.028, 14, 18);
  const footerSize = clamp(width * 0.034, 16, 20);
  const logoWidth = isWeb ? Math.min(contentWidth * 0.7, 440) : width * 0.55;

  return StyleSheet.create({
    flex: { flex: 1 },
    bg: { flex: 1, width: '100%', height: '100%' },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isWeb ? 24 : width * 0.07,
      paddingVertical: isWeb ? 32 : 0,
    },
    logo: {
      width: logoWidth,
      height: logoWidth / 4,
      marginBottom: clamp(height * 0.012, 10, 18),
    },
    tagline: {
      fontSize: helperSize,
      color: 'rgba(255,255,255,0.82)',
      letterSpacing: 0.3,
      marginBottom: clamp(height * 0.04, 24, 36),
      textAlign: 'center',
    },
    card: {
      width: '100%',
      maxWidth: contentWidth,
      backgroundColor: 'rgba(255,255,255,0.74)',
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.86)',
      paddingHorizontal: isWeb ? 32 : width * 0.06,
      paddingTop: isWeb ? 28 : height * 0.025,
      paddingBottom: isWeb ? 28 : height * 0.025,
      shadowColor: '#6E6E9A',
      shadowOpacity: isWeb ? 0.16 : 0,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    title: {
      fontSize: titleSize,
      fontWeight: '700',
      color: '#333',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: subtitleSize,
      color: '#737373',
      marginTop: 4,
      marginBottom: clamp(height * 0.01, 12, 18),
      textAlign: 'center',
    },
    headerDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.8)',
      marginBottom: clamp(height * 0.02, 16, 24),
    },
    input: {
      width: '100%',
      height: controlHeight,
      backgroundColor: 'rgba(255,255,255,0.82)',
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.94)',
      paddingHorizontal: isWeb ? 24 : width * 0.05,
      color: '#333',
      fontSize: inputFontSize,
      marginBottom: clamp(height * 0.012, 12, 16),
    },
    button: {
      width: '100%',
      height: controlHeight,
      backgroundColor: '#9694F2',
      borderRadius: cardRadius,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: clamp(height * 0.005, 6, 10),
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: {
      color: '#fff',
      fontSize: clamp(width * 0.04, 18, 28),
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: clamp(height * 0.018, 16, 20),
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.8)',
    },
    dividerText: {
      color: '#888',
      fontSize: clamp(width * 0.032, 15, 18),
      marginHorizontal: 10,
    },
    webHint: {
      marginTop: clamp(height * 0.018, 16, 20),
      textAlign: 'center',
      color: '#676767',
      fontSize: helperSize,
      lineHeight: helperSize * 1.4,
    },
    googleButton: {
      width: '100%',
      height: controlHeight,
      backgroundColor: 'rgba(255,255,255,0.82)',
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.94)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleLogo: {
      marginRight: 12,
    },
    googleButtonText: {
      color: '#555',
      fontSize: inputFontSize,
      fontWeight: '500',
    },
    signupRow: {
      flexDirection: 'row',
      marginTop: clamp(height * 0.025, 18, 26),
      alignItems: 'center',
      gap: 6,
    },
    signupText: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: footerSize,
    },
    signupLink: {
      color: '#A1A1F7',
      fontSize: footerSize,
      fontWeight: '600',
    },
  });
}

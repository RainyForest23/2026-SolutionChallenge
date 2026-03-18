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
import { signUpWithEmail } from '../services/authService';

type Props = {
  onSignupSuccess: () => void;
  onPressLogin: () => void;
};

export default function SignupScreen({ onSignupSuccess, onPressLogin }: Props) {
  const { width, height } = useWindowDimensions();
  const styles = getStyles(width, height);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !passwordConfirm.trim()) {
      Alert.alert('입력 오류', '모든 항목을 입력해 주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      onSignupSuccess();
    } catch (error: any) {
      Alert.alert('회원가입 실패', getErrorMessage(error?.code));
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
              <Text style={styles.title}>회원가입</Text>
              <Text style={styles.subtitle}>새 계정을 만드세요</Text>

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
                placeholder="비밀번호 (6자 이상)"
                placeholderTextColor="#AAA"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="비밀번호 확인"
                placeholderTextColor="#AAA"
                secureTextEntry
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>가입하기</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>이미 계정이 있으신가요?</Text>
              <TouchableOpacity onPress={onPressLogin} activeOpacity={0.7}>
                <Text style={styles.loginLink}>로그인</Text>
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
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다.';
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/weak-password':
      return '비밀번호가 너무 약합니다. 6자 이상으로 설정해 주세요.';
    default:
      return '회원가입 중 오류가 발생했습니다.';
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
    loginRow: {
      flexDirection: 'row',
      marginTop: clamp(height * 0.025, 18, 26),
      alignItems: 'center',
      gap: 6,
    },
    loginText: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: footerSize,
    },
    loginLink: {
      color: '#A1A1F7',
      fontSize: footerSize,
      fontWeight: '600',
    },
  });
}

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import GoogleLogo from '../../assets/images/googlelogo.svg';
import { signInWithEmail } from '../services/authService';
import { useGoogleSignIn } from '../../hooks/use-google-signin';

const { width, height } = Dimensions.get('window');

type Props = {
  onLoginSuccess: () => void;
  onPressSignUp: () => void;
};

export default function LoginScreen({ onLoginSuccess, onPressSignUp }: Props) {
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
                    <GoogleLogo width={width * 0.05} height={width * 0.05} style={styles.googleLogo} />
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, width: '100%', height: '100%' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.07,
  },
  logo: {
    width: width * 0.55,
    height: (width * 0.55) / 4,
    marginBottom: height * 0.012,
  },
  tagline: {
    fontSize: width * 0.027,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
    marginBottom: height * 0.04,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: width * 0.07,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.025,
    paddingBottom: height * 0.025,
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.03,
    color: '#888',
    marginTop: 2,
    marginBottom: height * 0.01,
    textAlign: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginBottom: height * 0.02,
  },
  input: {
    width: '100%',
    height: height * 0.058,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: width * 0.07,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: width * 0.05,
    color: '#333',
    fontSize: width * 0.038,
    marginBottom: height * 0.012,
  },
  button: {
    width: '100%',
    height: height * 0.058,
    backgroundColor: '#A1A1F7',
    borderRadius: width * 0.07,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.005,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.04,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: height * 0.018,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  dividerText: {
    color: '#888',
    fontSize: width * 0.032,
    marginHorizontal: 10,
  },
  webHint: {
    marginTop: height * 0.018,
    textAlign: 'center',
    color: '#777',
    fontSize: width * 0.028,
    lineHeight: width * 0.04,
  },
  googleButton: {
    width: '100%',
    height: height * 0.058,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: width * 0.07,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    marginRight: width * 0.025,
  },
  googleButtonText: {
    color: '#555',
    fontSize: width * 0.037,
    fontWeight: '500',
  },
  signupRow: {
    flexDirection: 'row',
    marginTop: height * 0.025,
    alignItems: 'center',
    gap: 6,
  },
  signupText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: width * 0.034,
  },
  signupLink: {
    color: '#A1A1F7',
    fontSize: width * 0.034,
    fontWeight: '600',
  },
});

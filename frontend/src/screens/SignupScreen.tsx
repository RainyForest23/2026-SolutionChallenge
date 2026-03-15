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
import { signUpWithEmail } from '../services/authService';

const { width, height } = Dimensions.get('window');

type Props = {
  onSignupSuccess: () => void;
  onPressLogin: () => void;
};

export default function SignupScreen({ onSignupSuccess, onPressLogin }: Props) {
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
  loginRow: {
    flexDirection: 'row',
    marginTop: height * 0.025,
    alignItems: 'center',
    gap: 6,
  },
  loginText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: width * 0.034,
  },
  loginLink: {
    color: '#A1A1F7',
    fontSize: width * 0.034,
    fontWeight: '600',
  },
});

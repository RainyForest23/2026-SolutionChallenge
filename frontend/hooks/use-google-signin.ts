import { Platform } from 'react-native';
import { signInWithGoogleIdToken } from '../src/services/authService';

const WEB_CLIENT_ID = '42277767816-nc1e856fmk9fbddqm3f0lp96q6bv0776.apps.googleusercontent.com';

type Options = {
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export function useGoogleSignIn(options?: Options) {
  const signInWithGoogle = async () => {
    if (Platform.OS === 'web') {
      options?.onError?.('웹 데모에서는 이메일 로그인 또는 회원가입을 사용해 주세요.');
      return;
    }

    try {
      const { GoogleSignin, statusCodes } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Google ID token을 가져오지 못했습니다.');
      await signInWithGoogleIdToken(idToken);
      options?.onSuccess?.();
    } catch (error: any) {
      if (
        error.code === 'SIGN_IN_CANCELLED' ||
        error.code === 'IN_PROGRESS'
      ) {
        return;
      }
      options?.onError?.(error?.message ?? '구글 로그인 중 오류가 발생했습니다.');
    }
  };

  return { signInWithGoogle };
}

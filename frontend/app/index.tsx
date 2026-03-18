import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/src/services/firebase';
import HomeScreen from '@/src/screens/HomeScreen';
import LoadingScreen from '@/src/screens/LoadingScreen';
import VideoScreen from '@/src/screens/VideoScreen';
import SettingsScreen from '@/src/screens/SettingsScreen';
import FeedbackScreen from '@/src/screens/FeedbackScreen';
import SplashScreen from '@/src/screens/SplashScreen';
import LoginScreen from '@/src/screens/LoginScreen';
import SignupScreen from '@/src/screens/SignupScreen';

type Screen =
  | 'SPLASH'
  | 'LOGIN'
  | 'SIGNUP'
  | 'HOME'
  | 'LOADING'
  | 'VIDEO'
  | 'SETTINGS'
  | 'FEEDBACK';

type SettingsState = {
  baseMoodEnabled: boolean;
  baseMoodIntensity: number;
  dynamicEventEnabled: boolean;
};

type FeedbackState = {
  totalPlayCount: number;
  requestCount: number;
  lastRequestedAt: number | null;
};

type AnalysisResult = {
  completionRate: number;
  baseMood: unknown;
  dynamicEvent: unknown;
  videoUrl?: string;
};

const FEEDBACK_MIN_COMPLETION = 80;
const FEEDBACK_MIN_PLAY_COUNT = 5;
const FEEDBACK_MAX_REQUEST_COUNT = 3;
const FEEDBACK_COOLDOWN_DAYS = 7;

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('SPLASH');

  const [settings, setSettings] = useState<SettingsState>({
    baseMoodEnabled: true,
    baseMoodIntensity: 0.7,
    dynamicEventEnabled: true,
  });

  const [feedbackState, setFeedbackState] = useState<FeedbackState>({
    totalPlayCount: 0,
    requestCount: 0,
    lastRequestedAt: null,
  });

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentScreen(user ? 'HOME' : 'LOGIN');
        unsubscribe();
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const shouldShowFeedback = useMemo(() => {
    if (!analysisResult) return false;

    if (analysisResult.completionRate < FEEDBACK_MIN_COMPLETION) return false;
    if (feedbackState.totalPlayCount < FEEDBACK_MIN_PLAY_COUNT) return false;

    if (feedbackState.lastRequestedAt) {
      const diffMs = Date.now() - feedbackState.lastRequestedAt;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < FEEDBACK_COOLDOWN_DAYS) return false;
    }

    if (feedbackState.requestCount >= FEEDBACK_MAX_REQUEST_COUNT) return false;

    return true;
  }, [analysisResult, feedbackState]);

  const handleSubmitUrl = async (url: string) => {
    if (!url?.trim()) return;

    setAnalysisProgress(0);
    setAnalysisResult(null);
    setCurrentScreen('LOADING');

    let progress = 0;

    const progressTimer = setInterval(() => {
      progress += 10;
      if (progress >= 90) {
        progress = 90;
        clearInterval(progressTimer);
      }
      setAnalysisProgress(progress);
    }, 300);

    try {
      // TODO: 실제 API/백엔드 분석 호출로 교체
      await new Promise(resolve => setTimeout(resolve, 3000));

      clearInterval(progressTimer);
      setAnalysisProgress(100);

      const mockResult: AnalysisResult = {
        completionRate: 85,
        baseMood: {},
        dynamicEvent: {},
        videoUrl: url,
      };

      setAnalysisResult(mockResult);

      setTimeout(() => {
        setCurrentScreen('VIDEO');
      }, 300);
    } catch (error) {
      clearInterval(progressTimer);
      setAnalysisProgress(0);
      setCurrentScreen('HOME');
    }
  };

  const handleOpenSettings = () => {
    setCurrentScreen('SETTINGS');
  };

  const handleCloseSettings = () => {
    setCurrentScreen('HOME');
  };

  const handleToggleBaseMood = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      baseMoodEnabled: enabled,
    }));
  };

  const handleChangeBaseMoodIntensity = (value: number) => {
    setSettings(prev => ({
      ...prev,
      baseMoodIntensity: value,
    }));
  };

  const handleToggleDynamicEvent = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      dynamicEventEnabled: enabled,
    }));
  };

  const handleVideoEnd = () => {
    setFeedbackState(prev => ({
      ...prev,
      totalPlayCount: prev.totalPlayCount + 1,
    }));

    const nextTotalPlayCount = feedbackState.totalPlayCount + 1;
    const completionRate = analysisResult?.completionRate ?? 0;

    const canRequestFeedback =
      completionRate >= FEEDBACK_MIN_COMPLETION &&
      nextTotalPlayCount >= FEEDBACK_MIN_PLAY_COUNT &&
      (feedbackState.lastRequestedAt === null ||
        (Date.now() - feedbackState.lastRequestedAt) /
          (1000 * 60 * 60 * 24) >=
          FEEDBACK_COOLDOWN_DAYS) &&
      feedbackState.requestCount < FEEDBACK_MAX_REQUEST_COUNT;

    if (canRequestFeedback) {
      setFeedbackState(prev => ({
        ...prev,
        requestCount: prev.requestCount + 1,
        lastRequestedAt: Date.now(),
      }));
      setCurrentScreen('FEEDBACK');
      return;
    }

    setCurrentScreen('HOME');
  };

  const handleFeedbackEnd = () => {
    setCurrentScreen('HOME');
  };

  if (currentScreen === 'SPLASH') {
    return <SplashScreen />;
  }

  if (currentScreen === 'LOGIN') {
    return (
      <LoginScreen
        onLoginSuccess={() => setCurrentScreen('HOME')}
        onPressSignUp={() => setCurrentScreen('SIGNUP')}
      />
    );
  }

  if (currentScreen === 'SIGNUP') {
    return (
      <SignupScreen
        onSignupSuccess={() => setCurrentScreen('HOME')}
        onPressLogin={() => setCurrentScreen('LOGIN')}
      />
    );
  }

  if (currentScreen === 'HOME') {
    return (
      <HomeScreen
        onSubmitUrl={handleSubmitUrl}
        onPressSettings={handleOpenSettings}
        onLogout={() => setCurrentScreen('LOGIN')}
      />
    );
  }

  if (currentScreen === 'LOADING') {
    return (
      <LoadingScreen
        progress={analysisProgress}
        loadingText="LOADING"
      />
    );
  }

  if (currentScreen === 'VIDEO') {
    return (
      <VideoScreen
        analysisResult={analysisResult}
        baseMoodEnabled={settings.baseMoodEnabled}
        baseMoodIntensity={settings.baseMoodIntensity}
        dynamicEventEnabled={settings.dynamicEventEnabled}
        onEnd={handleVideoEnd}
      />
    );
  }

  if (currentScreen === 'SETTINGS') {
    return (
      <SettingsScreen
        visible
        baseMoodEnabled={settings.baseMoodEnabled}
        baseMoodIntensity={settings.baseMoodIntensity}
        dynamicEventEnabled={settings.dynamicEventEnabled}
        onClose={handleCloseSettings}
        onToggleBaseMood={handleToggleBaseMood}
        onChangeBaseMoodIntensity={handleChangeBaseMoodIntensity}
        onToggleDynamicEvent={handleToggleDynamicEvent}
      />
    );
  }

  if (currentScreen === 'FEEDBACK') {
    return <FeedbackScreen onEnd={handleFeedbackEnd} />;
  }

  return null;
}
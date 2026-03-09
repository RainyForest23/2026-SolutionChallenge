import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

type Step = 'initial' | 'negative' | 'positive' | 'thanks';

const NEGATIVE_OPTIONS = ['색이 너무 강해요', '오히려 집중에 방해돼요', '변화가 잘 안 보여요'];
const POSITIVE_OPTIONS = ['감정이 잘 느껴졌어요', '분위기 파악이 쉬웠어요', '색 변화가 자연스러워요'];

const DEFAULT_SHEET_H = height * 0.5;
const THANKS_SHEET_H = height * 0.28;

export default function FeedbackScreen() {
  const [step, setStep] = useState<Step>('initial');
  const insets = useSafeAreaInsets();

  const goHome = () => router.replace('/home' as any);

  useEffect(() => {
    if (step === 'thanks') {
      const timer = setTimeout(() => {
        goHome();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const renderInitial = () => (
    <>
      <Text style={styles.question}>색감이 감정 전달에 도움됐나요?</Text>
      <Text style={styles.questionSub}>
        AI가 조정한 색상이 영상의 분위기를{'\n'}이해하는 데 도움이 됐는지 알려주세요
      </Text>

      <View style={styles.choiceRow}>
        <TouchableOpacity
          style={[styles.choiceBtn, { backgroundColor: 'rgba(139, 175, 196, 0.6)' }]}
          onPress={() => setStep('negative')}
          activeOpacity={0.85}
        >
          <Text style={styles.choiceEmoji}>😢</Text>
          <Text style={[styles.choiceLabel, { color: '#8FB3C7' }]}>아쉬웠어요</Text>
          <Text style={styles.choiceSub}>개선이 필요해요</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceBtn, { backgroundColor: 'rgba(196, 144, 144, 0.6)' }]}
          onPress={() => setStep('positive')}
          activeOpacity={0.85}
        >
          <Text style={styles.choiceEmoji}>😍</Text>
          <Text style={[styles.choiceLabel, { color: '#D97C7C' }]}>도움됐어요</Text>
          <Text style={styles.choiceSub}>감정이 느껴졌어요</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={goHome}>
        <Text style={styles.skip}>건너뛰기</Text>
      </TouchableOpacity>
    </>
  );

  const renderOptions = (options: string[], question: string, dotColor: string) => (
    <>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.questionSub}>하나만 선택해주세요</Text>

      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={styles.optionRow}
          onPress={() => setStep('thanks')}
          activeOpacity={0.8}
        >
          <View style={[styles.optionDot, { backgroundColor: dotColor }]} />
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderThanks = () => (
    <>
      <Text style={styles.question}>소중한 의견 감사해요</Text>
      <Text style={styles.questionSub}>귀하의 피드백은 서비스 품질 향상에 큰 도움이 됩니다</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topArea} />

      <View
        style={[
          styles.sheet,
          {
            height: step === 'thanks' ? THANKS_SHEET_H : DEFAULT_SHEET_H,
            paddingBottom: 32 + insets.bottom,
          },
        ]}
      >
        <View style={styles.handle} />

        {step === 'initial' && renderInitial()}
        {step === 'negative' && renderOptions(NEGATIVE_OPTIONS, '어떤 점이 아쉬우셨나요?', '#79C7DE')}
        {step === 'positive' && renderOptions(POSITIVE_OPTIONS, '어떤 점이 좋으셨나요?', '#E56A7B')}
        {step === 'thanks' && renderThanks()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
  },
  topArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    marginBottom: 24,
  },
  question: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  questionSub: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  choiceBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  choiceEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  choiceLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  choiceSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  skip: {
    fontSize: 13,
    color: '#888',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  optionText: {
    fontSize: 15,
    color: '#EEE',
  },
});
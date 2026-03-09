import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { DEFAULT_SETTINGS, setSettings } from '../store/settingsStore';
import { ChannelSettings } from '../domain/types';
import Toggle from '../components/Toggle';

const { width, height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.95;
const DYNAMIC_EVENT_IDS = ['sudden_shock', 'gradual_rise', 'sudden_silence'];

export default function SettingsScreen() {
  const [settings, setLocal] = useState<ChannelSettings>({ ...DEFAULT_SETTINGS });
  const [moodIntensities, setMoodIntensities] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_SETTINGS.baseMoods.map(m => [m.id, 50]))
  );
  const [dynamicEnabled, setDynamicEnabled] = useState(false);
  const [eventIntensities, setEventIntensities] = useState<Record<string, number>>(
    Object.fromEntries(DYNAMIC_EVENT_IDS.map(id => [id, 50]))
  );

  const toggleMood = (id: string) => {
    setLocal(prev => ({
      ...prev,
      baseMoods: prev.baseMoods.map(m =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  };

  const handleApply = () => {
    setSettings(settings);
    router.back();
  };

  const dynamicEvents = settings.dynamicEvents.filter(e =>
    DYNAMIC_EVENT_IDS.includes(e.id)
  );

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={() => router.back()} activeOpacity={1} />

      <View style={styles.sheet}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>채널 설정</Text>
            <Text style={styles.subtitle}>분위기와 이벤트를 조합해 채널을 구성하세요</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 베이스 무드 */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>베이스 무드</Text>
            <View style={styles.sectionLine} />
          </View>
          {settings.baseMoods.map(mood => (
            <View key={mood.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{mood.label}</Text>
                  <Text style={styles.rowDesc}>{mood.description}</Text>
                </View>
                <Toggle
                  value={mood.enabled}
                  onValueChange={() => toggleMood(mood.id)}
                  activeColor={mood.color}
                />
              </View>
              {mood.enabled && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderLabel}>강도</Text>
                    <Text style={[styles.sliderValue, { color: mood.color }]}>
                      {Math.round(moodIntensities[mood.id])}%
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    value={moodIntensities[mood.id]}
                    onValueChange={v => setMoodIntensities(prev => ({ ...prev, [mood.id]: v }))}
                    minimumTrackTintColor={mood.color}
                    maximumTrackTintColor="rgba(0,0,0,0.1)"
                    thumbTintColor={mood.color}
                  />
                </>
              )}
            </View>
          ))}

          {/* 다이나믹 이벤트 */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>다이나믹 이벤트</Text>
              <View style={styles.sectionLine} />
            </View>
            <Toggle
              value={dynamicEnabled}
              onValueChange={setDynamicEnabled}
              activeColor="#A1A1F7"
            />
          </View>
          <Text style={styles.dynamicDesc}>
            갑작스러운 충격, 서서히 고조, 갑작스러운 정적 등 사운드 변화에 반응하는 순간적 시각 효과입니다.
          </Text>

          {dynamicEvents.map(event => (
            <View key={event.id} style={[styles.card, !dynamicEnabled && styles.cardDisabled]}>
              <View style={styles.cardRow}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, !dynamicEnabled && styles.textDisabled]}>{event.label}</Text>
                  <Text style={[styles.rowDesc, !dynamicEnabled && styles.textDisabled]}>{event.description}</Text>
                </View>
              </View>
              {dynamicEnabled && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderLabel}>강도</Text>
                    <Text style={[styles.sliderValue, { color: '#A1A1F7' }]}>
                      {Math.round(eventIntensities[event.id])}%
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    value={eventIntensities[event.id]}
                    onValueChange={v => setEventIntensities(prev => ({ ...prev, [event.id]: v }))}
                    minimumTrackTintColor="#A1A1F7"
                    maximumTrackTintColor="rgba(0,0,0,0.1)"
                    thumbTintColor="#A1A1F7"
                  />
                </>
              )}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
          <Text style={styles.applyText}>적용하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: width * 0.08,
    borderTopRightRadius: width * 0.08,
    overflow: 'hidden',
    paddingBottom: height * 0.03,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.025,
    paddingBottom: height * 0.01,
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: width * 0.03,
    color: '#888',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: width * 0.045,
    color: '#AAA',
  },
  scrollContent: {
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.02,
  },
  sectionLabel: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: '#555',
    marginBottom: height * 0.012,
    marginTop: height * 0.008,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: height * 0.02,
    marginBottom: height * 0.005,
    paddingRight: width * 0.02,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: width * 0.07,
    paddingLeft: width * 0.05,
    paddingRight: width * 0.04,
    paddingTop: height * 0.014,
    paddingBottom: height * 0.01,
    marginBottom: height * 0.01,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    marginRight: width * 0.02,
  },
  rowTitle: {
    fontSize: width * 0.033,
    fontWeight: '600',
    color: '#333',
  },
  rowDesc: {
    fontSize: width * 0.027,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: height * 0.01,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.01,
  },
  sliderLabel: {
    fontSize: width * 0.032,
    color: '#666',
  },
  sliderValue: {
    fontSize: width * 0.032,
  },
  slider: {
    width: '100%',
    height: height * 0.04,
  },
  applyBtn: {
    marginHorizontal: width * 0.05,
    marginTop: height * 0.01,
    marginBottom: height * 0.04,
    backgroundColor: '#A1A1F7',
    borderRadius: width * 0.07,
    paddingVertical: height * 0.018,
    alignItems: 'center',
  },
  applyText: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#fff',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: '#AAA',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginHorizontal: width * 0.05,
    marginBottom: height * 0.008,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginLeft: width * 0.03,
    marginRight: width * 0.03,
  },
  dynamicDesc: {
    fontSize: width * 0.028,
    color: '#888',
    lineHeight: width * 0.042,
    marginBottom: height * 0.01,
    paddingHorizontal: width * 0.01,
  },
});

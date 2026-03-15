import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../src/store/settingsStore';

const STORAGE_KEY = 'soundsight_channel_settings';

export type PersistedSettings = {
  baseMoods: Array<{ id: string; enabled: boolean }>;
  moodIntensities: Record<string, number>;
  dynamicEnabled: boolean;
  eventIntensities: Record<string, number>;
};

function makeDefault(): PersistedSettings {
  return {
    baseMoods: DEFAULT_SETTINGS.baseMoods.map(m => ({ id: m.id, enabled: m.enabled })),
    moodIntensities: Object.fromEntries(DEFAULT_SETTINGS.baseMoods.map(m => [m.id, 50])),
    dynamicEnabled: false,
    eventIntensities: { sudden_shock: 50, gradual_rise: 50, sudden_silence: 50 },
  };
}

export function usePersistedSettings() {
  const [saved, setSaved] = useState<PersistedSettings>(makeDefault());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          setSaved(JSON.parse(raw));
        } catch {
          // 파싱 실패 시 기본값 유지
        }
      }
      setLoaded(true);
    });
  }, []);

  const save = async (data: PersistedSettings) => {
    setSaved(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  return { saved, loaded, save };
}

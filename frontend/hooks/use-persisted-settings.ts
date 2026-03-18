import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../src/store/settingsStore';

export type PersistedSettings = {
  baseMoods: Array<{ id: string; enabled: boolean }>;
  moodIntensities: Record<string, number>;
  dynamicEnabled: boolean;
  eventIntensities: Record<string, number>;
};

function makeDefault(): PersistedSettings {
  return {
    baseMoods: DEFAULT_SETTINGS.baseMoods.map(m => ({ id: m.id, enabled: m.enabled })),
    moodIntensities: Object.fromEntries(DEFAULT_SETTINGS.baseMoods.map(m => [m.id, 70])),
    dynamicEnabled: true,
    eventIntensities: { sudden_shock: 70, gradual_rise: 70, sudden_silence: 70 },
  };
}

export function usePersistedSettings(uid?: string) {
  const storageKey = uid ? `soundsight_channel_settings_${uid}` : 'soundsight_channel_settings';
  const [saved, setSaved] = useState<PersistedSettings>(makeDefault());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(raw => {
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
    await AsyncStorage.setItem(storageKey, JSON.stringify(data));
  };

  return { saved, loaded, save };
}

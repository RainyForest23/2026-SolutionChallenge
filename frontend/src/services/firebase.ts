import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: .env로 분리 권장 (EXPO_PUBLIC_ prefix 사용)
const firebaseConfig = {
  apiKey: 'AIzaSyCB9s4NqkbawqKWyOBylfW_uczSwNZPVs4',
  authDomain: 'sc-soundsight.firebaseapp.com',
  projectId: 'sc-soundsight',
  storageBucket: 'sc-soundsight.firebasestorage.app',
  messagingSenderId: '42277767816',
  appId: '1:42277767816:web:eaf0cdb1f974ea6511ad3d',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

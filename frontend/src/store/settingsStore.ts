import { ChannelSettings } from '../domain/types';

export const DEFAULT_SETTINGS: ChannelSettings = {
  baseMoods: [
    { id: 'tension',    label: '긴장감·압박',  description: '불안, 서스펜스, 고조되는 압박감', color: '#C81C30', enabled: true },
    { id: 'sadness',    label: '슬픔·여운',    description: '상실, 고독',                       color: '#0388A6', enabled: true },
    { id: 'excitement', label: '고양·벅참',    description: '흥분, 결의, 장엄한 상승감',         color: '#F9B95C', enabled: true },
    { id: 'warmth',     label: '따뜻함·위로',  description: '온기, 평화, 치유의 감각',           color: '#A6B13C', enabled: true },
    { id: 'mystery',    label: '신비·몽환',    description: '미지, 환상, 꿈결 같은 분위기',       color: '#A1A1F7', enabled: true },
  ],
  moodIntensity: 70,
  dynamicEvents: [
    { id: 'steady',         label: '잔잔하게 유지',    description: '시각적 변화 없이 안정적으로 유지', enabled: true  },
    { id: 'sudden_shock',   label: '갑작스러운 충격',  description: '순간적 각성, 점프 스퀘어',         enabled: false },
    { id: 'gradual_rise',   label: '서서히 고조',      description: '밀려오며 극적으로 상승',            enabled: false },
    { id: 'sudden_silence', label: '갑작스러운 정적',  description: '음악의 급격한 중단, 침묵',          enabled: false },
  ],
};

// 모듈 레벨 상태 (API 연결 전 임시)
let _settings: ChannelSettings = { ...DEFAULT_SETTINGS };

export const getSettings = (): ChannelSettings => _settings;
export const setSettings = (s: ChannelSettings) => { _settings = s; };

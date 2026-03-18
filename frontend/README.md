# SoundSight — Frontend

React Native + Expo 기반 Android 앱입니다.
**Android 실기기 또는 에뮬레이터**에서 실행하세요 (iOS는 현재 미지원).

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [프로젝트 세팅](#2-프로젝트-세팅)
3. [실행 방법](#3-실행-방법)
4. [폴더 구조](#4-폴더-구조)
5. [구현 현황](#5-구현-현황)
6. [트러블슈팅](#6-트러블슈팅)

---

## 1. 사전 준비

아래가 모두 설치되어 있어야 합니다.

| 항목 | 버전 / 비고 |
|------|------------|
| Node.js | **20 LTS 권장** (v20.15.1 확인됨) |
| npm | Node와 함께 설치됨 |
| EAS CLI | `npm install -g eas-cli` |
| Expo 계정 | [expo.dev](https://expo.dev) 에서 무료 가입 |
| Android 기기 or 에뮬레이터 | 실기기 권장 |

---

## 2. 프로젝트 세팅

### 2-1. 저장소 클론 후 frontend 폴더로 이동

```bash
git clone https://github.com/RainyForest23/2026-SolutionChallenge.git
cd 2026-SolutionChallenge/frontend
```

### 2-2. 패키지 설치 (최초 1회)

```bash
npm install
```

### 2-3. Expo 계정 생성 및 Organization 가입

1. [expo.dev](https://expo.dev) 에서 **개인 계정을 생성**합니다 (이미 있으면 건너뜀).
2. 팀장에게 본인 Expo 계정 이메일을 알려주세요.
3. 팀장이 **SoundSight Organization** 에 초대를 보냅니다.
   → 초대 이메일 또는 [expo.dev/accounts/soundsight](https://expo.dev/accounts/soundsight) 에서 수락.

### 2-4. EAS 로그인

```bash
eas login
```

> **본인의 개인 Expo 계정**으로 로그인하세요.
> Organization 멤버로 가입되어 있으면 자동으로 팀 프로젝트에 접근할 수 있습니다.

---

## 3. 실행 방법

`react-native-video`, `expo-navigation-bar`, `expo-screen-orientation` 등 네이티브 모듈을 사용하므로
**Expo Go 앱으로는 실행 불가** — 반드시 **Development Build(dev build)** 로 실행합니다.

### 3-1. Dev Build 설치 (최초 1회, 또는 네이티브 변경 시)

```bash
eas build --profile development --platform android
```

빌드 완료 후 터미널에 QR코드 또는 다운로드 링크가 표시됩니다.
→ 안드로이드 폰으로 `.apk` 설치 (에뮬레이터는 drag & drop)

> **재빌드가 필요한 경우**
> - 새 네이티브 라이브러리 추가/제거 (`npx expo install 패키지명`)
> - `app.json` 플러그인 변경
>
> 일반적인 화면·로직·스타일 수정은 재빌드 없이 바로 반영됩니다.

### 3-2. 개발 서버 실행

```bash
npx expo start --dev-client
```

- 폰과 PC가 **같은 Wi-Fi** 에 연결되어 있어야 합니다.
- 설치된 dev build 앱을 열면 자동으로 연결됩니다.
- 코드 수정은 저장 시 자동 반영 (Fast Refresh).
- 수동 새로고침: 터미널에서 `r` 입력

---

## 4. 폴더 구조

```
frontend/
├── app/                        # Expo Router 라우트 (파일명 = URL 경로)
│   ├── index.tsx               # /         → SplashScreen
│   ├── home.tsx                # /home     → HomeScreen
│   ├── loading.tsx             # /loading  → LoadingScreen
│   ├── video.tsx               # /video    → VideoScreen
│   ├── settings.tsx            # /settings → SettingsScreen
│   └── feedback.tsx            # /feedback → FeedbackScreen
│
├── src/
│   ├── screens/                # 각 화면 컴포넌트 (실제 구현체)
│   ├── components/             # 재사용 UI 컴포넌트
│   │   ├── DynamicEventBar.tsx     # 하단 오디오 이벤트 반응 바
│   │   ├── HeartProgess.tsx        # 로딩 하트 SVG 애니메이션
│   │   ├── MoodGlow.tsx            # 비디오 테두리 무드 이펙트
│   │   └── ...
│   ├── domain/                 # 타입 정의 & 비주얼 토큰
│   │   ├── emotionTypes.ts         # BaseMood, DynamicEvent, EmotionTimeline 타입
│   │   ├── emotionTokens.ts        # 이벤트별 색상·애니메이션 파라미터
│   │   └── types.ts                # 설정 UI용 타입
│   ├── navigation/             # 라우트 경로 상수
│   ├── services/               # API 호출 (analyzeApi, timelineApi)
│   └── store/                  # 전역 상태 (settingsStore, playbackStore)
│
├── assets/images/              # 배경·아이콘 이미지
└── components/                 # 앱 전역 공통 컴포넌트 (AppBackground 등)
```

---

## 5. 구현 현황

### ✅ 완료된 기능

#### 화면

| 화면 | 설명 |
|------|------|
| **SplashScreen** | 앱 시작 시 로고 표시, 자동으로 홈으로 이동 |
| **HomeScreen** | 영상 URL 입력 → 로딩 화면으로 이동 |
| **LoadingScreen** | 분석 대기 중 파도가 차오르는 하트 프로그레스 + 퍼센트 표시 |
| **VideoScreen** | 영상 재생 + 무드 이펙트 + 커스텀 컨트롤 + 피드백 |
| **SettingsScreen** | 무드 강도 슬라이더, 이벤트 효과 on/off 토글 |
| **FeedbackScreen** | 영상 종료 후 만족도 수집 (긍정/부정 선택 → 세부 옵션) |

#### 비디오 플레이어 (VideoScreen)

- 커스텀 컨트롤: 재생/일시정지, ±10초 이동, 진행바 드래그 seek
- 기기 방향에 따른 자동 가로/세로 전환 (`expo-screen-orientation`)
- 가로 모드 전환 시 상태바·네비게이션 바 자동 숨김 (`expo-navigation-bar`)
- 화면 탭 시 컨트롤 표시/숨김 (4초 후 자동 숨김)
- 영상 종료 시 피드백 Bottom Sheet 자동 표시

#### 무드 이펙트 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| **MoodGlow** | 비디오 화면 테두리에 BaseMood 색상 글로우 이펙트 |
| **DynamicEventBar** | 화면 하단 고정 바. 오디오 이벤트 강도에 따라 중앙에서 양끝으로 퍼지는 Center-out 애니메이션 |
| **HeartProgess** | 로딩 화면 하트. 파도가 progress에 맞춰 아래에서 차오름 + 유리 질감 |

#### 감정 타입 시스템

API 응답 포맷에 맞춰 타입과 비주얼 토큰이 정의되어 있습니다.

```
BaseMoodLabel : tension | sorrow | uplift | warmth | unknown
EventType     : stable | jump_scare | swell | sudden_drop

EmotionTimeline {
  base_moods: BaseMood[]   // 시간대별 기본 감정
  events:     DynamicEvent[] // 순간 이벤트 (jump_scare 등)
}
```

각 타입별 색상·불투명도·두께·애니메이션 타이밍은 `emotionTokens.ts`에 정의.

---

### 🔲 미구현 (백엔드 API 연결 후 작업 예정)

| 항목 | 설명 |
|------|------|
| Firebase 실시간 리스너 | AI 분석 완료 시 Firestore에서 EmotionTimeline JSON 수신 |
| EmotionTimeline → 재생 시간 매핑 | currentTime 기준으로 활성 BaseMood / DynamicEvent 조회 |
| MoodGlow 실시간 연동 | API 결과에 따라 테두리 색상·강도 동적 변경 |
| DynamicEventBar 실시간 연동 | jump_scare·swell 등 이벤트 애니메이션 트리거 |
| 햅틱 피드백 | `expo-haptics` 설치 완료, 이벤트 트리거 연동 미구현 |
| HomeScreen API 호출 | URL 입력 후 실제 백엔드 분석 요청 연결 |

---

## 6. 트러블슈팅

### "Unable to connect to development server" 오류

폰과 PC가 같은 Wi-Fi인지 확인하세요. 안 되면 터널 모드로 실행:

```bash
npx expo start --dev-client --tunnel
```

### 코드 수정이 앱에 반영 안 될 때

터미널에서 `r` 입력하거나 앱을 완전 종료 후 재실행하세요.

### Expo Go 앱으로 실행 시 오류

SoundSight는 Expo Go를 지원하지 않습니다. EAS로 빌드한 **dev build 앱**을 사용하세요.

### 새 패키지 추가 후 오류 발생

네이티브 모듈이 포함된 패키지는 추가 후 반드시 재빌드가 필요합니다:

```bash
npx expo install 패키지명
eas build --profile development --platform android
```

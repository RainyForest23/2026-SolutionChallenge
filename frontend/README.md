# SoundSight Frontend (React Native + Expo)

React Native + Expo 기반으로 개발하며, **Android 우선**으로 진행합니다.

> **현재 상태: 프로젝트 초기 세팅 단계**
> - Expo 프로젝트 생성 완료
> - 기본 실행 확인 완료
> - EAS Development Build(dev build) 설정 완료
> - react-native-video 기반 Video PoC 완료
   - https(mp4) 재생
   - `onProgress`로 현재시간 수신
   - `seek()` 동작
   - 영상 위 overlay 표시
> - 추후 API 명세서에 따라 화면 구조 정리 예정

> **참고:** `react-native-video`는 Expo Go에서 제한이 있을 수 있어 dev build로 실행합니다.

---

## 목차

1. [문서 목적](#1-문서-목적)
2. [사전 준비](#2-사전-준비)
3. [프로젝트 세팅](#3-프로젝트-세팅)
4. [실행 방법 (dev build)](#4-실행-방법-development-build-기준)
5. [트러블슈팅](#5-트러블슈팅)

---

## 1. 문서 목적

아래 순서대로 따라하면 **앱을 로컬에서 실행**할 수 있도록 안내하기 위해 작성했습니다.
IOS 보안정책으로 인해 안드로이드에서만 빌드 가능합니다.

---

## 2. 사전 준비

아래 프로그램이 설치되어 있어야 합니다.

| 항목 | 권장 버전 / 비고 |
|------|----------------|
| Node.js | **20 LTS 권장** (v20.15.1에서 실행 확인) |
| VS Code | 권장 코드 에디터 |
| Expo 계정 | EAS 사용을 위해 필요 |
| Android 폰 or Emulator | 실기기 권장 (안정적) |

**필수 설치 (최초 1회)**
```bash
npm install -g eas-cli

---

## 3. 프로젝트 세팅

### 3-1. 저장소 클론 후 프론트엔드 폴더로 이동

프론트엔드 앱은 `frontend/` 폴더 안에 있습니다.
```bash
cd frontend
```

### 3-2. 패키지 설치 (최초 1회)
```bash
npm install
```

> 설치 완료 후 `node_modules/` 폴더가 생성됩니다.

---

## 4. 실행 방법 (Development Build 기준)

### 4-1. EAS 로그인
```bash
eas login
```

### 4-2. dev build 설치 (Android)

dev build는 한 번 설치해두면, 이후 JS/TS 코드 수정은 `npx expo start --dev-client`로 바로 반영됩니다.

> 네이티브 의존성/플러그인 변경 시에만 dev build를 다시 빌드/설치
```bash
eas build --profile development --platform android
```

빌드가 끝나면 터미널에 QR 코드가 뜹니다 → 안드로이드 폰으로 스캔해서 설치하세요.

### 4-3. 개발 서버 실행 (코드 수정 반영)
```bash
npx expo start --dev-client
```

- 폰에서 설치된 dev build 앱을 열고
- 동일 네트워크에서 연결되면 실행됩니다.
- 코드 수정 후 안 바뀌면 `r` (reload) 또는 앱을 한 번 재실행해보세요.

## 5. 트러블슈팅

### 5-1. Expo Go 실행 제한

현재 `react-native-video` PoC를 사용하므로 Expo Go 대신 dev build로 실행하는 걸 권장합니다.

### 5-2. 화면 미반영

터미널에서 dev-client 모드로 실행했는지 확인:
```bash
npx expo start --dev-client
```

- 앱에서 새로고침: 터미널에서 `r`
- 그래도 안 되면 앱을 완전히 종료 후 재실행

### 5-3. dev build 재설치 기준

아래 같은 **네이티브 변경**이 있을 때만 다시 빌드/설치가 필요합니다.

- 새 네이티브 라이브러리 추가/삭제
- Expo config plugin 변경
- `android/` 설정이 바뀌는 작업

> 일반적인 화면/UI/로직 수정은 다시 설치할 필요 없음.
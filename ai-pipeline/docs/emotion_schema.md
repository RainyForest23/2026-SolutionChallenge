# 감정 표현 설계서 (Emotion Visualization Schema) v1.0

**"들을 수 없었던 감정까지, 눈으로 느낄 수 있도록"**

본 문서는 프로젝트를 관통하는 핵심 문제의식과 이를 해결하기 위한 감정 분류 체계 및 시각화 방향에 대하여 정리합니다. 단순한 시각화를 넘어, 배리어프리(Barrier-free) 영상 시청의 새로운 표준 제안이 목표입니다.

---

## 1. 명확한 문제의식: 우리가 전달하려는 '감정'의 본질

영상을 보며 느끼는 감정을 유도하는 두 가지 핵심 요소:

1. **배우들의 연기 및 대사:** 기존 환경(CC 자막 등)에서 `[한숨을 쉬며]`, `[화난 목소리로]` 형태의 텍스트와 시각적 영상을 통해 어느 정도 전달 가능.
2. **음악 및 사운드(BGM, SFX):** 영상의 '분위기'를 지배하지만, 기존 자막 시스템으로는 전혀 읽어낼 수 없는 정보의 공백 영역.

우리의 타겟팅은 후자인 **'음악과 사운드가 영상에 부여하는 분위기(Cinematic Mood)'**입니다.

영화 <인터스텔라>의 압도적인 오르간 사운드, <F1> 레이스의 엔진음이 주는 속도감과 긴장감을 청각장애인(DHH) 관객이 텍스트가 아닌 '감각'으로 체감하게 만드는 것이 본 프로젝트의 핵심입니다. 가장 Low-level에서 객관적인 오디오 및 컨텍스트 정보를 추출하고, 이를 관객이 주관적으로 느낄 수 있는 시각적 캔버스로 변환합니다.

> **참고 자료 — DHH 음악 접근성 연구**
>
> - **[CHI 2024]** 🔗[**DHH의 음악 감상을 위한 Cross-modal 시각화 시스템**](https://dl.acm.org/doi/full/10.1145/3613904.3642665) — 24명의 청각장애인 인터뷰 + 28명 평가. 시각+촉각 피드백의 개인화 필요성 도출
> - **[DIS 2025]** 🔗[**DHH의 일상적 음악 활동에 대한 이해**](https://dasomchoi.com/papers/InclusiveMusic.pdf) — 9명의 전문가 + DHH 포커스그룹 인터뷰. 자막 의존도와 비가사 콘텐츠의 접근성 한계 분석
> - **[CHI 2020]** 🔗[**ViTune: DHH를 위한 음악 시각화 도구**](https://dl.acm.org/doi/10.1145/3334480.3383046) — 15명 이상의 DHH 참가자 대상 반복 테스트. 음악 특성에 반응하는 화면 효과 생성
> - **[IMX 2025]** 🔗[**AI 기반 실시간 음악 시각화 시스템**](https://dl.acm.org/doi/10.1145/3706370.3727869) — MIR + LLM + 이미지 생성 모델 결합. 청인/DHH 참가자 대상 연구
> - **[arxiv 2024]** 🔗[**DHH 음악 경험의 다양성 탐색**](https://arxiv.org/html/2401.09025v1) — 기존 시각화 연구 종합 서베이 (Fourney & Fels 2009, Deja 2020, Grierson 2011 등)
> - **[Hearview 2025]** 🔗[청각장애인의 음악 경험 혁신 방법들](https://www.hearview.ai/blogs/news/innovative-ways-deaf-people-experience-music-vibrations-ai-vr-more-in-2025) — 진동, AI, VR, 스마트 글래스 등 최신 접근법 종합

---

## 2. 감정 분류 체계의 재정립: 2-Track System

초기 고려했던 인간의 보편적인 8가지 감정 매핑 방식에서 탈피하여 '인간의 내적 감정'과 '영화 사운드가 조성하는 분위기'의 명확한 구분 필요성을 인지했습니다. 학술적으로 검증된 **Valence-Arousal 기반의 음악 감정 분류(Russell's Circumplex Model)** 도입을 결정했습니다.

AI 모델의 추론 혼란을 방지하고 명확한 UI 렌더링을 위해 상태(Mood)와 사건(Event)을 분리한 2-Track 분류 체계를 확립했습니다.

### Track 1: Base Mood (배경 분위기, 상태)

- `tension` (긴장, 서스펜스, 불안)
- `sorrow` (슬픔, 상실, 고독)
- `uplift` (고양, 흥분, 결의, 장엄함)
- `warmth` (온기, 평화, 치유)
- `unknown` (미지, 신비, 몽환)

### Track 2: Dynamic Event (사운드의 물리적 변화 및 사건)

- `stable` (유지 상태 - 시각적 변화 없음)
- `jump_scare` (급격한 각성도 상승, 순간적 충격)
- `swell` (서서히 밀려오며 고조되는 웅장함)
- `sudden_drop` (음악의 급격한 중단 또는 적막)

> **참고 자료 — 감정 분류 이론 및 음악 감정 인식(MER)**
>
> **[핵심] Russell's Circumplex Model of Affect (1980)**
>
> - 🔗[**원본 논문 PDF**](http://pdodds.w3.uvm.edu/research/papers/others/1980/russell1980a.pdf)
> - 🔗[**Circumplex Model 해설 (교재)**](https://psu.pb.unizin.org/psych425/chapter/circumplex-models/)
> - 🔗[**Circumplex Model의 신경과학적 근거 (PMC)**](https://pmc.ncbi.nlm.nih.gov/articles/PMC2367156/)
>
> **음악 감정 인식(MER) 데이터셋 및 모델**
>
> - **[awesome-MER]** 🔗[**음악 감정 인식 데이터셋/모델 종합 목록**](https://github.com/AMAAI-Lab/awesome-MER)
> - 🔗[**EmoMV 데이터셋 (GitHub)**](https://github.com/ivyha010/EmoMV)
> - 🔗[**EmoMV 논문 (Information Fusion, 2022)**](https://www.sciencedirect.com/science/article/abs/pii/S1566253522001725)
> - 🔗[**MVEmo 데이터셋 (IEEE DataPort)**](https://ieee-dataport.org/documents/mvemo-music-video-emotion-dataset)
> - **[arxiv 2024]** 🔗[**MER 서베이: 데이터셋, 모델, 미해결 과제**](https://arxiv.org/html/2406.08809v2)
> - 🔗[**영화 사운드트랙 자막화를 위한 자동 음악 감정 분류 (Applied Intelligence, 2023)**](https://link.springer.com/article/10.1007/s10489-023-04967-w)
> - 🔗[**오디오 피처와 V-A 예측 (Journal of Intelligent Information Systems, 2018)**](https://www.tandfonline.com/doi/full/10.1080/24751839.2018.1463749)
> - 🔗[**다중 장르 음악 감정 분류 모델 (Journal of New Music Research, 2021)**](https://www.tandfonline.com/doi/full/10.1080/09298215.2021.1977336)

---

## 3. UX/UI 설계 원칙: 접근성과 인지적 부하 사이의 딜레마 극복

가장 근본적인 질문: **"자막 자체에 시각적 특수효과를 부여하는 것이 이상적인 해결책인가? 오히려 시청 몰입을 방해하는 노이즈가 아닌가?"**

청각장애인에게 자막은 영상의 내용을 파악하는 유일한 생명줄입니다. 자막에 글리치(Glitch)나 떨림 효과를 주어 가독성을 훼손하는 것은 접근성(Accessibility) UX 디자인의 제1원칙에 위배됩니다. 이에 따른 확고한 UI 설계 원칙을 수립했습니다.

- **중심 시야(Foveal Vision) 보호:** 자막 텍스트 자체의 변형 철저히 배제, 가독성 100% 보존.
- **주변 시야(Peripheral Vision) 활용:** 시선 이동(Saccade) 강제 없이, 화면 가장자리나 자막 주변 여백을 활용한 무의식적 분위기 인지 유도.

> **참고 자료 — 주변 시야 활용 및 Ambilight 원리**
>
> - **[Eindhoven University]** 🔗[**Ambilight 과학적 효과 검증 연구**](https://www.embedded.com/a-scientific-study-on-the-effects-of-ambilight-in-flat-panel-displays/)
> - **[ResearchGate]** 🔗[**Immersive TV Viewing with Advanced Ambilight**](https://www.researchgate.net/publication/252058126_Immersive_TV_viewing_with_advanced_Ambilight)
> - 🔗[**Philips Ambilight 기술 해설**](https://www.trustedreviews.com/explainer/what-is-philips-ambilight-4324727)
> - **[MIT Media Lab]** 🔗[**Infinity-by-Nine**](https://www.engadget.com/2012-06-25-mit-media-lab-system-projects-video-to-peripheral-vision.html)

---

## 4. 시각화 PoC 및 제안

위 원칙에 기반하여, 기존의 '감정 바(Emotion Bar)'나 자막 변형 아이디어의 한계를 극복한 3가지 다중 감각 채널을 도출했습니다.

### A. [주변 시야] 화면 테두리 글로우 (Ambilight Effect)

- **개념:** TV 후면의 빛을 통해 화면 밖으로 색이 번지게 하는 필립스(Philips) Ambilight TV 원리 차용.
- **적용:** 씬 전체를 지배하는 **Base Mood**를 화면 가장자리의 은은한 색상 글로우로 표현. (예: 우주 공간의 경이로움 - 테두리의 은은한 보랏빛 유지). 시청 방해 없는 공간감 및 몰입감 극대화.

### B. [중심 시야] 자막 일체형 무드 트랙 (Subtitle-Coupled Mood Track)

- **개념:** **기존 자막 뒤의 반투명 검은색 배경 박스(Background Tint) 활용**.
- **적용:** 자막 박스 최상단(Top-border)에 오디오 파형을 상징하는 아주 얇은 선(Line) 배치. 사운드 에너지가 커질수록 상단 중앙에서 양끝으로 선명해지며 길어지는 Center-out 애니메이션 적용.
- **효과:** 시선의 이동 없이 순간적인 텐션 변화와 `jump_scare` 등의 강렬한 타격감 직관적 인지. 색상 의존도를 낮추고 두께와 형태 변화를 결합하여 색맹/색약 유저까지 포용하는 범용적 디자인.

> **참고 자료 — 음악-시각 Cross-modal 매핑 디자인**
>
> - **[CHI 2024]** 🔗**D[HH를 위한 Cross-modal 음악 개념 탐색 및 커스터마이징](https://dl.acm.org/doi/fullHtml/10.1145/3613904.3642665)**
> - **[AAAI 2023]** 🔗[**Music-to-Facial Expressions: 음악 감정 시각화**](https://ojs.aaai.org/index.php/AAAI/article/view/26912/26684)

---

## 5. 결론 및 향후 액션 플랜

본 설계의 목적은 단순히 AI API 기반 오디오 분석을 시각화하는 것에 그치지 않음. 분석된 데이터를 청각장애인 유저가 가장 편안하게 인지할 수 있도록 돕는 **웹 영상 접근성(Web Video Accessibility)의 새로운** 글로벌 UI 표준 제시.

---

## 📎 전체 참고문헌 Quick Links

| # | 분류 | 제목 | 링크 |
| --- | --- | --- | --- |
| 1 | 이론 | Russell (1980) Circumplex Model 원본 논문 | [PDF](http://pdodds.w3.uvm.edu/research/papers/others/1980/russell1980a.pdf) |
| 2 | 이론 | Circumplex Model 해설 (PSU 교재) | [Link](https://psu.pb.unizin.org/psych425/chapter/circumplex-models/) |
| 3 | 이론 | Circumplex Model 신경과학적 근거 (PMC) | [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC2367156/) |
| 4 | 데이터 | awesome-MER (MER 데이터셋/모델 종합) | [GitHub](https://github.com/AMAAI-Lab/awesome-MER) |
| 5 | 데이터 | EmoMV 데이터셋 (6감정 + V-A) | [GitHub](https://github.com/ivyha010/EmoMV) |
| 6 | 데이터 | MVEmo (11,764개 뮤직비디오, 동적 어노테이션) | [IEEE](https://ieee-dataport.org/documents/mvemo-music-video-emotion-dataset) |
| 7 | 논문 | 영화 OST 자동 감정 분류 (2023) | [Springer](https://link.springer.com/article/10.1007/s10489-023-04967-w) |
| 8 | 논문 | 오디오 피처 → V-A 예측 (2018) | [Link](https://www.tandfonline.com/doi/full/10.1080/24751839.2018.1463749) |
| 9 | 논문 | 다중 장르 MER 모델 (2021) | [Link](https://www.tandfonline.com/doi/full/10.1080/09298215.2021.1977336) |
| 10 | 서베이 | MER 서베이 (2024) | [arxiv](https://arxiv.org/html/2406.08809v2) |
| 11 | DHH | CHI 2024 — Cross-modal 음악 커스터마이징 | [ACM](https://dl.acm.org/doi/full/10.1145/3613904.3642665) |
| 12 | DHH | DIS 2025 — DHH 일상 음악 활동 이해 | [PDF](https://dasomchoi.com/papers/InclusiveMusic.pdf) |
| 13 | DHH | CHI 2020 — ViTune 시각화 도구 | [ACM](https://dl.acm.org/doi/10.1145/3334480.3383046) |
| 14 | DHH | IMX 2025 — AI 기반 실시간 음악 시각화 | [ACM](https://dl.acm.org/doi/10.1145/3706370.3727869) |
| 15 | DHH | DHH 음악 경험 다양성 서베이 (2024) | [arxiv](https://arxiv.org/html/2401.09025v1) |
| 16 | UX | Ambilight 과학적 효과 검증 (Eindhoven Univ.) | [Link](https://www.embedded.com/a-scientific-study-on-the-effects-of-ambilight-in-flat-panel-displays/) |
| 17 | UX | Immersive TV with Ambilight 연구 | [ResearchGate](https://www.researchgate.net/publication/252058126_Immersive_TV_viewing_with_advanced_Ambilight) |
| 18 | UX | AAAI 2023 — Music-to-Facial Expressions | [AAAI](https://ojs.aaai.org/index.php/AAAI/article/view/26912/26684) |

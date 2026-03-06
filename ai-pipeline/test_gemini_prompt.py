import os
import vertexai
from vertexai.generative_models import GenerativeModel, Part
import json

# ==========================================
# 🚀 Task 9: Gemini 프로 프롬프트 기반 감정 분석 PoC 
# ==========================================

# TODO: 우림님의 GCP 프로젝트 ID와 리전으로 수정 필요
PROJECT_ID = "YOUR_GCP_PROJECT_ID"  
LOCATION = "us-central1"            

# 모델 설정 (가장 최신/강력한 모델 사용 권장)
MODEL_ID = "gemini-1.5-pro-preview-0409" 

def init_vertex_ai():
    """Vertex AI 환경 초기화 (서비스 계정 JSON 인증)"""
    # 환경변수에 서비스 계정 키 경로가 설정되어 있는지 확인
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        print("⚠️ 경고: GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되지 않았습니다.")
        print("터미널에서 다음 명령어를 실행하여 서비스 계정 키 경로를 지정하세요:")
        print("export GOOGLE_APPLICATION_CREDENTIALS='/path/to/your/service-account-key.json'")
        return False
        
    try:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        print(f"✅ Vertex AI 초기화 완료 (프로젝트: {PROJECT_ID}, 리전: {LOCATION})")
        return True
    except Exception as e:
        print(f"❌ Vertex AI 초기화 실패: {e}")
        return False

def generate_emotion_timeline(video_path: str, audio_features: dict = None) -> str:
    """
    영상 파일(또는 URL)과 오디오 메타데이터를 기반으로 
    감정 타임라인 JSON을 추출하는 Gemini API 프롬프트 테스트
    """
    model = GenerativeModel(MODEL_ID)
    
    # -------------------------------------------------------------
    # 🎯 핵심 프롬프트 (Task 7 감정 표현 설계서 기반)
    # -------------------------------------------------------------
    system_instruction = """
    당신은 영상과 오디오를 분석하여 시청자가 느끼는 감정과 분위기 변화를 시간 단위로 추출하는 '시네마틱 감정 분석 AI'입니다.
    청각장애인(DHH)이 영상의 분위기와 소리 효과를 시각적으로 체감할 수 있도록, 
    영상 내 상황과 사운드(BGM, SFX)에 기반한 '감정 타임라인'을 작성해야 합니다.

    [주의: 인물의 내적 감정이 아닌, 화면과 소리가 만들어내는 '씬의 전반적인 분위기'에 집중하세요.]

    [분류 체계]
    1. Base Mood (배경 분위기): ['tension', 'sorrow', 'uplift', 'warmth', 'unknown'] 중 택 1
    2. Dynamic Event (사운드 사건): ['stable', 'jump_scare', 'swell', 'sudden_drop'] 중 택 1

    [분석 규칙]
    - 영상을 10초 ~ 15초 단위의 의미 있는 컷(Cut) 구간별로 나누어 분석하세요.
    - 각 구간의 시작(start_time)과 종료(end_time)를 초(second) 단위로 명시하세요.
    - 각 구간의 감정 강도(intensity)를 0.0에서 1.0 사이의 실수로 평가하세요.
    - 이전 구간과 분위기가 확연히 달라졌다면 shift를 true로, 유지된다면 false로 설정하세요.

    [출력 형식]
    반드시 아래 JSON 스키마(Array of Objects) 구문만을 출력해야 합니다. 마크다운이나 다른 설명은 절대 추가하지 마세요.
    [
      {
        "start_time": 0.0,
        "end_time": 10.5,
        "base_mood": "warmth",
        "dynamic_event": "stable",
        "intensity": 0.6,
        "shift": false,
        "reason": "잔잔한 피아노 음악과 함께 평화로운 시골 풍경이 나타남"
      },
      ...
    ]
    """

    user_prompt = f"""
    아래 영상을 분석하여 명시된 JSON 배열 형태로 감정 타임라인을 추출해 주세요.
    """
    
    # 추가 참고 데이터 (Task 8에서 추출한 오디오 피처 등)가 있을 경우
    if audio_features:
        user_prompt += f"\n[참조용 오디오 분석 데이터(librosa 추출)]\n{json.dumps(audio_features, ensure_ascii=False, indent=2)}"

    print("🤖 Gemini 모델 분석 요청 중 (수 십초 가량 소요될 수 있습니다)...")
    
    try:
        # TODO: 실제 영상 파일을 업로드하고 Part 객체로 생성하는 로직 필요.
        # 현 단계에서는 텍스트 프롬프트 기반으로 더미 응답을 유도하거나, 
        # 로컬 영상을 업로드하는 코드를 추가로 구현해야 합니다.
        
        # 현재는 프롬프트 텍스트만 전송 (비디오 입력 부분 추가 전)
        prompt_contents = [system_instruction, user_prompt]
        
        response = model.generate_content(
            prompt_contents,
            generation_config={
                "max_output_tokens": 2048,
                "temperature": 0.2, # 일관된 JSON 출력을 위해 낮은 temperature 설정
            }
        )
        return response.text
    except Exception as e:
        return f"❌ 오류 발생: {e}"

if __name__ == "__main__":
    print("-" * 50)
    print("🎬 Gemini 감정 타임라인 추출 PoC 테스트 스크립트")
    print("-" * 50)
    
    if init_vertex_ai():
        # 테스트용 오디오 피처 (Task 8 결과물이라 가정)
        dummy_audio_features = {
            "tempo": 120,
            "energy_peaks": [1.5, 5.8, 12.3],
            "average_frequency": "high"
        }
        
        # 임시 실행 주석 처리 (프로젝트 ID 등 정보가 필요하므로)
        # result_json = generate_emotion_timeline("dummy_path", dummy_audio_features)
        # print("\n[Gemini 분석 결과]")
        # print(result_json)
        
        print("\n💡 실행 안내:")
        print("1. 파일 상단의 PROJECT_ID를 GCP 프로젝트 ID로 수정하세요.")
        print("2. 터미널에서 `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` 을 실행하세요.")
        print("3. 코드를 수정하여 실제 비디오 파일 경로를 전달하거나 텍스트 프롬프트만으로 테스트하세요.")
        print("   (주석 처리된 실행 코드를 해제하세요.)")

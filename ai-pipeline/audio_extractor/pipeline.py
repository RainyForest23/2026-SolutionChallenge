import os
import sys
import json
import subprocess
import argparse
import tempfile
import librosa
import numpy as np

class AudioFeatureExtractor:
    def __init__(self, segment_duration=10.0, sr=22050):
        self.segment_duration = segment_duration
        self.sr = sr

    def extract_audio_from_video(self, video_path: str) -> str:
        temp_dir = tempfile.gettempdir()
        base_name = os.path.basename(video_path).split('.')[0]
        temp_audio_path = os.path.join(temp_dir, f"{base_name}_extracted.wav")
        command = [
            "ffmpeg",
            "-y",  # 덮어쓰기 허용
            "-i", video_path,
            "-vn",  # 비디오 무시
            "-acodec", "pcm_s16le",  # WAV 코덱
            "-ar", str(self.sr),  # 샘플레이트
            "-ac", "1",  # 모노
            temp_audio_path
        ]
        
        try:
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return temp_audio_path
        except subprocess.CalledProcessError as e:
            print(f"ffmpeg 오디오 추출 실패: {e}")
            raise RuntimeError("오디오 추출에 실패.")

    def analyze_audio(self, audio_path: str) -> dict:
        print(f"오디오 분석 중: '{audio_path}'")
        y, sr = librosa.load(audio_path, sr=self.sr)
        
        total_duration = librosa.get_duration(y=y, sr=sr)
        
        samples_per_segment = int(self.segment_duration * sr)
        total_segments = int(np.ceil(len(y) / samples_per_segment))
        
        segments_data = []
        
        for i in range(total_segments):
            start_sample = i * samples_per_segment
            end_sample = min((i + 1) * samples_per_segment, len(y))
            y_seg = y[start_sample:end_sample]
            
            # 너무 짧은 마지막 구간은 무시하거나 0으로 채울 수 있지만, 현재는 그대로 분석
            if len(y_seg) == 0:
                continue

            start_time = float(start_sample / sr)
            end_time = float(end_sample / sr)
            
            # 특징 1: Energy (단기 에너지, 볼륨/강도)
            rms = librosa.feature.rms(y=y_seg)
            mean_energy = float(np.mean(rms)) if rms.size > 0 else 0.0
            
            # 특징 2: Spectral Centroid (음색의 밝기)
            cent = librosa.feature.spectral_centroid(y=y_seg, sr=sr)
            mean_centroid = float(np.mean(cent)) if cent.size > 0 else 0.0
            
            # 특징 3: Tempo 및 Onset (비트, 박자감, 충격음 발생 횟수)
            onset_env = librosa.onset.onset_strength(y=y_seg, sr=sr)
            tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
            avg_tempo = float(tempo[0] if isinstance(tempo, np.ndarray) else tempo)
            
            onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
            event_count = int(len(onsets))
            
            segments_data.append({
                "segment_id": i + 1,
                "start_time_sec": round(start_time, 2),
                "end_time_sec": round(end_time, 2),
                "features": {
                    "mean_energy": round(mean_energy, 4),
                    "mean_spectral_centroid": round(mean_centroid, 2),
                    "tempo_bpm": round(avg_tempo, 1),
                    "event_count": event_count
                }
            })
            
        return {
            "total_duration_sec": round(total_duration, 2),
            "segment_length_sec": self.segment_duration,
            "segments": segments_data
        }

    def process(self, input_path: str, output_json_path: str = None) -> str:
        """
        메인 파이프라인: 영상/오디오 입력 -> 분석 -> JSON 출력
        """
        temp_audio = None
        target_audio = input_path
        
        # 입력 파일이 영상 포맷인지 단순 체크 (확장자 기반)
        video_extensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm']
        ext = os.path.splitext(input_path)[1].lower()
        
        if ext in video_extensions:
            # 영상인 경우 오디오 추출
            target_audio = self.extract_audio_from_video(input_path)
            temp_audio = target_audio
        
        try:
            # 피처 분석
            analysis_result = self.analyze_audio(target_audio)
            analysis_result["source_file"] = os.path.basename(input_path)
            
            # JSON 반환
            json_output = json.dumps(analysis_result, ensure_ascii=False, indent=2)
            
            # 결과 저장
            if output_json_path:
                with open(output_json_path, 'w', encoding='utf-8') as f:
                    f.write(json_output)
                print(f"결과 저장: {output_json_path}")
            
            return json_output
            
        finally:
            # 임시 파일 정리
            if temp_audio and os.path.exists(temp_audio):
                os.remove(temp_audio)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract continuous audio features from Video/Audio for Emotion AI")
    parser.add_argument("input_file", help="Path to input video (.mp4) or audio (.wav)")
    parser.add_argument("--segment_duration", type=float, default=10.0, help="Duration of each segment in seconds (default: 10.0)")
    parser.add_argument("--output", help="Path to save output JSON")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"입력 파일 없음: {args.input_file}")
        sys.exit(1)
        
    extractor = AudioFeatureExtractor(segment_duration=args.segment_duration)
    result = extractor.process(args.input_file, args.output)
    
    if not args.output:
        print("\n[추출된 오디오 피처 타임라인]")
        print(result)

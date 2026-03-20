import os
import sys
import json
import subprocess
import argparse
import tempfile
import numpy as np
from scipy.io import wavfile


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
            "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", str(self.sr),
            "-ac", "1",
            temp_audio_path
        ]
        try:
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return temp_audio_path
        except subprocess.CalledProcessError as e:
            print(f"ffmpeg 오디오 추출 실패: {e}")
            raise RuntimeError("오디오 추출에 실패.")

    def _load_wav(self, audio_path: str):
        sr, data = wavfile.read(audio_path)
        if data.ndim > 1:
            data = data.mean(axis=1)
        if np.issubdtype(data.dtype, np.integer):
            y = data.astype(np.float32) / np.iinfo(data.dtype).max
        else:
            y = data.astype(np.float32)
        return y, sr

    def _rms(self, y_seg: np.ndarray) -> float:
        return float(np.sqrt(np.mean(y_seg ** 2))) if len(y_seg) > 0 else 0.0

    def _spectral_centroid(self, y_seg: np.ndarray, sr: int) -> float:
        if len(y_seg) == 0:
            return 0.0
        magnitudes = np.abs(np.fft.rfft(y_seg))
        freqs = np.fft.rfftfreq(len(y_seg), d=1.0 / sr)
        mag_sum = magnitudes.sum()
        return float(np.sum(freqs * magnitudes) / mag_sum) if mag_sum > 0 else 0.0

    def _onset_strength(self, y_seg: np.ndarray, hop: int = 256, n_fft: int = 512) -> np.ndarray:
        frames = []
        win = np.hanning(n_fft)
        for i in range(0, len(y_seg) - n_fft, hop):
            frame = y_seg[i:i + n_fft] * win
            frames.append(np.abs(np.fft.rfft(frame)))
        if len(frames) < 2:
            return np.zeros(max(1, len(frames)))
        frames = np.array(frames)
        flux = np.sum(np.maximum(0.0, np.diff(frames, axis=0)), axis=1)
        return flux

    def _tempo_from_onset(self, onset_env: np.ndarray, sr: int, hop: int = 256) -> float:
        if len(onset_env) < 4:
            return 120.0
        corr = np.correlate(onset_env, onset_env, mode='full')
        corr = corr[len(corr) // 2:]
        fps = sr / hop
        min_lag = max(1, int(fps * 60 / 240))
        max_lag = min(int(fps * 60 / 40), len(corr) - 1)
        if min_lag >= max_lag:
            return 120.0
        peak = int(np.argmax(corr[min_lag:max_lag])) + min_lag
        return float(fps * 60.0 / peak)

    def _onset_detect(self, onset_env: np.ndarray) -> np.ndarray:
        if len(onset_env) < 3:
            return np.array([])
        threshold = np.mean(onset_env) + 0.5 * np.std(onset_env)
        peaks = [
            i for i in range(1, len(onset_env) - 1)
            if onset_env[i] > onset_env[i - 1]
            and onset_env[i] > onset_env[i + 1]
            and onset_env[i] > threshold
        ]
        return np.array(peaks)

    def analyze_audio(self, audio_path: str) -> dict:
        print(f"오디오 분석 중: '{audio_path}'")
        y, sr = self._load_wav(audio_path)

        total_duration = len(y) / sr
        samples_per_segment = int(self.segment_duration * sr)
        total_segments = int(np.ceil(len(y) / samples_per_segment))

        segments_data = []

        for i in range(total_segments):
            start_sample = i * samples_per_segment
            end_sample = min((i + 1) * samples_per_segment, len(y))
            y_seg = y[start_sample:end_sample]

            if len(y_seg) == 0:
                continue

            start_time = float(start_sample / sr)
            end_time = float(end_sample / sr)

            mean_energy = self._rms(y_seg)
            mean_centroid = self._spectral_centroid(y_seg, sr)

            onset_env = self._onset_strength(y_seg)
            avg_tempo = self._tempo_from_onset(onset_env, sr)
            onsets = self._onset_detect(onset_env)
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
        temp_audio = None
        target_audio = input_path

        video_extensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm']
        ext = os.path.splitext(input_path)[1].lower()

        if ext in video_extensions:
            target_audio = self.extract_audio_from_video(input_path)
            temp_audio = target_audio

        try:
            analysis_result = self.analyze_audio(target_audio)
            analysis_result["source_file"] = os.path.basename(input_path)

            json_output = json.dumps(analysis_result, ensure_ascii=False, indent=2)

            if output_json_path:
                with open(output_json_path, 'w', encoding='utf-8') as f:
                    f.write(json_output)
                print(f"결과 저장: {output_json_path}")

            return json_output

        finally:
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

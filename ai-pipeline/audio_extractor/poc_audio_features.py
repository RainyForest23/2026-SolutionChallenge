import librosa
import numpy as np
import json
import argparse
import sys
import os

def extract_features(audio_path, segment_duration=10.0):
    """
    Extracts audio features (tempo, key, energy, spectral properties, onsets)
    using librosa for a given audio file, broken down into segments.
    """
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found at {audio_path}")
        sys.exit(1)
        
    print(f"Loading '{audio_path}'...")
    # Load audio. sr=None preserves original sampling rate
    y, sr = librosa.load(audio_path, sr=22050)
    
    total_duration = librosa.get_duration(y=y, sr=sr)
    print(f"Total duration: {total_duration:.2f} seconds")
    
    # Calculate samples per segment
    samples_per_segment = int(segment_duration * sr)
    total_segments = int(np.ceil(len(y) / samples_per_segment))
    
    features = []
    
    print(f"Extracting features across {total_segments} segments (each {segment_duration}s)...")
    for i in range(total_segments):
        start_sample = i * samples_per_segment
        end_sample = min((i + 1) * samples_per_segment, len(y))
        
        # Current segment
        y_seg = y[start_sample:end_sample]
        
        start_time = float(start_sample / sr)
        end_time = float(end_sample / sr)
        
        # 1. Energy (RMS) -> Overall loudness/intensity
        rms = librosa.feature.rms(y=y_seg)[0]
        mean_energy = float(np.mean(rms))
        
        # 2. Spectral Centroid / Bandwidth -> Brightness / Timbre
        cent = librosa.feature.spectral_centroid(y=y_seg, sr=sr)[0]
        mean_centroid = float(np.mean(cent))
        
        # 3. Tempo (BPM)
        onset_env = librosa.onset.onset_strength(y=y_seg, sr=sr)
        tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        avg_tempo = float(tempo[0] if isinstance(tempo, np.ndarray) else tempo)
        
        # 4. Onset detection (number of sudden changes/events)
        onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
        event_count = int(len(onsets))
        
        features.append({
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
        "audio_file": os.path.basename(audio_path),
        "total_duration_sec": round(total_duration, 2),
        "segmentation_sec": segment_duration,
        "segments": features
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract audio features using librosa.")
    parser.add_argument("audio_file", help="Path to the audio file (e.g., sample.wav)")
    parser.add_argument("--segment", type=float, default=10.0, help="Duration of each analysis segment in seconds")
    parser.add_argument("--output", help="Optional path to save the JSON output")
    
    args = parser.parse_args()
    
    results = extract_features(args.audio_file, args.segment)
    
    json_output = json.dumps(results, indent=2)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(json_output)
        print(f"Results saved to {args.output}")
    else:
        print("\n--- Extracted Features ---")
        print(json_output)

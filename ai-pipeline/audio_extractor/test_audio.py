import numpy as np
import scipy.io.wavfile as wav

sample_rate = 22050
duration = 5.0
t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
audio = 0.5 * np.sin(2 * np.pi * 440 * t)
wav.write('dummy_test.wav', sample_rate, np.int16(audio * 32767))
print("Created dummy_test.wav")

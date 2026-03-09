import React, { useRef, useState } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Video, { VideoRef, OnProgressData } from "react-native-video";

const VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function VideoPocScreen() {
  const ref = useRef<VideoRef>(null);

  const [paused, setPaused] = useState(false);
  const [t, setT] = useState(0); // current time (sec)
  const [dur, setDur] = useState<number | null>(null);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null); // onProgress가 들어온 실제 시간(ms)
  const [tickMs, setTickMs] = useState<number | null>(null); // onProgress 간격(ms)
  const [status, setStatus] = useState<string>("ready");

  const onProgress = (p: OnProgressData) => {
    const now = Date.now();
    if (lastTickAt != null) setTickMs(now - lastTickAt);
    setLastTickAt(now);
    setT(p.currentTime);
  };

  const seekBy = (delta: number) => {
    const next = Math.max(0, t + delta);
    ref.current?.seek(next);
    setStatus(`seek(${delta > 0 ? "+" : ""}${delta}s) → ${next.toFixed(2)}s`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Video PoC</Text>

        <View style={styles.videoWrap}>
          <Video
            ref={ref}
            source={{ uri: VIDEO_URL }}
            style={styles.video}
            resizeMode="contain"
            paused={paused}
            onProgress={onProgress}
            onLoad={(m) => {
              setDur(m.duration);
              setStatus(`loaded (duration=${m.duration.toFixed(2)}s)`);
            }}
            onBuffer={(b) => setStatus(b.isBuffering ? "buffering..." : "playing")}
            onError={(e) => setStatus("ERROR: 영상 URL/권한/포맷 확인 필요")}
            progressUpdateInterval={250}
          />

          {/* overlay가 영상 위에 얹히는지 */}
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>t = {t.toFixed(2)}s</Text>
            <Text style={styles.overlaySub}>
              tick: {tickMs ? `${tickMs}ms` : "-"} / dur: {dur ? `${dur.toFixed(2)}s` : "-"}
            </Text>
          </View>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.controls}>
          <View style={styles.btnRow}>
            <Pressable style={styles.btn} onPress={() => setPaused((p) => !p)}>
              <Text style={styles.btnText}>{paused ? "▶ 재생" : "⏸ 일시정지"}</Text>
            </Pressable>

            <Pressable style={styles.btn} onPress={() => seekBy(-10)}>
              <Text style={styles.btnText}>⏪ -10s</Text>
            </Pressable>

            <Pressable style={styles.btn} onPress={() => seekBy(+10)}>
              <Text style={styles.btnText}>⏩ +10s</Text>
            </Pressable>
          </View>

          <Text style={styles.status}>status: {status}</Text>

          <Text style={styles.checklistTitle}>체크 포인트</Text>
          <Text style={styles.checklist}>
            1) 재생됨 (화면에 영상 움직임){"\n"}
            2) onProgress로 t가 자연스럽게 증가{"\n"}
            3) tick(ms)가 너무 튀지 않음 (대략 200~400ms 내외){"\n"}
            4) seek 눌렀을 때 t가 즉시 근처 값으로 점프{"\n"}
            5) overlay가 영상 위에 정상 표시
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },

  videoWrap: { width: "100%", height: 260, backgroundColor: "#111", borderRadius: 12, overflow: "hidden" },
  video: { width: "100%", height: "100%" },

  overlay: { position: "absolute", top: 12, left: 12, padding: 8, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.45)" },
  overlayText: { fontSize: 18, color: "white", fontWeight: "700" },
  overlaySub: { marginTop: 4, fontSize: 12, color: "white", opacity: 0.85 },

  controls: { width: "100%", gap: 10 },
  btnRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: "700" },
  status: { opacity: 0.75 },

  checklistTitle: { fontWeight: "800", marginTop: 6 },
  checklist: { opacity: 0.75, lineHeight: 20 },
});
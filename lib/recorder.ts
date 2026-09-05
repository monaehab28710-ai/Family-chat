import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';

export interface RecordedVoice {
  uri: string | null;
  durationMs: number;
}

/**
 * Voice recording hook (expo-audio).
 * Falls back to a timed capture when microphone permission is unavailable
 * (e.g. desktop browsers without getUserMedia) so the flow stays usable.
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);
  const startedAt = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicker = useCallback(() => {
    if (ticker.current) {
      clearInterval(ticker.current);
      ticker.current = null;
    }
  }, []);

  useEffect(() => stopTicker, [stopTicker]);

  const start = useCallback(async () => {
    if (recording) return;
    startedAt.current = Date.now();
    setDurationMs(0);
    let usingFallback = false;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        usingFallback = true;
      } else {
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch {
      usingFallback = true;
    }
    setFallbackMode(usingFallback);
    setRecording(true);
    ticker.current = setInterval(() => setDurationMs(Date.now() - startedAt.current), 120);
  }, [recorder, recording]);

  const stop = useCallback(async (): Promise<RecordedVoice> => {
    stopTicker();
    const total = Date.now() - startedAt.current;
    let uri: string | null = null;
    if (!fallbackMode) {
      try {
        await recorder.stop();
        uri = recorder.uri ?? null;
      } catch {
        uri = null;
      }
    }
    setRecording(false);
    setDurationMs(0);
    return { uri, durationMs: total };
  }, [fallbackMode, recorder, stopTicker]);

  return { recording, durationMs, start, stop, fallbackMode };
}

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseBlowDetectionReturn {
  isListening: boolean;
  isBlowing: boolean;
  blowStrength: number;
  inputLevel: number;
  peakLevel: number;
  breathRatio: number;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export const useBlowDetection = (): UseBlowDetectionReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const peakLevelRef = useRef(0);
  const blowHoldUntilRef = useRef(0);

  const [isListening, setIsListening] = useState(false);
  const [isBlowing, setIsBlowing] = useState(false);
  const [blowStrength, setBlowStrength] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [breathRatio, setBreathRatio] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopListening = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    peakLevelRef.current = 0;
    blowHoldUntilRef.current = 0;

    setIsListening(false);
    setIsBlowing(false);
    setBlowStrength(0);
    setInputLevel(0);
    setPeakLevel(0);
    setBreathRatio(0);
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
        video: false,
      });

      const audioContext = new window.AudioContext();
      await audioContext.resume();

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.08;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setIsListening(true);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const freqBuffer = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        const activeAnalyser = analyserRef.current;
        if (!activeAnalyser) return;

        activeAnalyser.getByteTimeDomainData(buffer);
        activeAnalyser.getByteFrequencyData(freqBuffer);

        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const normalized = (buffer[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }

        const rms = Math.sqrt(sumSquares / buffer.length);
        const nextPeak = Math.max(peakLevelRef.current * 0.96, rms);
        peakLevelRef.current = nextPeak;

        const nyquist = audioContext.sampleRate / 2;
        const binToFreq = nyquist / freqBuffer.length;
        let breathBand = 0;
        let voiceBand = 0;

        for (let i = 1; i < freqBuffer.length; i += 1) {
          const freq = i * binToFreq;
          const magnitude = freqBuffer[i] / 255;

          if (freq >= 1000 && freq <= 5000) {
            breathBand += magnitude;
          } else if (freq >= 120 && freq <= 900) {
            voiceBand += magnitude;
          }
        }

        const ratio = breathBand / Math.max(voiceBand, 0.0001);
        const normalizedLevel = Math.min(Math.max((rms - 0.01) * 28, 0), 1);
        const normalizedRatio = Math.min(Math.max((ratio - 1.15) / 1.35, 0), 1);
        const strength = Math.min(normalizedLevel * 0.45 + normalizedRatio * 0.85, 1);
        const shouldTrigger = normalizedLevel > 0.08 && normalizedRatio > 0.18;

        if (shouldTrigger) {
          blowHoldUntilRef.current = performance.now() + 160;
        }

        const blowingNow = performance.now() < blowHoldUntilRef.current;

        setInputLevel(rms);
        setPeakLevel(nextPeak);
        setBreathRatio(ratio);
        setBlowStrength(strength);
        setIsBlowing(blowingNow);

        frameRef.current = requestAnimationFrame(sample);
      };

      frameRef.current = requestAnimationFrame(sample);
    } catch (err) {
      console.error('Microphone initialization error:', err);
      setError('无法访问麦克风，请检查浏览器权限设置');
      stopListening();
    }
  }, [isListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isBlowing,
    blowStrength,
    inputLevel,
    peakLevel,
    breathRatio,
    error,
    startListening,
    stopListening,
  };
};

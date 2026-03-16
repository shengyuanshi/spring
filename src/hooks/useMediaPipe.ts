import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  score: number;
}

export interface UseMediaPipeReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  handData: HandData | null;
  fingerPosition: { x: number; y: number } | null;
  isFingerTouching: boolean;
  resultCount: number;
  landmarkCount: number;
  startCamera: (externalVideo?: HTMLVideoElement | null) => Promise<void>;
  stopCamera: () => void;
}

export const useMediaPipe = (): UseMediaPipeReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handData, setHandData] = useState<HandData | null>(null);
  const [fingerPosition, setFingerPosition] = useState<{ x: number; y: number } | null>(null);
  const [isFingerTouching, setIsFingerTouching] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);

  const onResults = useCallback((results: Results) => {
    setResultCount((prev) => prev + 1);
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      setLandmarkCount((prev) => prev + 1);
      const handedness = results.multiHandedness?.[0]?.label || 'Right';
      const score = results.multiHandedness?.[0]?.score || 0;
      
      setHandData({
        landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z })),
        handedness: handedness as 'Left' | 'Right',
        score
      });

      // Get index finger tip position (landmark 8)
      const indexFingerTip = landmarks[8];
      if (indexFingerTip) {
        setFingerPosition({
          x: indexFingerTip.x,
          y: indexFingerTip.y
        });

        // Check if finger is touching (thumb tip close to index tip)
        const thumbTip = landmarks[4];
        if (thumbTip) {
          const distance = Math.sqrt(
            Math.pow(indexFingerTip.x - thumbTip.x, 2) +
            Math.pow(indexFingerTip.y - thumbTip.y, 2)
          );
          setIsFingerTouching(distance < 0.05);
        }
      }
    } else {
      setHandData(null);
      setFingerPosition(null);
      setIsFingerTouching(false);
    }
  }, []);

  const waitForVideoReady = useCallback(async (video: HTMLVideoElement) => {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      const handleReady = () => {
        video.removeEventListener('loadeddata', handleReady);
        video.removeEventListener('canplay', handleReady);
        resolve();
      };

      video.addEventListener('loadeddata', handleReady, { once: true });
      video.addEventListener('canplay', handleReady, { once: true });
    });
  }, []);

  const stopFrameLoop = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
  }, []);

  const startFrameLoop = useCallback((video: HTMLVideoElement, hands: Hands) => {
    stopFrameLoop();

    const sendFrame = async () => {
      if (!handsRef.current) return;

      try {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !video.paused && !video.ended) {
          await hands.send({ image: video });
        }
      } catch (err) {
        console.error('Hands frame processing error:', err);
        setError('手势识别处理中断，请刷新页面重试');
      } finally {
        frameRequestRef.current = requestAnimationFrame(() => {
          void sendFrame();
        });
      }
    };

    frameRequestRef.current = requestAnimationFrame(() => {
      void sendFrame();
    });
  }, [stopFrameLoop]);

  const startCamera = useCallback(async (externalVideo?: HTMLVideoElement | null) => {
    const targetVideo = externalVideo ?? videoRef.current;
    if (!targetVideo) return;

    setIsLoading(true);
    setError(null);

    try {
      stopFrameLoop();
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }

      // Initialize Hands
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      if (externalVideo) {
        await waitForVideoReady(targetVideo);
        startFrameLoop(targetVideo, hands);
      } else {
        const camera = new Camera(targetVideo, {
          onFrame: async () => {
            await hands.send({ image: targetVideo });
          },
          width: 640,
          height: 480
        });

        cameraRef.current = camera;
        await camera.start();
      }
      
      setIsInitialized(true);
      setIsLoading(false);
    } catch (err) {
      console.error('MediaPipe initialization error:', err);
      setError('无法启动摄像头或手势识别，请确保允许摄像头权限');
      setIsLoading(false);
    }
  }, [onResults, startFrameLoop, stopFrameLoop, waitForVideoReady]);

  const stopCamera = useCallback(() => {
    stopFrameLoop();
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    setIsInitialized(false);
    setHandData(null);
    setFingerPosition(null);
    setIsFingerTouching(false);
    setResultCount(0);
    setLandmarkCount(0);
  }, [stopFrameLoop]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isLoading,
    error,
    handData,
    fingerPosition,
    isFingerTouching,
    resultCount,
    landmarkCount,
    startCamera,
    stopCamera
  };
};

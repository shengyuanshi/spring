import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceMesh, type Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export interface FaceData {
  landmarks: { x: number; y: number; z: number }[];
  isMouthOpen: boolean;
  mouthOpenness: number;
  mouthRoundness: number;
  isBlowingShape: boolean;
  leftEyeOpen: boolean;
  rightEyeOpen: boolean;
  leftEyePosition: { x: number; y: number } | null;
  rightEyePosition: { x: number; y: number } | null;
}

export interface UseFaceMeshReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  faceData: FaceData | null;
  isMouthOpen: boolean;
  mouthOpenness: number;
  mouthRoundness: number;
  isBlowingShape: boolean;
  leftEyePosition: { x: number; y: number } | null;
  rightEyePosition: { x: number; y: number } | null;
  resultCount: number;
  landmarkCount: number;
  startCamera: (externalVideo?: HTMLVideoElement | null) => Promise<void>;
  stopCamera: () => void;
}

const distanceBetween = (
  a: { x: number; y: number; z: number } | undefined,
  b: { x: number; y: number; z: number } | undefined
) => {
  if (!a || !b) return 0;

  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
};

// Detect a rounded "O" mouth shape that is more indicative of blowing than speaking.
const calculateMouthMetrics = (landmarks: { x: number; y: number; z: number }[]) => {
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];
  const leftMouthCorner = landmarks[78];
  const rightMouthCorner = landmarks[308];
  const upperInnerLip = landmarks[0];
  const lowerInnerLip = landmarks[17];
  
  if (!upperLip || !lowerLip || !leftMouthCorner || !rightMouthCorner || !upperInnerLip || !lowerInnerLip) {
    return { openness: 0, roundness: 0, isBlowingShape: false };
  }
  
  const verticalDistance = distanceBetween(upperLip, lowerLip);
  const innerGap = distanceBetween(upperInnerLip, lowerInnerLip);
  const mouthWidth = distanceBetween(leftMouthCorner, rightMouthCorner);

  if (mouthWidth === 0) {
    return { openness: 0, roundness: 0, isBlowingShape: false };
  }
  
  const normalizedOpenness = Math.min(Math.max((innerGap / mouthWidth) * 6, 0), 1);
  const roundness = Math.min(Math.max((verticalDistance / mouthWidth) * 4.2, 0), 1);
  const isBlowingShape = normalizedOpenness > 0.18 && roundness > 0.62 && mouthWidth < 0.14;

  return {
    openness: normalizedOpenness,
    roundness,
    isBlowingShape
  };
};

// Check if eye is open
const isEyeOpen = (landmarks: { x: number; y: number; z: number }[], eyePoints: number[]): boolean => {
  const upper = landmarks[eyePoints[0]];
  const lower = landmarks[eyePoints[1]];
  
  if (!upper || !lower) return true;
  
  const distance = Math.abs(upper.y - lower.y);
  return distance > 0.015; // Threshold for eye being open
};

export const useFaceMesh = (): UseFaceMeshReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceData, setFaceData] = useState<FaceData | null>(null);
  const [isMouthOpen, setIsMouthOpen] = useState(false);
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [mouthRoundness, setMouthRoundness] = useState(0);
  const [isBlowingShape, setIsBlowingShape] = useState(false);
  const [leftEyePosition, setLeftEyePosition] = useState<{ x: number; y: number } | null>(null);
  const [rightEyePosition, setRightEyePosition] = useState<{ x: number; y: number } | null>(null);
  const [resultCount, setResultCount] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);

  const onResults = useCallback((results: Results) => {
    setResultCount((prev) => prev + 1);
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      setLandmarkCount((prev) => prev + 1);
      
      const { openness, roundness, isBlowingShape: blowingShape } = calculateMouthMetrics(landmarks);
      const mouthOpen = openness > 0.12;
      
      // Check eyes
      const leftOpen = isEyeOpen(landmarks, [159, 145]); // Left eye upper/lower
      const rightOpen = isEyeOpen(landmarks, [386, 374]); // Right eye upper/lower
      
      // Get eye positions for tear drops
      const leftEye = landmarks[33]; // Left eye outer corner
      const rightEye = landmarks[263]; // Right eye outer corner
      
      const newFaceData: FaceData = {
        landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z })),
        isMouthOpen: mouthOpen,
        mouthOpenness: openness,
        mouthRoundness: roundness,
        isBlowingShape: blowingShape,
        leftEyeOpen: leftOpen,
        rightEyeOpen: rightOpen,
        leftEyePosition: leftEye ? { x: leftEye.x, y: leftEye.y } : null,
        rightEyePosition: rightEye ? { x: rightEye.x, y: rightEye.y } : null
      };
      
      setFaceData(newFaceData);
      setIsMouthOpen(mouthOpen);
      setMouthOpenness(openness);
      setMouthRoundness(roundness);
      setIsBlowingShape(blowingShape);
      setLeftEyePosition(leftEye ? { x: leftEye.x, y: leftEye.y } : null);
      setRightEyePosition(rightEye ? { x: rightEye.x, y: rightEye.y } : null);
    } else {
      setFaceData(null);
      setIsMouthOpen(false);
      setMouthOpenness(0);
      setMouthRoundness(0);
      setIsBlowingShape(false);
      setLeftEyePosition(null);
      setRightEyePosition(null);
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

  const startFrameLoop = useCallback((video: HTMLVideoElement, faceMesh: FaceMesh) => {
    stopFrameLoop();

    const sendFrame = async () => {
      if (!faceMeshRef.current) return;

      try {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !video.paused && !video.ended) {
          await faceMesh.send({ image: video });
        }
      } catch (err) {
        console.error('FaceMesh frame processing error:', err);
        setError('面部识别处理中断，请刷新页面重试');
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
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }

      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      if (externalVideo) {
        await waitForVideoReady(targetVideo);
        startFrameLoop(targetVideo, faceMesh);
      } else {
        const camera = new Camera(targetVideo, {
          onFrame: async () => {
            await faceMesh.send({ image: targetVideo });
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
      console.error('FaceMesh initialization error:', err);
      setError('无法启动摄像头或面部识别，请确保允许摄像头权限');
      setIsLoading(false);
    }
  }, [onResults, startFrameLoop, stopFrameLoop, waitForVideoReady]);

  const stopCamera = useCallback(() => {
    stopFrameLoop();
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    setIsInitialized(false);
    setFaceData(null);
    setIsMouthOpen(false);
    setMouthOpenness(0);
    setMouthRoundness(0);
    setIsBlowingShape(false);
    setLeftEyePosition(null);
    setRightEyePosition(null);
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
    isInitialized,
    isLoading,
    error,
    faceData,
    isMouthOpen,
    mouthOpenness,
    mouthRoundness,
    isBlowingShape,
    leftEyePosition,
    rightEyePosition,
    resultCount,
    landmarkCount,
    startCamera,
    stopCamera
  };
};

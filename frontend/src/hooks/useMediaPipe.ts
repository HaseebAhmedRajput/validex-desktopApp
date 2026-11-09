
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CalibrationBaseline, ProctorService, ProctorViolation } from "../services/proctor";

interface UseMediaPipeProps {
  cameraActive: boolean;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  enabled: boolean;
  isMonitoringEnabled: boolean;
  onViolation: (v: ProctorViolation) => void;
  onCalibrationComplete?: () => void;
  onCalibrationTimeout?: () => void;
}

interface UseMediaPipeResult {
  isCalibrating: boolean;
  calibrationProgress: number;
  startCalibration: () => void;
  baseline: CalibrationBaseline | null;
  cleanup: () => void;
}

const REQUIRED_CALIBRATION_FRAMES = 30;
const MIN_ACCEPTABLE_CALIBRATION_FRAMES = 12;
const CALIBRATION_TIMEOUT_MS = 20000;
const FRAME_INTERVAL_MS = 125;

export function useMediaPipe({
  cameraActive,
  videoRef,
  enabled,
  isMonitoringEnabled,
  onViolation,
  onCalibrationComplete,
  onCalibrationTimeout,
}: UseMediaPipeProps): UseMediaPipeResult {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null);

  const calibrationSamplesRef = useRef<Partial<CalibrationBaseline>[]>([]);
  const isCalibratingRef = useRef(false);
  const isInitializingRef = useRef(false);
  const processingLoopRef = useRef<number | null>(null);
  const calibrationStartedAtRef = useRef<number>(0);

  // Keep the latest callback props in refs so this hook's internal
  // effects never need to depend on caller-supplied callback identity.
  const onViolationRef = useRef(onViolation);
  const onCalibrationCompleteRef = useRef(onCalibrationComplete);
  const onCalibrationTimeoutRef = useRef(onCalibrationTimeout);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onCalibrationCompleteRef.current = onCalibrationComplete; }, [onCalibrationComplete]);
  useEffect(() => { onCalibrationTimeoutRef.current = onCalibrationTimeout; }, [onCalibrationTimeout]);

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  const finishCalibrationSystem = useCallback(() => {
    console.log("[Calibration Finished]", { samples: calibrationSamplesRef.current.length });
    const valid = calibrationSamplesRef.current.filter(
      (frame) =>
        frame &&
        frame.yaw !== undefined &&
        frame.faceSize !== undefined &&
        frame.faceSize > 0.05,
    );

    if (valid.length > 0) {
      const averageBaseline: CalibrationBaseline = {
        yaw: median(valid.map(f => f.yaw!)),
        pitch: median(valid.map(f => f.pitch!)),
        roll: median(valid.map(f => f.roll!)),
        noseX: median(valid.map(f => f.noseX!)),
        noseY: median(valid.map(f => f.noseY!)),
        faceCenterX: median(valid.map(f => f.faceCenterX!)),
        faceCenterY: median(valid.map(f => f.faceCenterY!)),
        faceSize: median(valid.map(f => f.faceSize!)),
      };

      ProctorService.baseline = averageBaseline;
      localStorage.setItem(ProctorService.CENTER_PROFILE_KEY, JSON.stringify(averageBaseline));
      setBaseline(averageBaseline);
      console.log("[BASELINE]", averageBaseline);
    } else {
      ProctorService.baseline = null;
      localStorage.removeItem(ProctorService.CENTER_PROFILE_KEY);
      setBaseline(null);
      console.warn("[ValidEx Calibration] No valid MediaPipe frames were captured for CENTER_PROFILE.");
    }

    setIsCalibrating(false);
    isCalibratingRef.current = false;
    setCalibrationProgress(100);
    onCalibrationCompleteRef.current?.();
  }, []);

  const abortCalibrationSystem = useCallback(() => {
    console.warn(
      "[ValidEx Calibration] Timed out without collecting enough stable frames. Aborting for retry.",
      { samples: calibrationSamplesRef.current.length },
    );
    calibrationSamplesRef.current = [];
    setIsCalibrating(false);
    isCalibratingRef.current = false;
    setCalibrationProgress(0);
    onCalibrationTimeoutRef.current?.();
  }, []);

  const startCalibration = useCallback(() => {
    console.log("[Calibration] startCalibration called", {
      cameraActive,
      enabled,
      alreadyCalibrating: isCalibratingRef.current,
    });
    if (!cameraActive || !enabled || isCalibratingRef.current) {
      return;
    }
    ProctorService.resetSmoothing();
    calibrationSamplesRef.current = [];
    calibrationStartedAtRef.current = Date.now();
    setCalibrationProgress(0);
    setIsCalibrating(true);
    isCalibratingRef.current = true;
  }, [cameraActive, enabled]);

  const cleanup = useCallback(() => {
    if (processingLoopRef.current !== null) {
      window.clearInterval(processingLoopRef.current);
      processingLoopRef.current = null;
    }

    isCalibratingRef.current = false;
    setIsCalibrating(false);
    setCalibrationProgress(0);
    calibrationSamplesRef.current = [];
    ProctorService.cleanup();
  }, []);

  useEffect(() => {
    if (!enabled || !cameraActive) {
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const initializeLandmarker = async () => {
      if (!enabled || !cameraActive || isInitializingRef.current || ProctorService.isReady()) {
        return;
      }

      const canInitialize =
        videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        videoElement.videoWidth > 0 &&
        videoElement.videoHeight > 0;

      if (!canInitialize) {
        return;
      }

      isInitializingRef.current = true;
      console.log("[MediaPipe] Initializing...");
      try {
        await ProctorService.initialize();
        console.log("[MediaPipe] Initialized");
      } finally {
        isInitializingRef.current = false;
      }
    };

    const handleVideoReady = () => {
      void initializeLandmarker();
    };

    handleVideoReady();
    videoElement.addEventListener("loadedmetadata", handleVideoReady);
    videoElement.addEventListener("playing", handleVideoReady);

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleVideoReady);
      videoElement.removeEventListener("playing", handleVideoReady);
    };
  }, [cameraActive, enabled, videoRef]);

  useEffect(() => {
    if (!enabled || !cameraActive || (!isCalibrating && !isMonitoringEnabled)) {
      if (processingLoopRef.current !== null) {
        window.clearInterval(processingLoopRef.current);
        processingLoopRef.current = null;
      }
      return;
    }

    if (processingLoopRef.current !== null) {
      return;
    }

    processingLoopRef.current = window.setInterval(async () => {
      const videoElement = videoRef.current;
      if (
        !videoElement ||
        videoElement.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
        videoElement.videoWidth === 0 ||
        videoElement.videoHeight === 0
      ) {
        return;
      }

      if (isCalibratingRef.current && calibrationStartedAtRef.current > 0) {
        const elapsed = Date.now() - calibrationStartedAtRef.current;
        if (elapsed > CALIBRATION_TIMEOUT_MS) {
          if (calibrationSamplesRef.current.length >= MIN_ACCEPTABLE_CALIBRATION_FRAMES) {
            finishCalibrationSystem();
          } else {
            abortCalibrationSystem();
          }
          return;
        }
      }

      if (videoElement.srcObject instanceof MediaStream) {
        const verified = await ProctorService.verifyCameraStream(videoElement.srcObject);
        if (!verified.success) {
          const streamViolation: ProctorViolation = {
            type: verified.errorType || "CAMERA_DISCONNECTED",
            timestamp: new Date().toISOString(),
            confidence: 0.99,
            description: verified.errorDesc || "Webcam input feed went offline.",
            severity: "high",
          };
          console.error("[VIOLATION][CameraStream]", streamViolation.type, streamViolation.description);
          onViolationRef.current(streamViolation);
          return;
        }
      }

      await ProctorService.analyzeFrame(
        videoElement,
        (v) => onViolationRef.current(v),
        isCalibratingRef.current,
        (frameProgress) => {
          if (!isCalibratingRef.current) {
            return;
          }

          const candidateFrame:any = {
            yaw: frameProgress.yaw,
            pitch: frameProgress.pitch,
            roll: frameProgress.roll,
            noseX: frameProgress.noseX,
            noseY: frameProgress.noseY,
            faceCenterX: frameProgress.faceCenterX,
            faceCenterY: frameProgress.faceCenterY,
            faceSize: frameProgress.faceSize,
          };

          const isStable =
            Math.abs(candidateFrame.yaw) < 0.12 &&
            Math.abs(candidateFrame.pitch) < 0.12 &&
            Math.abs(candidateFrame.roll) < 10;

          const isCentered =
            Math.abs(candidateFrame.faceCenterX - 0.5) < 0.18 &&
            Math.abs(candidateFrame.faceCenterY - 0.5) < 0.18;

          const isFaceSizeGood =
            candidateFrame.faceSize > 0.08 && candidateFrame.faceSize < 0.60;

          if (!isStable || !isCentered || !isFaceSizeGood) {
            return;
          }

          const nextFrames = [...calibrationSamplesRef.current, candidateFrame];
          calibrationSamplesRef.current = nextFrames;

          const progress = Math.min(100, Math.round((nextFrames.length / REQUIRED_CALIBRATION_FRAMES) * 100));
          setCalibrationProgress(progress);

          if (nextFrames.length >= REQUIRED_CALIBRATION_FRAMES) {
            finishCalibrationSystem();
          }
        },
      );
    }, FRAME_INTERVAL_MS);

    return () => {
      if (processingLoopRef.current !== null) {
        window.clearInterval(processingLoopRef.current);
        processingLoopRef.current = null;
      }
    };
  }, [cameraActive, enabled, isCalibrating, isMonitoringEnabled, videoRef, finishCalibrationSystem, abortCalibrationSystem]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isCalibrating,
    calibrationProgress,
    startCalibration,
    baseline,
    cleanup,
  };
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ProctorViolation } from '../services/proctor';

interface UseCameraResult {
  stream: MediaStream | null;
  cameraActive: boolean;
  cameraAllowed: boolean | null;
  cameraError: string | null;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  assignVideoRef: (node: HTMLVideoElement | null) => void;
  startCameraInput: () => Promise<void>;
  stopCameraInput: () => void;
}

const ATTACH_TIMEOUT_MS = 4000;

export function useCamera(onViolation?: (v: ProctorViolation) => void): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef(false);

  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const isStreamLive = (candidate: MediaStream | null): candidate is MediaStream => {
    if (!candidate) return false;
    const track = candidate.getVideoTracks()[0];
    return Boolean(track && track.readyState === 'live');
  };

  const attachStreamToVideo = useCallback(async (activeStream: MediaStream | null) => {
    const element = videoRef.current;
    if (!element) return;

    if (!activeStream) {
      element.pause();
      element.srcObject = null;
      return;
    }

    if (element.srcObject !== activeStream) {
      element.srcObject = activeStream;
    }

    try {
      if (element.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        await element.play();
        return;
      }
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          element.removeEventListener('loadedmetadata', finish);
          element.removeEventListener('canplay', finish);
          clearTimeout(timeoutId);
          resolve();
        };
        const timeoutId = window.setTimeout(finish, ATTACH_TIMEOUT_MS);
        element.addEventListener('loadedmetadata', finish, { once: true });
        element.addEventListener('canplay', finish, { once: true });
      });

      await element.play();
    } catch (error: any) {
      if (error?.name !== 'AbortError' && error?.name !== 'NotAllowedError') {
        console.warn('Camera playback warning', error);
      }
    }
  }, []);

  const assignVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;

      if (node && isStreamLive(streamRef.current)) {
        void attachStreamToVideo(streamRef.current);
      }
    },
    [attachStreamToVideo],
  );

  const requestFreshStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('System Media Capture API is not defined or supported.');
    }

    const activeStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: { ideal: 15 } },
    });

    activeStream.getVideoTracks().forEach((track) => {
      track.onended = () => {
       
        if (streamRef.current === activeStream) {
          streamRef.current = null;
        }
        setStream(null);
        setCameraActive(false);

        const endedViolation: ProctorViolation = {
          type: 'CAMERA_DISCONNECTED',
          timestamp: new Date().toISOString(),
          confidence: 0.99,
          description: 'Hardware Violation: Webcam video feed track was physically unplugged or terminated.',
          severity: 'high',
        };
        onViolationRef.current?.(endedViolation);
      };
    });

    return activeStream;
  }, []);

  const startCameraInput = useCallback(async () => {
  
    if (isStreamLive(streamRef.current)) {
      setStream(streamRef.current);
      setCameraActive(true);
      setCameraAllowed(true);
      setCameraError(null);
      await attachStreamToVideo(streamRef.current);
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track:any) => track.stop());
      streamRef.current = null;
    }

    if (isRequestingRef.current) {
      return;
    }

    isRequestingRef.current = true;
    setCameraError(null);

    try {
      const activeStream = await requestFreshStream();

      streamRef.current = activeStream;
      setStream(activeStream);
      setCameraActive(true);
      setCameraAllowed(true);
      setCameraError(null);
      await attachStreamToVideo(activeStream);
    } catch (err: any) {
      console.error('Camera allocation failed:', err);
      setCameraAllowed(false);
      setCameraActive(false);
      setCameraError(err.message || 'Permission denied or webcam disconnected.');

      const bootViolation: ProctorViolation = {
        type: 'CAMERA_NOT_AVAILABLE',
        timestamp: new Date().toISOString(),
        confidence: 0.99,
        description: 'Critical: Student blocked webcam authorization or hardware disconnected.',
        severity: 'high',
      };
      onViolationRef.current?.(bootViolation);
    } finally {
      isRequestingRef.current = false;
    }
  }, [attachStreamToVideo, requestFreshStream]);

  const stopCameraInput = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setCameraActive(false);
    setCameraAllowed(null);
    setCameraError(null);
    isRequestingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopCameraInput();
    };
  }, [stopCameraInput]);

  return {
    stream,
    cameraActive,
    cameraAllowed,
    cameraError,
    videoRef,
    assignVideoRef,
    startCameraInput,
    stopCameraInput,
  };
}

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { WailsService } from "./wails";

export interface ProctorViolation {
  type: string;
  timestamp: string;
  confidence: number;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface CalibrationBaseline {
  yaw: number;
  pitch: number;
  roll: number;
  noseX: number;
  noseY: number;
  faceCenterX: number;
  faceCenterY: number;
  faceSize: number;
}

export class ProctorService {
  private static smoothYaw = 0;
  private static smoothPitch = 0;
  private static smoothRoll = 0;
  private static smoothFaceX = 0;
  private static smoothFaceY = 0;

  private static readonly EMA_ALPHA = 0.25;
  private static landmarker: FaceLandmarker | null = null;
  private static isInitializing = false;
  private static initFailed = false;
private static lastTimestamp = 0;
  // Calibration and baseline holding. If null, we are not calibrated.
  public static baseline: CalibrationBaseline | null = null;
  public static readonly CENTER_PROFILE_KEY = "CENTER_PROFILE";

  // Sliding-window buffers for false positive reduction (statistical analysis)
  private static noFaceWindow: number[] = [];
  private static multiFaceWindow: number[] = [];
  private static headDeviationWindow: number[] = [];
  private static readonly WINDOW_SIZE = 20; // ~2 seconds of sliding context history
  private static readonly ANOMALY_RATIO_THRESHOLD = 0.70; // 70% of recent frames must match abnormal criteria
  private static readonly HEAD_MOVEMENT_THRESHOLD = 0.28; // used only to label the dominant deviation axis in the description text
  private static readonly VIOLATION_COOLDOWN_MS = 5000;
  private static lastViolationTimes = new Map<string, number>();

  // Mutex state to prevent concurrent main-thread frame clogging or memory leaks
  public static isProcessing = false;

  
  private static updateSlidingWindow(
    windowQueue: number[],
    isAnomalous: boolean,
  ): boolean {
    windowQueue.push(isAnomalous ? 1 : 0);
    if (windowQueue.length > this.WINDOW_SIZE) {
      windowQueue.shift();
    }
    if (windowQueue.length < 8) return false; // Ensure minimum sample history size
    const sum = windowQueue.reduce((a, b) => a + b, 0);
    const ratio = sum / windowQueue.length;
    return ratio >= this.ANOMALY_RATIO_THRESHOLD;
  }

  private static resetWindow(windowQueue: number[]) {
    windowQueue.length = 0;
  }

  public static isReady(): boolean {
    return this.landmarker !== null;
  }

  private static canFireViolation(type: string): boolean {
    const now = Date.now();

    const last = this.lastViolationTimes.get(type);

    if (last && now - last < this.VIOLATION_COOLDOWN_MS) {
      return false;
    }

    this.lastViolationTimes.set(type, now);
    return true;
  }
  public static async initialize(): Promise<boolean> {
    if (this.landmarker) return true;
    if (this.isInitializing) return false;
    this.isInitializing = true;

    try {
      console.log(
        "[ValidEx local AI] Loading offline MediaPipe WebAssembly resolver...",
      );
      const vision = await FilesetResolver.forVisionTasks(
        "/models/mediapipe/wasm",
      );

      console.log(
        " [ValidEx local AI] Loading local face_landmarker.task binary...",
      );
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/mediapipe/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 2,
      });

      this.initFailed = false;
      console.log(
        " [ValidEx local AI] MediaPipe Face Landmarker initialized successfully.",
      );
      return true;
    } catch (err: any) {
      console.error("LOCAL MEDIAPIPE FAILED - EXAM CANNOT START", err);
      this.initFailed = true;
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Verifies if the camera is fully ready and has sound video output
   */
  public static async verifyCameraStream(
    stream: MediaStream,
  ): Promise<{ success: boolean; errorType?: string; errorDesc?: string }> {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      return {
        success: false,
        errorType: "CAMERA_NOT_AVAILABLE",
        errorDesc: "No active video track detected in standard system feed.",
      };
    }

    if (videoTrack.readyState === "ended" || !videoTrack.enabled) {
      return {
        success: false,
        errorType: "CAMERA_DISCONNECTED",
        errorDesc: "The primary camera was disabled or switched off.",
      };
    }

    // Verify stream is actively sending frames (non-frozen checking)
    const settings = videoTrack.getSettings();
    if (settings.width === 0 || settings.height === 0) {
      return {
        success: false,
        errorType: "CAMERA_DISCONNECTED",
        errorDesc: "Camera sensor returned a blank/frozen 0x0 canvas.",
      };
    }

    return { success: true };
  }

  public static async analyzeFrame(
    video: HTMLVideoElement,
    onViolation: (v: ProctorViolation) => void,
    isCalibrating: boolean = false,
    onCalibrateFrame?: (progressData: Partial<CalibrationBaseline>) => void,
  ): Promise<any> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const nowTimestamp = new Date().toISOString();

    try {
      // 1. Fallback logic if MediaPipe is not present or offline assets are missing.
      if (this.initFailed || !this.landmarker) {
        // Check stream status
        if (video.paused || video.ended) {
          if (this.updateSlidingWindow(this.noFaceWindow, true)) {
            onViolation({
              type: "CAMERA_DISCONNECTED",
              timestamp: nowTimestamp,
              confidence: 0.99,
              description:
                "Suspicious Feed Freeze: Primary Web camera stream is suspended or stopped.",
              severity: "high",
            });
            this.resetWindow(this.noFaceWindow);
          }
          return;
        }
        this.updateSlidingWindow(this.noFaceWindow, false);
        return;
      }

      // 2. Real MediaPipe Face Landmarker logic
    let timestamp = performance.now();

if (timestamp <= this.lastTimestamp) {
  timestamp = this.lastTimestamp + 1;
}

this.lastTimestamp = timestamp;

const result = this.landmarker.detectForVideo(video, timestamp);

      // Detect Face Presence
      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        this.updateSlidingWindow(this.multiFaceWindow, false);
        if (
          this.updateSlidingWindow(this.noFaceWindow, true) &&
          this.noFaceWindow.length >= 30
        ) {
          const violation: ProctorViolation = {
            type: "FACE_NOT_DETECTED",
            timestamp: nowTimestamp,
            confidence: 0.98,
            description:
              "Critical Alert: Zero student faces registered in the proctor camera feed.",
            severity: "high",
          };
          console.error("[VIOLATION][MediaPipe]", violation.type, violation);
          if (this.canFireViolation(violation.type)) {
            onViolation(violation);

            await WailsService.fireSecurityViolation(
              "HEAD_MOVEMENT_AWAY",
              `Head looking away `,
            );
          }
          this.resetWindow(this.noFaceWindow);
        }
        return;
      }

      // Multiple Face Detection
      if (result.faceLandmarks.length > 1) {
        this.updateSlidingWindow(this.noFaceWindow, false);
        if (this.updateSlidingWindow(this.multiFaceWindow, true)) {
          const violation: ProctorViolation = {
            type: "MULTIPLE_FACE_DETECTED",
            timestamp: nowTimestamp,
            confidence: 0.96,
            description:
              "Security Threat: Multiple human faces detected inside critical testing frame.",
            severity: "high",
          };
          console.error("[VIOLATION][MediaPipe]", violation.type, violation);
          if (this.canFireViolation(violation.type)) {
            onViolation(violation);

            await WailsService.fireSecurityViolation(
              "MULTIPLE_FACE_DETECTED",
              "Additional person detected in stream.",
            );
          }
          this.resetWindow(this.multiFaceWindow);
        }
        return;
      }

      // Reset face presence counters on clean single face detection
      this.updateSlidingWindow(this.noFaceWindow, false);
      this.updateSlidingWindow(this.multiFaceWindow, false);

      // Extract single face landmarks
      const L = result.faceLandmarks[0];

      const nose = L[1];
      const cheekL = L[234];
      const cheekR = L[454];
      const forehead = L[10];
      const chin = L[152];

      const eyeL_out = L[33];
      const eyeR_out = L[263];

      if (
        !nose ||
        !cheekL ||
        !cheekR ||
        !forehead ||
        !chin ||
        !eyeL_out ||
        !eyeR_out
      ) {
        return;
      }

      // Mathematical estimation for Head Pose (Yaw, Pitch, Roll)
      const cheeksWidth = Math.abs(cheekR.x - cheekL.x) || 0.01;
      const faceCenterX = (cheekL.x + cheekR.x) / 2;
      const yaw = (nose.x - faceCenterX) / cheeksWidth;

      const faceHeight = Math.abs(chin.y - forehead.y) || 0.01;
      const faceCenterY = (forehead.y + chin.y) / 2;
      const pitch = (nose.y - faceCenterY) / faceHeight;

      const eyeDx = eyeR_out.x - eyeL_out.x;
      const eyeDy = eyeR_out.y - eyeL_out.y;
      const roll = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);

      // Face centration parameters
      const faceSize = cheeksWidth;

      this.smoothYaw =
        this.smoothYaw * (1 - this.EMA_ALPHA) + yaw * this.EMA_ALPHA;
      this.smoothPitch =
        this.smoothPitch * (1 - this.EMA_ALPHA) + pitch * this.EMA_ALPHA;
      this.smoothRoll =
        this.smoothRoll * (1 - this.EMA_ALPHA) + roll * this.EMA_ALPHA;

      this.smoothFaceX =
        this.smoothFaceX === 0
          ? faceCenterX
          : this.smoothFaceX +
            this.EMA_ALPHA * (faceCenterX - this.smoothFaceX);

      this.smoothFaceY =
        this.smoothFaceY === 0
          ? faceCenterY
          : this.smoothFaceY +
            this.EMA_ALPHA * (faceCenterY - this.smoothFaceY);

      // If calibration phase is active, we stream coordinates straight to calibration baseline collector
      if (isCalibrating && onCalibrateFrame) {
        onCalibrateFrame({
          yaw: this.smoothYaw,
          pitch: this.smoothPitch,
          roll: this.smoothRoll,
          noseX: nose.x,
          noseY: nose.y,
          faceCenterX: this.smoothFaceX,
          faceCenterY: this.smoothFaceY,
          faceSize,
        });
        return;
      }

      // 3. Comparison with Baseline Calibration values to detect real anomalies
      if (this.baseline) {
        const signedYaw = this.smoothYaw - this.baseline.yaw;
        const signedPitch = this.smoothPitch - this.baseline.pitch;
        const signedFaceX = this.smoothFaceX - this.baseline.faceCenterX;
        const signedFaceY = this.smoothFaceY - this.baseline.faceCenterY;

        const dYaw = Math.abs(signedYaw);
        const dPitch = Math.abs(signedPitch);
        const dRoll = Math.abs(this.smoothRoll - this.baseline.roll);
        const dFaceX = Math.abs(signedFaceX);
        const dFaceY = Math.abs(signedFaceY);
       const yawThreshold = 0.22;
const pitchThreshold = 0.20;
const rollThreshold = 22;

const faceThresholdX = 0.08;
const faceThresholdY = 0.08;

   // Ignore normal downward head movement (typing/reading)
if (
  signedPitch > 0 &&
  signedPitch < 0.50 &&
  dYaw < yawThreshold &&
  dFaceX < faceThresholdX
) {
  this.resetWindow(this.headDeviationWindow);
  return;
}

        const isHeadDeviating =
    dYaw > yawThreshold ||
    dPitch > pitchThreshold ||
    dRoll > rollThreshold ||
    dFaceX > faceThresholdX ||
    dFaceY > faceThresholdY;


    

        const sustainedDeviation = this.updateSlidingWindow(
          this.headDeviationWindow,
          isHeadDeviating,
        );

  if (sustainedDeviation){ 
          let direct: "left" | "right" | "upwards" | "downwards" | "sideways" =
            "sideways";
          const horizontalDeviation = Math.max(
            Math.abs(signedYaw) / this.HEAD_MOVEMENT_THRESHOLD,
            Math.abs(signedFaceX) / 0.09,
          );
          const verticalDeviation = Math.max(
            Math.abs(signedPitch) / this.HEAD_MOVEMENT_THRESHOLD,
            Math.abs(signedFaceY) / 0.1,
          );
         
          if (horizontalDeviation >= verticalDeviation) {
            direct = signedYaw < 0 || signedFaceX < 0 ? "left" : "right";
          } else {
            direct = signedPitch < 0 ? "upwards" : "downwards";
          }

          const violation: ProctorViolation = {
            type: "HEAD_MOVEMENT_AWAY",
            timestamp: nowTimestamp,
            confidence: Math.min(
              0.85 + (dYaw + dPitch + dFaceX + dFaceY) * 0.5,
              0.99,
            ),
            description: `Movement Violation: Repeated head deviation looking ${direct} from the test screen.`,
            severity: "medium",
          };

          console.error("[VIOLATION][MediaPipe]", violation.type, {
            dYaw,
            dPitch,
            dRoll,
            dFaceX,
            dFaceY,
            baseline: this.baseline,
            current: {
              yaw: this.smoothYaw,
              pitch: this.smoothPitch,
              roll: this.smoothRoll,
              faceCenterX: this.smoothFaceX,
              faceCenterY: this.smoothFaceY,
            },
          });

          if (this.canFireViolation(violation.type)) {
            onViolation(violation);
            await WailsService.fireSecurityViolation(
              "HEAD_MOVEMENT_AWAY",
              `Head looking away ${direct}`,
            );
          }
          this.resetWindow(this.headDeviationWindow);
        }
      }
    } catch (e: any) {
      console.warn("Real AI Frame processing interval error:", e?.message ?? e);
    } finally {
      this.isProcessing = false;
    }
  }

  public static resetSmoothing() {
    this.smoothYaw = 0;
    this.smoothPitch = 0;
    this.smoothRoll = 0;
    this.smoothFaceX = 0;
    this.smoothFaceY = 0;
  }

  public static cleanup() {
    this.baseline = null;

    localStorage.removeItem(this.CENTER_PROFILE_KEY);
    this.noFaceWindow = [];
    this.multiFaceWindow = [];
    this.headDeviationWindow = [];
    this.isProcessing = false;
    this.landmarker = null;
    this.isInitializing = false;
    this.initFailed = false;
    this.resetSmoothing();
    this.lastTimestamp = 0;
    console.log(
      "[ValidEx Local AI] All proctor buffers and calibrations released successfully.",
    );
  }

  public static releaseResources() {
    this.cleanup();
  }
}

import React from "react";
import { Camera, RefreshCw, Sun, CheckCircle } from "lucide-react";
import { Button } from "../Button";

interface CameraGuideProps {
  cameraActive: boolean;
  cameraError: string | null;

  videoRef: React.Ref<HTMLVideoElement>;

  isCalibrating: boolean;

  calibrationProgress: number;

  onStartCalibration: () => void;
  calibrationHint?: string | null;
}

export const CameraGuide: React.FC<CameraGuideProps> = ({
  cameraActive,
  cameraError,
  videoRef,
  isCalibrating,
  calibrationProgress,
  onStartCalibration,
  calibrationHint,
}) => {
  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="text-center">
        <h2 className="text-sm font-sans uppercase tracking-widest text-indigo-600 font-bold mb-1.5">
          Biometric Alignment & Calibration
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          The local AI proctoring engine must configure eye-gaze and head pose baselines prior to opening questions.
        </p>

        <div className="my-6 relative border border-slate-200 rounded-xl overflow-hidden aspect-video bg-black w-80 mx-auto shadow-inner">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />

          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              {cameraError ? (
                <span className="text-red-400 text-xs text-center px-4">
                  {cameraError}
                </span>
              ) : (
                <span className="text-slate-400 text-xs">
                  Starting Camera...
                </span>
              )}
            </div>
          )}

          {cameraActive && isCalibrating && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3">
              <div className="h-2 rounded bg-slate-700 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-100"
                  style={{ width: `${calibrationProgress}%` }}
                />
              </div>
              <p className="text-white text-xs mt-2 text-center">
                Capturing Face... {calibrationProgress}%
              </p>
            </div>
          )}
        </div>

        {!isCalibrating && calibrationHint && (
          <div className="mb-4 -mt-3 text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {calibrationHint}
          </div>
        )}

        <div className="text-left bg-slate-50 rounded-xl p-4 border border-slate-250 mb-6 space-y-3 font-sans text-xs text-slate-600 leading-normal">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="h-4.5 w-4.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 block font-semibold">Webcam Centering:</strong>
              Align your face directly with the viewport center. Keep eyes horizontal.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Sun className="h-4.5 w-4.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 block font-semibold">Lighting & Contrast:</strong>
              Ensure your workspace is well illuminated. Minimize backlighting glare shadows.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <RefreshCw className="h-4.5 w-4.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 block font-semibold">Immersive Hold:</strong>
              During the upcoming 3-second calibration, remain fully still looking forward.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={onStartCalibration}
            disabled={!cameraActive || isCalibrating}
            variant="primary"
            className="w-full py-3"
          >
            {isCalibrating ? "Capturing Face..." : "Start Calibration"}
          </Button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { Test } from "../../types";
import { submitTest } from "../../services/examService";
import { WailsService } from "../../services/wails";
import { useCamera } from "../../hooks/useCamera";
import { useMediaPipe } from "../../hooks/useMediaPipe";
import { useViolationManager } from "../../hooks/useViolationManager";
import { useExamSecurity } from "../../hooks/useExamSecurity";
import { useTestProgress } from "../../hooks/useTestProgress";
import { ProctorService } from "../../services/proctor";

// Import our custom UI components
import { Button } from "../../components/Button";
import { Timer } from "../../components/Timer";
import { QuestionCard } from "../../components/QuestionCard";
import { CameraGuide } from "../../components/CameraGuide";

interface ExamProps {
  test: Test;
  studentEmail: string;
  onFinish: (message?: string) => void;
}

export default function Exam({ test, studentEmail, onFinish }: ExamProps) {
  // Normalize test fields to match schema definitions safely
  const [startTime, setStartTime] = useState(() => new Date().toISOString());
const [phase, setPhase] = useState<
  "guide" | "calibrating" | "exam" | "finished"
>(
  test.isCameraMonitoring ? "guide" : "exam"
);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectionEnabled, setDetectionEnabled] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [calibrationHint, setCalibrationHint] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const isSecurePhase = phase === "exam";

  const normalizedTest: Test = {
    _id: test._id || "test606_comp_graphics",
    title: test.title || "Computer Graphics Semester Exam",
    // duration: test.duration ?? 45,
    endTime: test.endTime,
    isCameraMonitoring: test.isCameraMonitoring === true,
    mcqs: [],
    theoreticalQuestion: [],
    code: test.code ?? test.testCode ?? 0,
    lat: test.lat,
    lng: test.lng,
    radius: test.radius ?? test.allowedLocation?.radius,
    allowedLocation: test.allowedLocation,
  };

  if (Array.isArray(test.mcqs) && test.mcqs.length > 0) {
    normalizedTest.mcqs = test.mcqs;
  }

  if (
    Array.isArray(test.theoreticalQuestion) &&
    test.theoreticalQuestion.length > 0
  ) {
    normalizedTest.theoreticalQuestion = test.theoreticalQuestion;
  }

  if (Array.isArray(test.questions) && test.questions.length > 0) {
    normalizedTest.mcqs = normalizedTest.mcqs.concat(
      test.questions
        .filter((q: any) => q.questionType === "mcq")
        .map((q: any) => ({
          _id: q._id,
          question: q.questionText || q.question || "",
          options: Array.isArray(q.options)
            ? q.options.map((opt: any, idx: number) =>
                typeof opt === "string"
                  ? { id: idx, text: opt }
                  : { id: opt.id ?? idx, text: opt.text ?? String(opt) },
              )
            : [],
          points: q.marks ?? q.points,
        })),
    );

    normalizedTest.theoreticalQuestion =
      normalizedTest.theoreticalQuestion.concat(
        test.questions
          .filter((q: any) => q.questionType === "theory")
          .map((q: any) => ({
            _id: q._id,
            question: q.questionText || q.question || "",
            points: q.marks ?? q.points,
          })),
      );
  }
  const [activeModal, setActiveModal] = useState<{
    show: boolean;
    type: "confirm_submit" | "lockout" | "success" | "error";
    title: string;
    description: string;
    onAction?: () => void;
  } | null>(null);

  // 1. Centralized Violation Hook Manager
  const handleAutoSubmitCallback = () => {
    performSubmit(
      "auto",
      "Test automatically submitted because the security violation limit was reached.",
    );
  };

  const isExamActive = phase === "exam";

  const { violations, registerViolationEvent } = useViolationManager({
    isGuideActive: phase === "guide",
    isCalibrating: phase === "calibrating",
    isDetectionEnabled: detectionEnabled,

    onAutoSubmit: handleAutoSubmitCallback,
  });

  // 2. Camera Stream Manager Hook
  const {
    stream,
    cameraActive,
    cameraError,
    videoRef,
    assignVideoRef,
    startCameraInput,
    stopCameraInput,
  } = useCamera(registerViolationEvent);

  const processingVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = processingVideoRef.current;
    if (!el) return;

    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {
        
      });
    } else {
      el.pause();
      el.srcObject = null;
    }
  }, [stream]);

  const isGuideActive = phase === "guide";
  const isCalibratingPhase = phase === "calibrating";

  const handleSecurityExit = async (type: string, description: string) => {
    if (isSubmittingRef.current) return;
    await performSubmit("security", description);
  };

  // 3. MediaPipe Gaze & Head-Pose Estimation Hook
  const {
    isCalibrating,
    calibrationProgress,
    startCalibration,
    baseline,
    cleanup: cleanupMediaPipe,
  } = useMediaPipe({
    enabled: normalizedTest.isCameraMonitoring === true,
    cameraActive: Boolean(normalizedTest.isCameraMonitoring && cameraActive),
    videoRef: processingVideoRef,
    isMonitoringEnabled: Boolean(normalizedTest.isCameraMonitoring && monitoringEnabled),
    onViolation: registerViolationEvent,
    onCalibrationComplete: () => {
      setCalibrationHint(null);
      setStartTime(new Date().toISOString());

      setPhase("exam");

      setDetectionEnabled(false);
      setMonitoringEnabled(false);
      setProctoringStarted(false);
    },
    onCalibrationTimeout: () => {
      setCalibrationHint(
        "We couldn't get a stable, centered reading of your face. Please improve your lighting, center yourself in the frame, and press Start Calibration again.",
      );
    },
  });

  // 4. Low-level Desktop & Web Browser Security Hook
  useExamSecurity({
    isSecurePhase,
    isGuideActive,
    isCalibrating: isCalibratingPhase,
    onViolation: registerViolationEvent,
    onForceExit: handleSecurityExit,
  });

  // 5. Automated Answer Synchronization Engine Hook
  const {
    mcqAnswers,
    theoryAnswers,
    setMcqAnswers,
    setTheoryAnswers,
    isRecovering,
  } = useTestProgress({
    test: normalizedTest,
    startTime,
    violationsCount: violations.length,
  });

  // Trigger Calibration
  const triggerCalibrationStart = () => {
    if (!normalizedTest.isCameraMonitoring) {
      setPhase("exam");
      return;
    }

    setCalibrationHint(null);
    setPhase("calibrating");
    startCalibration();
  };

  useEffect(() => {
    if (!normalizedTest.isCameraMonitoring) return;

    void startCameraInput();

    return () => {
      stopCameraInput();
    };
  }, [normalizedTest.isCameraMonitoring, startCameraInput, stopCameraInput]);

const stopExamSession = async () => {
  try {
    setPhase("finished");

    setDetectionEnabled(false);
    setMonitoringEnabled(false);
    setProctoringStarted(false);

    if (normalizedTest.isCameraMonitoring) {
      cleanupMediaPipe();
      stopCameraInput();
      ProctorService.releaseResources?.();
    }

    await WailsService.stopKeyboardTracker();

    await WailsService.disableExamLockdown();

    await WailsService.enableNormalFullscreen();

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

  } catch (err) {
    console.warn(err);
  }
};

  const handleExitTest = () => {
    setActiveModal({
      show: true,
      type: "confirm_submit",
      title: "Exit and Submit Test",
      description:
        "Exiting the exam will save your current answers and submit the test now. This action cannot be undone.",
      onAction: () => {
        performSubmit("manual");
      },
    });
  };


  useEffect(() => {
  if (!normalizedTest.isCameraMonitoring) {
    setStartTime(new Date().toISOString());
  }
}, [normalizedTest.isCameraMonitoring]);

  // Enter strict lockdown only after guide and calibration are complete.
  useEffect(() => {
    if (phase !== "exam") return;

    const enterExamLockdown = async () => {
      try {
        await WailsService.enableExamLockdown();
        await WailsService.startKeyboardTracker();
      } catch (err) {
        console.warn("Failed exam lockdown:", err);
      }
    };

    void enterExamLockdown();
  }, [phase]);

useEffect(() => {
  if (
    !normalizedTest.isCameraMonitoring ||
    phase !== "exam"
  ) {
    setMonitoringEnabled(false);
    setDetectionEnabled(false);
    setProctoringStarted(false);
    return;
  }
  

  console.log(violations);

  const timer = window.setTimeout(() => {
    ProctorService.resetSmoothing();
    setMonitoringEnabled(true);
    setDetectionEnabled(true);
    setProctoringStarted(true);
  }, 60000); // 60 seconds (1 minute) warm-up before hidden AI monitoring activates, per spec

  return () => window.clearTimeout(timer);
}, [phase]);


useEffect(() => {
  if (phase !== "exam") return;

  let active = true;
  let timerId: NodeJS.Timeout;

  const runSystemInspectTask = async () => {
    if (!active) return;

    try {
      // Scan monitor configuration
      const monitorDisplayCount = await WailsService.getMonitorCount();

      if (monitorDisplayCount > 1) {
        await handleSecurityExit(
          "MULTI_MONITOR_VIOLATION",
          `Test automatically submitted because ${monitorDisplayCount} active monitors were detected. External displays are not permitted.`,
        );
        return;
      }
    } catch (err) {
      console.warn("Security audit inspector failed:", err);
    }

    // Run next inspection after 6–12 seconds
    const nextDelay = 6000 + Math.random() * 6000;
    timerId = setTimeout(runSystemInspectTask, nextDelay);
  };

  // First scan after 4 seconds
  timerId = setTimeout(runSystemInspectTask, 4000);

  return () => {
    active = false;
    clearTimeout(timerId);
  };
}, [phase, handleSecurityExit]);




  // Safe manual submission handler
  const handleManualSubmit = () => {
    setActiveModal({
      show: true,
      type: "confirm_submit",
      title: "Confirm Exam Submission",
      description:
        "Are you absolutely sure you wish to submit and lock your final examination responses? This action is terminal and irreversible.",
      onAction: () => {
        performSubmit();
      },
    });
  };

  // Terminate, compile, and send exam answers to central server
  const performSubmit = async (
    reason: "manual" | "security" | "auto" = "manual",
    finishMessage?: string,
  ) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const submitTime = new Date().toISOString();
      const mcqsAnsList = Object.entries(mcqAnswers).map(([qid, sel]) => ({
        questionId: qid,
        selectedOption: sel,
      }));
      const theoryAnsList = Object.entries(theoryAnswers).map(
        ([qid, ansText]) => ({
          questionId: qid,
          ans: ansText,
        }),
      );

      const res = await submitTest(
        normalizedTest._id,
        mcqsAnsList,
        theoryAnsList,
        startTime,
        submitTime,
        violations.length,
      );

      if (res.success) {
        await stopExamSession();
        await WailsService.clearState();
        if (reason === "security" || reason === "auto") {
          onFinish(
            finishMessage ||
              "Test automatically submitted because a security rule was violated.",
          );
          return;
        }

        setActiveModal({
          show: true,
          type: "success",
          title: "Assessment Certified",
          description:
            "Your test has been submitted successfully. Your answers have been securely saved to the ValidEx server. You may now close the application.",
          onAction: async () => {
            onFinish();
          },
        });
      } else {
        setActiveModal({
          show: true,
          type: "error",
          title: "Synchronization Warning",
          description:
            res.message ||
            "Offline queue synchronized. An internet error occurred but state was cached locally. Notify supervisor.",
        });
      }
    } catch (err) {
      console.error(err);
      setActiveModal({
        show: true,
        type: "error",
        title: "Central Connection Interrupted",
        description:
          "Failed to negotiate handshake with ValidEx server. Standard responses cached inside encrypted locker.",
      });
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };


  // Active Exam mode layout
  return (

    <div

      id="exam-viewport"
      className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-6 select-none font-sans relative"
    >

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.01),transparent_50%)] pointer-events-none" />
     {normalizedTest.isCameraMonitoring && (
  <video
    ref={processingVideoRef}
    autoPlay
    playsInline
    muted
    aria-hidden="true"
    tabIndex={-1}
    style={{
      position: "fixed",
      top: "-9999px",
      left: "-9999px",
      width: "2px",
      height: "2px",
      opacity: 0,
      pointerEvents: "none",
    }}
  />
)}

      {/* Header bar and Student Info */}
      <header className="flex items-center justify-between border-b border-slate-200 pb-5 max-w-7xl mx-auto w-full z-10">
        <div>
          <span className="font-sans text-[10px] tracking-widest text-slate-400 font-bold uppercase block mb-0.5">
            Validex Secure Exam
          </span>


          {phase === "exam" && (
   <h1 className="text-md font-sans text-slate-900 font-extrabold">
            {normalizedTest.title}
          </h1>
)}
        </div>

        {/* Right side status items */}
        <div className="flex items-center gap-3">
        {phase === "exam" && (
  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
    <ShieldAlert className="h-4 w-4 text-red-600" />
    <span className="text-sm font-semibold text-red-700">
      Violations: {violations.length}/3
    </span>
  </div>
)}
     {phase === "exam" && (
 <Timer
    endTimeIso={normalizedTest.endTime!}
    onTimeout={() => performSubmit()}
/>
)}

{phase === "exam" && (
       <Button
            onClick={handleManualSubmit}
            disabled={isSubmitting}
            variant="secondary"
          >
            Submit Test
          </Button>
)}

          <Button
            onClick={handleExitTest}
            disabled={isSubmitting}
            variant="outline"
          >
            Exit Test
          </Button>
        </div>
      </header>

      {/* Main double column workspace */}
      <main className="z-10 w-full flex-1 flex flex-col my-auto py-6">

    {normalizedTest.isCameraMonitoring && phase !== "exam" ? (
        <CameraGuide
            cameraActive={cameraActive}
            cameraError={cameraError}
            videoRef={assignVideoRef}
            isCalibrating={isCalibrating}
            calibrationProgress={calibrationProgress}
            onStartCalibration={triggerCalibrationStart}
            calibrationHint={calibrationHint}
        />

    ) : (


 <div className="w-full space-y-8 overflow-y-auto max-h-[72vh] pr-2 scrollbar-thin">
          {isRecovering ? (
            <div className="text-center py-24 text-slate-400 text-xs font-sans">
              <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Restoring previous student test progress state...
            </div>
          ) : (
            <>
              {/* Render MCQ section */}
              {normalizedTest.mcqs.length > 0 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">
                      Section A: Multiple Choice Questions
                    </h3>
                  </div>
                  {normalizedTest.mcqs.map((q, idx) => (
                    <QuestionCard
                      key={q._id}
                      type="mcq"
                      question={q}
                      index={idx + 1}
                      selectedValue={mcqAnswers[q._id]}
                      onChange={(val) =>
                        setMcqAnswers((prev) => ({ ...prev, [q._id]: val }))
                      }
                    />
                  ))}
                </div>
              )}

              {/* Render subjective/theoretical section */}
              {normalizedTest.theoreticalQuestion.length > 0 && (
                <div className="space-y-6 pt-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">
                      Section B: Theoretical Questions
                    </h3>
                  </div>
                  {normalizedTest.theoreticalQuestion.map((q, idx) => (
                    <QuestionCard
                      key={q._id}
                      type="theory"
                      question={q}
                      index={idx + 1}
                      selectedValue={theoryAnswers[q._id] || ""}
                      onChange={(val) =>
                        setTheoryAnswers((prev) => ({ ...prev, [q._id]: val }))
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

    )}

</main>

      {/* Unified Security Modal System Overlay */}
      {activeModal && activeModal.show && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl relative"
          >
            {activeModal.type === "confirm_submit" && (
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600 rounded-t-2xl" />
            )}
            {activeModal.type === "lockout" && (
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600 rounded-t-2xl animate-pulse" />
            )}
            {activeModal.type === "success" && (
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-2xl" />
            )}

            <div className="flex items-start gap-4">
              <div
                className={`p-2 rounded-xl ${
                  activeModal.type === "lockout"
                    ? "bg-red-50 text-red-500"
                    : activeModal.type === "confirm_submit"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {activeModal.type === "lockout" ? (
                  <ShieldAlert className="h-6 w-6" />
                ) : activeModal.type === "confirm_submit" ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-sans font-bold text-slate-900 uppercase">
                  {activeModal.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  {activeModal.description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              {activeModal.type === "confirm_submit" && (
                <>
                  <Button
                    onClick={() => setActiveModal(null)}
                    disabled={isSubmitting}
                    variant="outline"
                  >
                    Go Back
                  </Button>
                  <Button
                    onClick={activeModal.onAction}
                    disabled={isSubmitting}
                    variant="secondary"
                  >
                    Confirm & Transmit
                  </Button>
                </>
              )}

              {(activeModal.type === "lockout" ||
                activeModal.type === "success") && (
                <Button
                  onClick={activeModal.onAction}
                  disabled={isSubmitting}
                  variant="primary"
                  className="w-full"
                >
                  Acknowledge & Exit Room
                </Button>
              )}

              {activeModal.type === "error" && (
                <Button
                  onClick={() => setActiveModal(null)}
                  variant="primary"
                  className="w-full"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

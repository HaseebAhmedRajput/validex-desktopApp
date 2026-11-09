
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProctorViolation } from '../services/proctor';

interface UseViolationManagerProps {
  isGuideActive: boolean;
  isCalibrating: boolean;
  isDetectionEnabled: boolean;
  onAutoSubmit: () => void;
}

interface UseViolationManagerResult {
  loggedViolations: ProctorViolation[];
  violations: string[];
  registerViolationEvent: (v: ProctorViolation) => void;
}

export function useViolationManager({
  isGuideActive,
  isCalibrating,
  isDetectionEnabled,
  onAutoSubmit
}: UseViolationManagerProps): UseViolationManagerResult {
  const [loggedViolations, setLoggedViolations] = useState<ProctorViolation[]>([]);
  const [violations, setViolations] = useState<string[]>([]);
  const autoSubmitTriggeredRef = useRef(false);
  const lastViolationByTypeRef = useRef<Record<string, number>>({});

  const isGuideActiveRef = useRef(isGuideActive);
  const isCalibratingRef = useRef(isCalibrating);
  const onAutoSubmitRef = useRef(onAutoSubmit);

  useEffect(() => {
    isGuideActiveRef.current = isGuideActive;
  }, [isGuideActive]);

  useEffect(() => {
    isCalibratingRef.current = isCalibrating;
  }, [isCalibrating]);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);
  void isDetectionEnabled;

  useEffect(() => {
   const MAX_VIOLATIONS = 3;

if (!autoSubmitTriggeredRef.current && violations.length >= MAX_VIOLATIONS) {
      autoSubmitTriggeredRef.current = true;
      console.warn(
  `[Violation Engine] Maximum violation limit (${MAX_VIOLATIONS}) reached. Auto-submitting exam.`
);
      onAutoSubmitRef.current();
    }
  }, [violations.length]);

  const registerViolationEvent = useCallback((v: ProctorViolation) => {
      console.log("VIOLATION:", v.type, v.description);
  console.trace();
    if (isGuideActiveRef.current || isCalibratingRef.current) return;

    const eventTime = new Date(v.timestamp).getTime();
    const lastTime = lastViolationByTypeRef.current[v.type] || 0;
    if (eventTime - lastTime < 4000) return;

    lastViolationByTypeRef.current[v.type] = eventTime;
    setLoggedViolations(prev => [v, ...prev]);

    setViolations(prev => {
      const desc = `${v.type} alert recorded at ${new Date(v.timestamp).toLocaleTimeString()}`;
      if (prev.includes(desc)) return prev;
      return [...prev, desc];
    });
  }, []);

  return {
    loggedViolations,
    violations,
    registerViolationEvent
  };
}

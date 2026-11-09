 

import React, { useState, useEffect, useRef } from 'react';
import { WailsService } from '../services/wails';
import { updateProgress } from '../services/examService';
import { Test } from '../types';

interface UseTestProgressProps {
  test: Test;
  startTime: string;
  violationsCount: number;
}

interface UseTestProgressResult {
  mcqAnswers: Record<string, number>;
  theoryAnswers: Record<string, string>;
  setMcqAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setTheoryAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isRecovering: boolean;
}

export function useTestProgress({
  test,
  startTime,
  violationsCount
}: UseTestProgressProps): UseTestProgressResult {
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [theoryAnswers, setTheoryAnswers] = useState<Record<string, string>>({});
  const [isRecovering, setIsRecovering] = useState(true);

  // Robust on-mount crash recovery session loader
  useEffect(() => {
    const recoverSession = async () => {
      try {
        const encryptedCache = await WailsService.loadState();
        if (encryptedCache) {
          const parsed = JSON.parse(encryptedCache);
          if (parsed.testId === test._id) {
            console.log("🛡️ [Crash Recovery] Restoring student responses from local AES cache...");
            
            // Re-inflate MCQ Choices
            if (parsed.mcqsAns && Array.isArray(parsed.mcqsAns)) {
              const mcqMap: Record<string, number> = {};
              parsed.mcqsAns.forEach((ans: any) => {
                mcqMap[ans.questionId] = ans.selectedOption;
              });
              setMcqAnswers(mcqMap);
            }

            // Re-inflate Theory Inputs
            if (parsed.theoreticalAns && Array.isArray(parsed.theoreticalAns)) {
              const theoryMap: Record<string, string> = {};
              parsed.theoreticalAns.forEach((ans: any) => {
                theoryMap[ans.questionId] = ans.ans;
              });
              setTheoryAnswers(theoryMap);
            }
          }
        }
      } catch (err) {
        console.warn('Crash recovery loader error:', err);
      } finally {
        setIsRecovering(false);
      }
    };
    
    recoverSession();
  }, [test._id]);

  // Periodic persistence sync layout: randomized interval jitter to prevent network spoofing & server DDoS
  useEffect(() => {
    if (isRecovering) return;
    
    let timeoutId: NodeJS.Timeout;
    let active = true;

    const scheduleNextSync = () => {
      if (!active) return;
      
      // Jittered random next sync interval between 18 and 35 seconds
      const nextInterval = 18000 + Math.random() * 17000;
      
      timeoutId = setTimeout(async () => {
        try {
          const stateObj = {
            testId: test._id,
            mcqsAns: Object.entries(mcqAnswers).map(([qid, sel]) => ({
              questionId: qid,
              selectedOption: sel as number
            })),
            theoreticalAns: Object.entries(theoryAnswers).map(([qid, ansText]) => ({
              questionId: qid,
              ans: ansText as string
            })),
            startTime,
            violationsCount
          };

          // 1. Save state securely to local Go AES storage cache
          await WailsService.saveState(JSON.stringify(stateObj));

          // 2. Sync to centralized database progress handler
          await updateProgress(
            test._id,
            stateObj.mcqsAns,
            stateObj.theoreticalAns,
            startTime,
            violationsCount
          );
        } catch (err) {
          console.warn('[Sync Engine] Background sync failure:', err);
        }
        scheduleNextSync();
      }, nextInterval);
    };

    scheduleNextSync();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [test._id, mcqAnswers, theoryAnswers, startTime, violationsCount, isRecovering]);

  // Immediate debounced autosave tracker for 100% data loss prevention
  useEffect(() => {
    if (isRecovering) return;

    const backupState = async () => {
      try {
        const stateObj = {
          testId: test._id,
          mcqsAns: Object.entries(mcqAnswers).map(([qid, sel]) => ({
            questionId: qid,
            selectedOption: sel as number
          })),
          theoreticalAns: Object.entries(theoryAnswers).map(([qid, ansText]) => ({
            questionId: qid,
            ans: ansText as string
          })),
          startTime,
          violationsCount
        };
        await WailsService.saveState(JSON.stringify(stateObj));
      } catch (err) {
        console.warn('Backup state caching error:', err);
      }
    };
    
    const t = setTimeout(backupState, 800); // Trigger save 800ms after candidate typing stops
    return () => clearTimeout(t);
  }, [mcqAnswers, theoryAnswers, test._id, startTime, violationsCount, isRecovering]);

  return {
    mcqAnswers,
    theoryAnswers,
    setMcqAnswers,
    setTheoryAnswers,
    isRecovering
  };
}

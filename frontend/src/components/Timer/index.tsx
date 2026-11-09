 

import React, { useState, useEffect } from 'react';
import { Timer as TimerIcon } from 'lucide-react';

// interface TimerProps {
//   durationMinutes: number;
//   startTimeIso: string;
//   endTimeIso?: string;
//   onTimeout: () => void;
// }
interface TimerProps {
  endTimeIso: string;
  onTimeout: () => void;
}

// const getSecondsLeft = (durationMinutes: number, startTimeIso: string, endTimeIso?: string) => {
//   if (endTimeIso) {
//     const target = new Date(endTimeIso).getTime();
//     return Math.max(0, Math.floor((target - Date.now()) / 1000));
//   }

//   const limitSecs = durationMinutes * 60;
//   const elapsedSecs = Math.max(0, Math.floor((Date.now() - new Date(startTimeIso).getTime()) / 1000));
//   return Math.max(0, limitSecs - elapsedSecs);
// };

const getSecondsLeft = (endTimeIso: string) => {
  const target = new Date(endTimeIso).getTime();

  return Math.max(
    0,
    Math.floor((target - Date.now()) / 1000)
  );
};


export const Timer: React.FC<TimerProps> = ({
  endTimeIso,
  onTimeout,
}) => {
 const [secondsLeft, setSecondsLeft] = useState<number>(() =>
  getSecondsLeft(endTimeIso)
);

  // useEffect(() => {

  //   const leftAtMount = getSecondsLeft(durationMinutes, startTimeIso, endTimeIso);
  //   if (leftAtMount <= 0) {
  //     onTimeout();
  //     return;
  //   }
  //   setSecondsLeft(leftAtMount);

  //   const interval = setInterval(() => {
  //     const left = getSecondsLeft(durationMinutes, startTimeIso, endTimeIso);
  //     setSecondsLeft(left);

  //     if (left <= 0) {
  //       clearInterval(interval);
  //       onTimeout();
  //     }
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, [durationMinutes, startTimeIso, onTimeout]);


  useEffect(() => {
  const left = getSecondsLeft(endTimeIso);

  if (left <= 0) {
    onTimeout();
    return;
  }

  setSecondsLeft(left);

  const interval = setInterval(() => {
    const remaining = getSecondsLeft(endTimeIso);

    setSecondsLeft(remaining);

    if (remaining <= 0) {
      clearInterval(interval);
      onTimeout();
    }
  }, 1000);

  return () => clearInterval(interval);
}, [endTimeIso, onTimeout]);

  // Format seconds to standard H:MM:SS format
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainSecs = secs % 60;
    return `${hours > 0 ? hours + ':' : ''}${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsLeft < 300; // less than 5 minutes

  return (
    <div 
      className={`flex items-center gap-2 border px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition ${
        isLowTime 
          ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
          : 'bg-slate-50 text-slate-700 border-slate-200'
      }`}
    >
      <TimerIcon className={`h-4 w-4 ${isLowTime ? 'text-red-500' : 'text-slate-400'}`} />
      <span>{isLowTime ? 'Time Critical:' : 'Session Time:'} {formatTime(secondsLeft)}</span>
    </div>
  );
};

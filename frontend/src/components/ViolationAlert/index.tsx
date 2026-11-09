/**
below this is violationAlert.tsx
 */

import React from 'react';
import { ShieldAlert, AlertTriangle, Eye, RefreshCw, Layers } from 'lucide-react';
import { ProctorViolation } from '../../services/proctor';

interface ViolationAlertProps {
  loggedViolations: ProctorViolation[];
  violationsCount: number;
}

export const ViolationAlert: React.FC<ViolationAlertProps> = ({
  loggedViolations,
  violationsCount
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-72">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
        <span className="text-[10.5px] font-sans font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          Proctoring Violation Ledger
        </span>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
          violationsCount > 5 
            ? 'bg-red-50 text-red-600 border border-red-150 animate-pulse' 
            : 'bg-slate-100 text-slate-600'
        }`}>
          Count: {violationsCount} / 8
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {loggedViolations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic gap-1 py-8">
            <span className="text-emerald-600 text-[11px] font-semibold">✓ No security incidents logged.</span>
            <span className="text-[9.5px] text-slate-350">Maintain baseline face alignment</span>
          </div>
        ) : (
          loggedViolations.map((v, idx) => {
            const severityColor = 
              v.severity === 'high' ? 'border-red-100 bg-red-50/55 text-red-900' :
              v.severity === 'medium' ? 'border-amber-100 bg-amber-50/55 text-amber-900' :
              'border-slate-100 bg-slate-50 text-slate-700';

            const Icon = 
              v.type === 'ABNORMAL_GAZE' ? Eye :
              v.type === 'HEAD_MOVEMENT_AWAY' ? RefreshCw :
              v.type === 'TAB_SWITCH' || v.type === 'FULLSCREEN_EXIT' ? Layers :
              AlertTriangle;

            return (
              <div 
                key={idx} 
                className={`border rounded-lg p-2.5 text-[11px] font-sans transition-all flex gap-2.5 leading-relaxed ${severityColor}`}
              >
                <Icon className={`h-4.5 w-4.5 flex-shrink-0 mt-0.5 ${
                  v.severity === 'high' ? 'text-red-500' :
                  v.severity === 'medium' ? 'text-amber-500' :
                  'text-slate-400'
                }`} />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px]">{v.type}</span>
                    <span className="text-[9.5px] text-slate-400 font-mono">
                      {new Date(v.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium leading-normal">{v.description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {violationsCount > 5 && (
        <div className="mt-3 bg-red-50 border border-red-100 p-2.5 rounded-lg text-[10px] text-red-700 leading-normal font-sans">
          <strong>⚠️ Critical Warnings Threshold:</strong> If active cumulative incidents exceed 8, your exam is auto-submitted and locked out.
        </div>
      )}
    </div>
  );
};

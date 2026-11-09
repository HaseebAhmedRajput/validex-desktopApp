 

import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import JoinTest from './pages/JoinTest';
import Exam from './pages/Exam';
import { logout as authLogout } from './services/authService';
import { WailsService } from './services/wails';
import { Test } from './types';

export default function App() {
  const [session, setSession] = useState<{ token: string; email: string } | null>(null);
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'exam'>('login');
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
useEffect(() => {

  const restoreSession = async () => {

    try {

      const saved =
        await WailsService.loadSecureToken();

      if(saved){
         const session =
          JSON.parse(saved);

        setSession(session); 
         setView('dashboard');

      }

    } catch(err){
      console.warn(
        "Session restore failed",
        err
      );}
  };

  restoreSession();

  WailsService.enableNormalFullscreen()
    .catch(err => {
      console.warn(err);
    });
}, []);

  const handleLoginSuccess = (token: string, email: string) => {
    setSession({ token, email });
    setSystemNotice(null);
    setView('dashboard');
  };

 const handleLogout = async () => {

  await authLogout();

  await WailsService.clearSecureToken();

  setSession(null);

  setActiveTest(null);

  setSystemNotice(null);

  await WailsService.enableNormalFullscreen();

  setView('login');

};

  const handleJoinSuccess = (test: Test, startCoords: { lat: number; lng: number }) => {
    console.log(`Entering camera guide for: ${test.title} at coordinates:`, startCoords);
    setActiveTest(test);
    setSystemNotice(null);
    setView('exam');
  };

  const handleExamFinish = (message?: string) => {
    setActiveTest(null);
    setSystemNotice(message || null);
    WailsService.enableNormalFullscreen().catch(err => {
      console.warn('Unable to restore normal fullscreen mode:', err);
    });
    setView('dashboard');
  };

  return (
    <div id="secure-exam-app-wrapper" className="min-h-screen bg-slate-50 selection:bg-indigo-100 text-slate-900">
      {view === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
      {view === 'dashboard' && session && (
        <JoinTest
          studentEmail={session.email}
          notice={systemNotice}
          onLogout={handleLogout}
          onJoinSuccess={handleJoinSuccess}
        />
      )}
      {view === 'exam' && session && activeTest && (
        <Exam
          test={activeTest}
          studentEmail={session.email}
          onFinish={handleExamFinish}
        />
      )}
    </div>
  );
}

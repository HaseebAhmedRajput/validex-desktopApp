 

import React, { useState } from 'react';
import { Shield, Activity, LogOut, Smartphone, ArrowRight, CheckCircle } from 'lucide-react';
import { joinTest } from '../../services/examService';
import { Test } from '../../types';
import { motion } from 'motion/react';
import { WailsService } from '../../services/wails';

interface JoinTestProps {
  studentEmail: string;
  notice?: string | null;
  onLogout: () => void;
  onJoinSuccess: (test: Test, startCoords: { lat: number; lng: number }) => void;
}

export default function JoinTest({ studentEmail, notice, onLogout, onJoinSuccess }: JoinTestProps) {
  const [testCode, setTestCode] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  
  const [locating, setLocating] = useState(false);
  const [locatingStatus, setLocatingStatus] = useState<'idle' | 'success' | 'denied'>('idle');
  const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
  const [attempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const triggerSecureLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (WailsService.isWails()) {
      setLocating(true);
      try {
        const coordinates = await WailsService.getSecureGeolocation();
        if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
          setLatInput(coordinates.lat.toFixed(6));
          setLngInput(coordinates.lng.toFixed(6));
          setLocatingStatus('success');
          return coordinates;
        }
      } catch (err: any) {
        console.warn('Native secure geolocation failure:', err);
      } finally {
        setLocating(false);
      }
    }

    return null;
  };

  // Capture actual HTML5 Geolocation coordinates
  const triggerAutoLocate = async () => {
    setErrorText(null);
    const coords = await triggerSecureLocation();

    if (!coords) {
      setErrorText('Native geolocation failed. Please ensure the desktop geolocation service is enabled.');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCode) {
      setErrorText('Please enter your unique 5-digit test access code.');
      return;
    }

    const parsedCode = parseInt(testCode);
    if (isNaN(parsedCode)) {
      setErrorText('Test code must be a numeric sequence.');
      return;
    }

    const latVal = parseFloat(latInput);
    const lngVal = parseFloat(lngInput);
    if (isNaN(latVal) || latVal < -90 || latVal > 90 || isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
      setErrorText('Invalid GPS bounds fields. Latitude [-90 to 90], Longitude [-180 to 180].');
      return;
    }

    setLoading(true);
    setErrorText(null);

    try {
      // 1. Proactive camera availability & permission validation before server request
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorText('Camera system is unsupported or disabled. An active webcam is strictly mandatory for proctor validation.');
        setLoading(false);
        return;
      }

      try {
        const checkStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Close track instantly so we release hardware locks
        checkStream.getTracks().forEach(track => track.stop());
      } catch (camErr: any) {
        console.warn('Proactive webcam security handshaking failed:', camErr);
        setErrorText('Webcam Required: This examination requires a functional, enabled webcam. Please grant camera access permissions in your browser bar and try again.');
        setLoading(false);
        return;
      }

      // 2. Native geolocation via Wails must populate coordinates; browser fallback is not allowed.
      const nativeCoords = await triggerSecureLocation();
      if (!nativeCoords) {
        setErrorText('Secure native location service failed. Please retry after allowing location permissions for the desktop client.');
        setLoading(false);
        return;
      }

      const finalLat = nativeCoords.lat;
      const finalLng = nativeCoords.lng;
      setLatInput(finalLat.toFixed(6));
      setLngInput(finalLng.toFixed(6));
      setLocatingStatus('success');

      // 3. Central API request only after BOTH camera & geolocation are verified enabled
      const res = await joinTest(parsedCode, finalLat, finalLng);
      if (res.success && res.data) {
        onJoinSuccess(res.data, { lat: finalLat, lng: finalLng });
      } else {
        setErrorText(res.message || 'Location boundary reject or test not open.');
      }
    } catch (err: any) {
      setErrorText(err.message || 'System failed to fetch test rules schema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="join-test-container" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-6 select-none font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.02),transparent_50%)] pointer-events-none" />

      {/* Header bar and Student Info */}
      <header className="flex items-center justify-between border-b border-slate-200 pb-5 max-w-7xl mx-auto w-full z-10">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <span className="font-sans text-xs tracking-wider text-slate-500 font-bold uppercase">
              Authenticated Portal 
            </span>
          </div>
          <h1 className="text-sm font-sans text-slate-700 mt-1">
            Student Account: <span className="text-slate-900 font-bold">{studentEmail}</span>
          </h1>
        </div>
        <button
          onClick={onLogout}
          className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
        >
          <LogOut className="h-3.5 w-3.5" />
          LOGOUT
        </button>
      </header>

      {/* Main Grid: Info card left, Join control card right */}
      <main className="z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-8">
        
        {/* Left Side: Exam Instructions & Security Checks */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 relative shadow-sm">
            <h2 className="text-sm font-sans uppercase tracking-wider text-indigo-600 font-bold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500 animate-pulse" />
              Pre-Examination Security Instructions
            </h2>
           <ul className="space-y-4 text-xs font-sans text-slate-600 leading-relaxed">

  <li className="flex items-start gap-3">
    <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-600 font-bold rounded-full flex-shrink-0 mt-0.5">
      1
    </span>
    <div>
      <strong className="text-slate-900 block font-semibold mb-0.5">
        Login Session
      </strong>
      If you logged in a long time ago, please log in again before starting the test to avoid session expiration.
    </div>
  </li>

  <li className="flex items-start gap-3">
    <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-600 font-bold rounded-full flex-shrink-0 mt-0.5">
      2
    </span>
    <div>
      <strong className="text-slate-900 block font-semibold mb-0.5">
        Camera & GPS
      </strong>
      If required for your test, camera and location (GPS) permissions must be enabled before the exam can start.
    </div>
  </li>

  <li className="flex items-start gap-3">
    <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-600 font-bold rounded-full flex-shrink-0 mt-0.5">
      3
    </span>
    <div>
      <strong className="text-slate-900 block font-semibold mb-0.5">
        Exam Security
      </strong>
      Copying, pasting, switching tabs or windows, opening developer tools, or using unauthorized applications may result in your test being submitted automatically.
    </div>
  </li>

  <li className="flex items-start gap-3">
    <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-600 font-bold rounded-full flex-shrink-0 mt-0.5">
      4
    </span>
    <div>
      <strong className="text-slate-900 block font-semibold mb-0.5">
        External Devices
      </strong>
      Connecting multiple monitors, additional cameras, or other unauthorized devices before or during the exam may result in immediate submission.
    </div>
  </li>

  <li className="flex items-start gap-3">
    <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-600 font-bold rounded-full flex-shrink-0 mt-0.5">
      5
    </span>
    <div>
      <strong className="text-slate-900 block font-semibold mb-0.5">
        Camera Monitoring
      </strong>
      If camera monitoring is enabled for your test, keep your face centered and avoid looking away for extended periods. Repeated violations may automatically submit your test.
    </div>
  </li>

  <li className="flex items-start gap-3">
    <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-600 font-bold rounded-full flex-shrink-0 mt-0.5">
      6
    </span>
    <div>
      <strong className="text-slate-900 block font-semibold mb-0.5">
        System Integrity
      </strong>
      Any attempt to bypass, disable, or interfere with the security system may result in your exam being cancelled or submitted automatically.
    </div>
  </li>

 <li className="flex items-start gap-3">
  <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] text-indigo-600 font-bold rounded-full flex-shrink-0 mt-0.5">
    6
  </span>
  <div>
    <strong className="text-slate-900 block font-semibold mb-0.5">
      Starting Guide
    </strong>
    Before the examination begins, you must successfully complete the camera calibration process. Failure to complete the calibration, whether intentionally or accidentally, may result in your test being automatically submitted or cancelled.
  </div>
</li>

</ul>
          </div>

         
        </div>

        {/* Right Side: Join test container */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-xl p-6 relative shadow-sm"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600 rounded-t-xl" />

            <div className="mb-5">
              <h3 className="text-sm font-sans font-bold text-slate-900 uppercase">
                Access Examination Room
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-1">
                Enter your authorized 5-digit passcode. Provided by your subject teacher
              </p>
            </div>

            {notice && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg mb-5 flex gap-2.5 text-xs text-amber-900 leading-relaxed">
                <Activity className="h-4.5 w-4.5 text-amber-600 flex-shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {errorText && (
              <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg mb-5 flex gap-2.5 text-xs text-red-800 leading-relaxed">
                <Activity className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Exam Access Code
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={testCode}
                  onChange={e => setTestCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 text-center text-lg font-mono tracking-[0.4em] font-extrabold text-emerald-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100 transition placeholder:text-slate-350"
                  placeholder="00000"
                  required
                />
              </div>

              {/* Location configuration */}
              <div className="border-t border-slate-100 pt-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Geometrical Verification
                  </span>
                  <button
                    type="button"
                    onClick={triggerAutoLocate}
                    disabled={locating}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    {locating ? 'GPS Locating...' : 'Verify My Location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">LATITUDE</label>
                    <input
                      type="text"
                      value={latInput}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded py-2 px-3 text-slate-700 font-mono cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">LONGITUDE</label>
                    <input
                      type="text"
                      value={lngInput}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded py-2 px-3 text-slate-700 font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                {locatingStatus === 'success' && (
                  <div className="text-[10.5px] text-emerald-600 font-sans flex items-center gap-1">
                    ✓ GPS location verified. Coordination lock synchronized with testing criteria.
                  </div>
                )}

                {/* Spatial Boundary Verification compliance notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] leading-relaxed">
  <span className="font-bold text-amber-700 uppercase">
    ⚠️ IMPORTANT NOTICE
  </span>

  <p className="mt-1 font-medium text-slate-700">
    Please read all examination guidelines carefully before joining the test.
    By starting the examination, you agree to comply with all security,
    monitoring, and examination policies. Failure to follow these rules may
    result in your test being automatically submitted or cancelled.
  </p>
</div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-sans text-sm font-semibold py-3 px-4 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                    Connecting...
                  </>
                ) : (
                  <>
  
                    I Agree , Join Exam Room
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="z-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-200 pt-5 max-w-7xl mx-auto w-full gap-4 text-xs font-sans text-slate-400">
        <span>ValidEx Secure Navigation Framework — GPS Coordinates Boundary Verified.</span>
        <span>All student activity is recorded locally and synced securely.</span>
      </footer>
    </div>
  );
}

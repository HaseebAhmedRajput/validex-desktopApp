 

import React, { useState } from 'react';
import { Shield, Eye, EyeOff, KeyRound, Mail, AlertCircle } from 'lucide-react';
import { login } from '../../services/authService';
import { motion } from 'motion/react';
import { WailsService } from '../../services/wails';

interface LoginProps {
  onLoginSuccess: (token: string, email: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorText('Please enter your student credentials.');
      return;
    }

    setLoading(true);
    setErrorText(null);

    try {
      const res = await login(email, password);
      
      if (res.success && res.data) {
       

  await WailsService.saveSecureToken(
    JSON.stringify({
      token: res.data,
      email: email
    })
  );

  onLoginSuccess(res.data, email);
} else {
        setErrorText(res.message || 'Incorrect student credentials or account not registered under this organization.');
      }
    } catch (err: any) {
      setErrorText('Failed to reach the examination server. Please verify your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 select-none font-sans relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none" />

      {/* Top clean brand bar */}
      <header className="flex items-center justify-between max-w-7xl mx-auto w-full z-10 py-2">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-sans text-sm tracking-wider text-slate-900 font-bold uppercase">
            ValidEx Examination Portal
          </span>
        </div>
      </header>

      {/* Main card */}
      <main className="z-10 flex flex-col items-center justify-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white border border-slate-200/80 rounded-xl p-8 shadow-sm relative animate-fade-in"
        >
          {/* Top subtle blue divider */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-xl" />

          {/* Prompt info */}
          <div className="text-center mb-8">
            <h2 className="text-xl text-slate-900 tracking-tight font-bold">
              Student Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Please enter your authorized academic credentials to access exam services.
            </p>
          </div>

          {errorText && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-red-50 border border-red-200 text-red-900 p-3.5 rounded-lg mb-6 flex gap-3 text-xs leading-relaxed"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <span className="font-bold">Access Denied: </span>
                {errorText}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Registered Student Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition placeholder:text-slate-400"
                  placeholder="student@university.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Portal Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pl-11 pr-11 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition placeholder:text-slate-400"
                  placeholder="Enter Your Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-sans text-sm font-semibold py-3 px-4 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                  Verifying account...
                </>
              ) : (
                'Sign In to Exam Center'
              )}
            </button>
          </form>

          {/* Institutional Compliance Notice */}
          <div className="mt-8 border-t border-slate-100 pt-5 text-[10.5px] text-slate-400 space-y-1 block leading-relaxed">
            <span className="font-bold text-slate-500">🔒 SECURE EXAM SYSTEM REQUIREMENTS:</span>
            <p>Access is restricted to authorized student email accounts.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="z-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-200/50 pt-5 max-w-7xl mx-auto w-full gap-4 text-xs">
        <span className="text-slate-450 font-sans">
          ValidEx Assessment Hub. All security measures strictly active.
        </span>
        <span className="text-slate-450 font-sans font-medium">
          Registered and protected system.
        </span>
      </footer>
    </div>
  );
}

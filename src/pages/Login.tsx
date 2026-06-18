import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { user, loginEmail, loginOTP, onboardingRequired } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  if (user) {
    if (onboardingRequired) {
      return <Navigate to="/onboarding" replace />;
    }
    if (user.role === 'employee') {
      return <Navigate to="/checkin" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    const res = await loginEmail(email);
    setLoading(false);

    if (res.success) {
      setStep(2);
    } else {
      setError(res.error || 'Something went wrong');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await loginOTP(email, code);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Invalid code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 rounded-2xl glass shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Employee Mood Index</h1>
          <p className="text-slate-400 text-sm mt-2">
            {step === 1 ? 'Enter your company email to sign in' : 'Enter the 6-digit code sent to your email'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Company Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Code...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                6-Digit OTP Code
              </label>
              <input
                id="code"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-center text-xl font-bold tracking-widest focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 border border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold py-3 px-4 rounded-xl transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        )}


      </div>
    </div>
  );
};
export default Login;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/authApi';
import { MapPin, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const info = searchParams.get('info');

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'codeSent'>('form');
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      // no-op: allow manual registration flow when no invitation token
    }
  }, [token]);

  // Request a verification code for local registration (no invitation token)
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
      return setError('Email, username and password are required');
    }

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);
    try {
      await authAPI.registerRequest(formData.email, formData.username, formData.password);
      setStep('codeSent');
    } catch (err: any) {
      console.error('Failed to request verification code:', err);
      setError(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit registration when an invitation token is present
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      return setError('Invitation token missing');
    }

    setIsLoading(true);
    try {
      await authAPI.register(token, formData.username, formData.password);
      navigate('/login?info=registered');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code) return setError('Verification code required');
    setCodeLoading(true);
    try {
      await authAPI.registerConfirm(formData.email, code);
      // show confirmation on page
      navigate('/register?info=request_sent');
    } catch (err: any) {
      console.error('Failed to confirm code:', err);
      setError(err.response?.data?.error || 'Failed to confirm code');
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg mb-4">
            <MapPin size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Welcome to Journey Planner!</p>
        </div>

        {/* Register Card */}
        <div className="bg-[#161b22] rounded-2xl shadow-xl p-8 border border-[#30363d]">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {!token ? (
            <div>
              {info === 'request_sent' && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg">
                  <p className="text-sm text-green-200">Your request has been sent to the administrator for approval.</p>
                </div>
              )}

              {step === 'form' ? (
                <form onSubmit={(e) => { e.preventDefault(); handleRequestCode(e); }} className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input id="username" type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white" placeholder="Choose a username" required minLength={3} />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white" placeholder="you@example.com" required />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white" placeholder="Create a password" required minLength={8} />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                    <input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white" placeholder="Confirm your password" required />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/login')} className="px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-[#ff453a] dark:hover:bg-red-600 text-white rounded-xl transition-all">Back</button>
                    <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl">{isLoading ? 'Sending...' : 'Send verification code'}</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmCode} className="space-y-4">
                  <div>
                    <label htmlFor="verifyEmail" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input id="verifyEmail" type="email" value={formData.email} readOnly className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white" />
                  </div>
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                    <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white" placeholder="Enter code from email" required />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setStep('form')} className="px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-[#ff453a] dark:hover:bg-red-600 text-white rounded-xl transition-all">Back</button>
                    <button type="submit" disabled={codeLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl">{codeLoading ? 'Confirming...' : 'Confirm and Request Approval'}</button>
                  </div>
                </form>
              )}

              <div className="mt-6">
                <p className="text-gray-400 mb-2">Or request an account via Google (admin approval required)</p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-3 bg-[#0d1117] border border-[#30363d] rounded-xl hover:bg-[#1c2128] text-gray-300"
                    onClick={() => { const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'; window.location.href = `${apiBase.replace(/\/$/, '')}/auth/google/register`; }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Register with Google
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Choose a username"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Create a password"
                    required
                    minLength={8}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transform transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © {new Date().getFullYear()} Journey Planner. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

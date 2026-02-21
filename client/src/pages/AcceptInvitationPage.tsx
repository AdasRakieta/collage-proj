import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { journeyShareService } from '../services/api';
import { MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const AcceptInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return; // wait for auth check to finish

    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link.');
      return;
    }

    if (!isAuthenticated) {
      // Save token and redirect to login; LoginPage will redirect back here after sign-in
      sessionStorage.setItem('pendingInvitationToken', token);
      navigate(`/login?redirect=/accept-invitation/${token}`, { replace: true });
      return;
    }

    // User is authenticated — accept the invitation
    setStatus('loading');
    journeyShareService
      .acceptInvitation(token, true)
      .then(() => {
        setStatus('success');
        setMessage('Invitation accepted! Redirecting to your journeys…');
        setTimeout(() => navigate('/'), 2500);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'Failed to accept invitation. It may have expired or already been used.');
      });
  }, [authLoading, isAuthenticated, token, navigate]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg mb-4">
            <MapPin size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Journey Planner</h1>
        </div>

        {/* Card */}
        <div className="bg-[#161b22] rounded-2xl shadow-xl p-8 border border-[#30363d] text-center">
          {(status === 'idle' || status === 'loading') && (
            <>
              <Loader2 size={48} className="text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300 text-lg">Accepting your invitation…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Invitation Accepted!</p>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={48} className="text-red-400 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Something went wrong</p>
              <p className="text-gray-400 mb-6">{message}</p>
              <button
                onClick={() => navigate('/')}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;

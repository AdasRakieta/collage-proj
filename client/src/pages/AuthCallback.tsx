import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authApi';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing login...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    if (error) {
      setMessage(`Login failed: ${error}`);
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (!accessToken) {
      setMessage('Missing token from provider');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    // Store tokens and refresh user
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

    // Try to fetch current user and then redirect home
    (async () => {
      try {
        await authAPI.getCurrentUser();
      } catch (err) {
        // ignore - token may still be valid for frontend
      } finally {
        navigate('/');
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <p>{message}</p>
      </div>
    </div>
  );
};

export default AuthCallback;

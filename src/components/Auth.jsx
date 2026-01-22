// src/components/Auth.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth({ onAuthSuccess, showToast, setDbStatus, setLoading }) {
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);

  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    setEmailInvalid(false);
    setPasswordInvalid(false);

    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      if (!email) setEmailInvalid(true);
      if (!password) setPasswordInvalid(true);
      return;
    }

    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      setEmailInvalid(true);
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      setPasswordInvalid(true);
      return;
    }

    try {
      setDbStatus('Processing...', 'saving');
      setLoading(true);
      
      if (isSignupMode) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: window.location.href
          }
        });
        
        if (error) throw error;
        
        if (data.user && !data.session) {
          showToast('Account created! Please check your email to verify your account.', 'success');
          setIsSignupMode(false);
        } else {
          onAuthSuccess(data.user);
          showToast('Welcome to Century! 🎮', 'success');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
        
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
          }
          throw error;
        }
        
        onAuthSuccess(data.user);
        showToast('Welcome back! 🎮', 'success');
      }
      
      setDbStatus('Database Connected', 'connected');
    } catch (error) {
      console.error('Auth error:', error);
      setDbStatus('Authentication failed', 'error');
      showToast(error.message || 'Authentication failed. Please try again.', 'error');
      setTimeout(() => setDbStatus('Database Connected', 'connected'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignupMode(!isSignupMode);
    setEmailInvalid(false);
    setPasswordInvalid(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{isSignupMode ? 'Sign Up for Century' : 'Login to Century'}</h2>
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="authEmail">Email:</label>
            <input
              type="email"
              id="authEmail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailInvalid(false);
              }}
              className={emailInvalid ? 'invalid' : ''}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="authPassword">Password:</label>
            <input
              type="password"
              id="authPassword"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordInvalid(false);
              }}
              className={passwordInvalid ? 'invalid' : ''}
              placeholder="Enter password (min 6 characters)"
              autoComplete={isSignupMode ? 'new-password' : 'current-password'}
            />
          </div>
          <button type="submit" className="btn-success" style={{ width: '100%' }}>
            {isSignupMode ? 'Sign Up' : 'Login'}
          </button>
          <div className="auth-toggle">
            <span>
              {isSignupMode ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <a onClick={toggleMode}>
              {isSignupMode ? 'Login' : 'Sign up'}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
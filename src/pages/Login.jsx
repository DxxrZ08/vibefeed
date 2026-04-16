import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, Sparkles, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, getAuthErrorMessage } = useAuth();
  const redirectTo = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const trustPoints = [
    'One-click Google sign-in',
    'Personalized feed after sign-in',
    'Private bookmarks and profile sync',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error('Login failed:', {
        code: err?.code,
        message: err?.message,
        fullError: err,
      });
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error('Google login failed:', {
        code: err?.code,
        message: err?.message,
        fullError: err,
      });
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-marketing">
          <div className="auth-brand">
            <span className="auth-logo">
              <Sparkles size={28} />
            </span>
            <span className="auth-brand-name">VibeFeed</span>
          </div>
          <h1 className="auth-marketing-title">Read the signal, not the noise.</h1>
          <p className="auth-marketing-copy">
            Sign in to continue a feed that learns your interests, keeps your saved stories in sync, and surfaces
            the news that actually matters.
          </p>

          <div className="auth-benefits">
            <div className="benefit-item">
              <CheckCircle2 size={18} />
              <span>Fast, low-friction Google sign-in</span>
            </div>
            <div className="benefit-item">
              <ShieldCheck size={18} />
              <span>Secure profile and bookmark sync</span>
            </div>
            <div className="benefit-item">
              <SlidersHorizontal size={18} />
              <span>Feed tuned to your reading preferences</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-header">
            <div className="auth-card-topline">
              <Zap size={16} />
              <span>Welcome back</span>
            </div>
            <h2 className="auth-title">Sign in to VibeFeed</h2>
            <p className="auth-subtitle">Use email and password, or continue with Google.</p>
          </div>

          {error && (
            <div className="auth-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="auth-helper-row">
              <p className="auth-helper-text">Use the same email and password from your Firebase account.</p>
              <Link to="/signup" className="auth-helper-link">
                Create an account
              </Link>
            </div>

            <button
              disabled={loading}
              className={`auth-btn ${loading ? 'spinner' : ''}`}
              type="submit"
            >
              {loading ? (
                <>
                  <span className="spinner-icon" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">or continue with</div>

          <div className="social-buttons">
            <button type="button" className="social-btn social-btn-primary" onClick={handleGoogleLogin}>
              <svg viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <ul className="auth-trust-list">
            {trustPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Create Account</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;

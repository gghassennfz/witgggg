import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import '../styles/design-system.css';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Login successful!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-container">
      <Helmet>
        <title>Login - WitG</title>
      </Helmet>
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Log in to continue to your projects.</p>
        </div>
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              className="form-input"
              type="email"
              id="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`uil ${showPassword ? 'uil-eye' : 'uil-eye-slash'}`} />
              </button>
            </div>
          </div>
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
}

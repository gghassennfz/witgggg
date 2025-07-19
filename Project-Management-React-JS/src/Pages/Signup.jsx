import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import '../styles/design-system.css';
import './Auth.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters long.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signup successful! Please check your email to confirm your account.');
      navigate('/login');
    }
  };

  return (
    <div className="auth-container">
      <Helmet>
        <title>Sign Up - WitG</title>
      </Helmet>
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">Start your project management journey.</p>
        </div>
        <form className="auth-form" onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label" htmlFor="full-name">Full Name</label>
            <input
              className="form-input"
              type="text"
              id="full-name"
              placeholder="Enter your full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              className="form-input"
              type="text"
              id="username"
              placeholder="Create a unique username"
              required
              minLength="3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
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
                placeholder="Create a strong password"
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
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
            <input
              className="form-input"
              type="password"
              id="confirm-password"
              placeholder="Confirm your password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
}

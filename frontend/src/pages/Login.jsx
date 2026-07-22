import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Cpu, AlertCircle, CheckCircle } from 'lucide-react';

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CONSUMER');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isRegister) {
        await api.register(email, password, role);
        setSuccess('Account created successfully! You can now log in.');
        setIsRegister(false);
        setPassword('');
      } else {
        const userProfile = await api.login(email, password);
        setUser(userProfile);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Cpu size={48} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="auth-title">FKIP</h1>
          <p className="auth-subtitle">FinXSystems Knowledge Intelligence Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--status-failed)', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: 'var(--status-completed)', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. employee@finxsystems.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter secure password"
              className="form-input"
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Access Group (Role)</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="form-select"
              >
                <option value="CONSUMER">Consumer (Viewer)</option>
                <option value="CREATOR">Creator (Author / PM)</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="auth-toggle">
          {isRegister ? (
            <p>Already have an account? <span onClick={() => { setIsRegister(false); setError(''); }}>Sign In</span></p>
          ) : (
            <p>New to the platform? <span onClick={() => { setIsRegister(true); setError(''); }}>Create Account</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

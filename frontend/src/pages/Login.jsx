import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Cpu, AlertCircle, CheckCircle, ArrowRight, Shield, UserCheck, KeyRound } from 'lucide-react';

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CONSUMER');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fillQuickCredentials = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('password123');
    setRole(demoRole);
    setError('');
  };

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
      setError(err.message || 'Incorrect email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-main)', 
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Radial Glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        pointerEvents: 'none'
      }}></div>

      <div className="card" style={{ 
        maxWidth: '440px', 
        width: '100%', 
        padding: '40px 32px', 
        boxShadow: 'var(--shadow-lg)', 
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="logo-icon-wrapper" style={{ margin: '0 auto 16px auto', width: '48px', height: '48px', borderRadius: '14px' }}>
            <Cpu size={28} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.03em' }}>
            FKIP Platform
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            FinXSystems Knowledge Intelligence Enterprise Suite
          </p>
        </div>

        {/* Quick Credentials Chips */}
        <div style={{ marginBottom: '24px', background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            DEMO ACCOUNTS (CLICK TO AUTOFILL)
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={() => fillQuickCredentials('admin@finxsystems.com', 'ADMIN')}
              className="badge badge-primary"
              style={{ cursor: 'pointer', border: '1px solid var(--color-primary)' }}
            >
              <Shield size={12} /> Admin
            </button>
            <button 
              type="button" 
              onClick={() => fillQuickCredentials('creator@finxsystems.com', 'CREATOR')}
              className="badge badge-info"
              style={{ cursor: 'pointer', border: '1px solid var(--color-secondary)' }}
            >
              <UserCheck size={12} /> Creator
            </button>
            <button 
              type="button" 
              onClick={() => fillQuickCredentials('user@finxsystems.com', 'CONSUMER')}
              className="badge badge-secondary"
              style={{ cursor: 'pointer' }}
            >
              <KeyRound size={12} /> User
            </button>
          </div>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '8px', fontSize: '13px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="badge badge-success" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '8px', fontSize: '13px' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
              Email Address
            </label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. creator@finxsystems.com"
              className="form-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
              Password
            </label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="form-input"
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                Account Role
              </label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="form-input"
              >
                <option value="CONSUMER">Consumer / Reader</option>
                <option value="CREATOR">Creator / Analyst</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px', gap: '8px', fontSize: '15px' }}
          >
            <span>{isLoading ? 'Authenticating...' : isRegister ? 'Create Platform Account' : 'Sign In to Workspace'}</span>
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {isRegister ? 'Already have an account? Sign In' : 'New to FKIP Enterprise? Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

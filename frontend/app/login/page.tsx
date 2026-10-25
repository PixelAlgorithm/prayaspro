'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuick(userEmail: string) {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(userEmail);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '480px', padding: '60px 20px 80px' }}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'var(--brand-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '18px',
          marginBottom: '14px'
        }}>
          P
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-prominent)', marginBottom: '6px' }}>
          Sign In to PrayasPro
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Campus micro-task marketplace for university students
        </p>
      </div>

      <div className="card" style={{ padding: '32px', background: '#ffffff' }}>
        
        {/* Quick Demo Profiles Box */}
        <div style={{
          background: 'var(--canvas-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1-Click Demo Profiles
            </span>
            <span style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600 }}>
              Testing Presets
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuick('aarav@pesu.edu')}
              style={{ justifyContent: 'flex-start', padding: '8px 10px', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-prominent)', fontSize: '12px' }}>Aarav (Poster)</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Posts work • PESU</div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuick('ananya@bmsce.edu')}
              style={{ justifyContent: 'flex-start', padding: '8px 10px', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-prominent)', fontSize: '12px' }}>Ananya (Bidder)</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Bids & delivers • BMSCE</div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuick('priya@pesu.edu')}
              style={{ justifyContent: 'flex-start', padding: '8px 10px', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-prominent)', fontSize: '12px' }}>Priya (Student)</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>AI & ML • PESU</div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuick('admin@prayaspro.edu')}
              style={{ justifyContent: 'flex-start', padding: '8px 10px', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '12px' }}>Admin (Supervisor)</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Full system access</div>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: '#991b1b',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Campus Email</label>
            <input
              type="email"
              required
              placeholder="e.g. student@pesu.edu"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="divider" style={{ margin: '22px 0 16px' }} />

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
            Register as Student
          </Link>
        </div>

      </div>

    </div>
  );
}

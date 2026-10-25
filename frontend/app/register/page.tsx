'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { ArrowRight, User, Mail, Lock, Building2, BookOpen } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    college: 'PES University',
    department: 'Computer Science',
    role: 'STUDENT',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(formData);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '500px', padding: '60px 20px 80px' }}>
      
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
          Create Student Account
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Join the university campus micro-task network
        </p>
      </div>

      <div className="card" style={{ padding: '32px', background: '#ffffff' }}>
        
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
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Siddharth Verma"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Campus Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. siddharth@pesu.edu"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="Create a secure password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
            <div>
              <label className="form-label">University / Campus</label>
              <select
                className="form-control"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              >
                <option value="PES University">PES University</option>
                <option value="RVCE">RVCE</option>
                <option value="BMSCE">BMSCE</option>
                <option value="MSRIT">MSRIT</option>
              </select>
            </div>

            <div>
              <label className="form-label">Department / Branch</label>
              <select
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="AI & Machine Learning">AI & ML</option>
                <option value="Information Science">Information Science</option>
                <option value="Electronics & Comm">ECE</option>
                <option value="Design & Media">Design & Media</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            <span>{loading ? 'Creating Profile...' : 'Complete Registration'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="divider" style={{ margin: '22px 0 16px' }} />

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
            Sign In here
          </Link>
        </div>

      </div>

    </div>
  );
}

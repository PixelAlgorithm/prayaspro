'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  FileText, 
  Briefcase, 
  IndianRupee, 
  Calendar, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight
} from 'lucide-react';

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadMyApplications();
    }
  }, [user, authLoading]);

  async function loadMyApplications() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/applications/my');
      setApplications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch your applications.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw(applicationId: string) {
    if (!confirm('Are you sure you want to withdraw this proposal?')) {
      return;
    }

    setWithdrawingId(applicationId);
    try {
      await apiRequest(`/applications/${applicationId}/withdraw`, {
        method: 'PUT'
      });
      await loadMyApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to withdraw proposal.');
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '6px' }}>
            My proposals and bids
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Track the status of your micro-task proposals, bids, and active contract workspaces.
          </p>
        </div>

        <Link href="/tasks" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={15} />
          <span>Browse open tasks</span>
        </Link>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '14px' }} />
          <div>Loading your submitted proposals...</div>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px', background: '#ffffff' }}>
          <AlertCircle size={36} color="var(--accent-danger)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Failed to load applications</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 20px', background: '#ffffff' }}>
          <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '8px' }}>
            No proposals submitted yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Explore open micro-tasks on the campus marketplace and submit your first bid.
          </p>
          <Link href="/tasks" className="btn btn-primary">
            <Briefcase size={15} />
            <span>Explore Campus Tasks</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => {
            const appStatus = app.status || app.application_status || 'PENDING';
            const isAccepted = appStatus === 'ACCEPTED';
            const posterName = app.task_owner_name || app.owner_name || 'Campus Poster';
            const submittedDate = app.created_at || app.applied_at;

            return (
              <div 
                key={app.application_id} 
                className="card" 
                style={{ 
                  padding: '24px',
                  background: '#ffffff',
                  borderColor: isAccepted ? 'var(--border-medium)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span className="badge badge-accent">
                        {app.category_name}
                      </span>
                      <span className={`badge ${
                        appStatus === 'PENDING' ? 'badge-primary' :
                        appStatus === 'ACCEPTED' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {isAccepted ? 'Hired' : appStatus === 'PENDING' ? 'Pending' : appStatus}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Task status: <strong>{app.task_status}</strong>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-prominent)', margin: '0 0 4px 0' }}>
                      <Link href={`/tasks/${app.task_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {app.task_title}
                      </Link>
                    </h3>
                    
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Posted by {posterName}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your bid</span>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Number(app.proposed_amount).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Original budget: ₹{Number(app.task_budget).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Proposal Pitch Preview */}
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--canvas-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.55,
                  marginBottom: '16px'
                }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-secondary)', marginRight: '6px' }}>Your pitch:</span>
                  {app.proposal}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Submitted on {submittedDate ? new Date(submittedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {appStatus === 'PENDING' && (
                      <button
                        onClick={() => handleWithdraw(app.application_id)}
                        disabled={withdrawingId === app.application_id}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--accent-danger)', borderColor: '#fecaca' }}
                      >
                        <span>{withdrawingId === app.application_id ? 'Withdrawing...' : 'Withdraw bid'}</span>
                      </button>
                    )}

                    <Link href={`/tasks/${app.task_id}`} className="btn btn-outline btn-sm">
                      <span>View task</span>
                      <ArrowRight size={13} />
                    </Link>

                    {isAccepted && app.assignment_id && (
                      <Link href={`/assignments/${app.assignment_id}`} className="btn btn-primary btn-sm">
                        <span>Open workspace</span>
                        <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

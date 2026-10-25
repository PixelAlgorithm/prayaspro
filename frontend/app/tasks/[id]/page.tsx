'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  Briefcase, 
  Clock, 
  IndianRupee, 
  Calendar, 
  User, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  MapPin,
  Trash2
} from 'lucide-react';

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { user } = useAuth();

  const [task, setTask] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Proposal form state
  const [bidAmount, setBidAmount] = useState<number | ''>('');
  const [proposalText, setProposalText] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Owner action state
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTaskData();
  }, [taskId, user]);

  async function loadTaskData() {
    setLoading(true);
    setError(null);
    try {
      const taskData = await apiRequest(`/tasks/${taskId}`);
      setTask(taskData);
      setBidAmount(Number(taskData.budget) || '');

      const isTaskOwner = user && (user.id === taskData.owner_id || user.user_id === taskData.owner_id);
      
      if (isTaskOwner) {
        try {
          const apps = await apiRequest(`/applications/tasks/${taskId}/applications`);
          setApplications(apps);
        } catch (e) {
          console.warn('Could not load applications:', e);
        }

        try {
          const cands = await apiRequest(`/recommendations/students/${taskId}`);
          setCandidates(cands);
        } catch (e) {
          console.warn('Could not load candidate matches:', e);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    setSubmittingProposal(true);
    setError(null);
    setActionSuccess(null);

    try {
      await apiRequest(`/applications/tasks/${taskId}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          proposedAmount: Number(bidAmount),
          proposal: proposalText,
        }),
      });

      setActionSuccess('Your proposal has been submitted to the task poster!');
      setProposalText('');
      loadTaskData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal.');
    } finally {
      setSubmittingProposal(false);
    }
  }

  async function handleAcceptApplication(applicationId: string) {
    if (!confirm('Accept this proposal? This will assign the task and create your 1:1 Contract Workspace.')) {
      return;
    }

    setAcceptingId(applicationId);
    setError(null);
    try {
      const res = await apiRequest(`/applications/${applicationId}/accept`, {
        method: 'POST',
      });
      
      setActionSuccess('Proposal accepted! Redirecting to the 1:1 contract workspace...');
      const asgId = res.assignment?.assignment_id || res.assignment_id;
      if (asgId) {
        router.push(`/assignments/${asgId}`);
      } else {
        loadTaskData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to accept proposal.');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleCancelTask() {
    if (!confirm('Are you sure you want to cancel this task listing?')) {
      return;
    }

    setCancelling(true);
    try {
      await apiRequest(`/tasks/${taskId}/cancel`, {
        method: 'PUT',
      });
      loadTaskData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel task.');
    } finally {
      setCancelling(false);
    }
  }

  async function handleDeleteTask() {
    if (!confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
      alert('Task deleted successfully.');
      router.push('/my-tasks');
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
        <div>Loading task details...</div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="container" style={{ padding: '60px 0', maxWidth: '600px' }}>
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <AlertCircle size={36} color="var(--accent-danger)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Task Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error}</p>
          <Link href="/tasks" className="btn btn-primary">
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = Boolean(user && (user.id === task?.owner_id || user.user_id === task?.owner_id));
  const isAssignedWorker = Boolean(user && (user.id === task?.assigned_student_id || user.user_id === task?.assigned_student_id));
  const isAdmin = Boolean(user && user.role === 'ADMIN');
  const formattedBudget = Number(task.budget).toLocaleString('en-IN');
  const deadlineDate = task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : 'Flexible';

  const skillsList = task.required_skills 
    ? task.required_skills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const statusClass = 
    task.status === 'OPEN' ? 'badge-success' :
    task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' ? 'badge-primary' :
    task.status === 'COMPLETED' ? 'badge-accent' : 'badge-danger';

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* Back Link */}
      <Link href="/tasks" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', textDecoration: 'none' }}>
        <ArrowLeft size={14} />
        <span>Back to All Tasks</span>
      </Link>

      {/* Notifications */}
      {actionSuccess && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          color: '#065f46',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px'
        }}>
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          color: '#991b1b',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Assigned Specialist Alert Banner */}
      {isAssignedWorker && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-sm)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle size={22} color="#059669" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#065f46' }}>
                You have been hired for this task!
              </div>
              <div style={{ fontSize: '13px', color: '#047857' }}>
                Open your 1:1 Contract Workspace to upload files, report milestone progress, and submit deliverables.
              </div>
            </div>
          </div>
          {task.assignment_id && (
            <Link href={`/assignments/${task.assignment_id}`} className="btn btn-primary btn-sm">
              <span>Open Contract Workspace</span>
              <ExternalLink size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Task Overview & Specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '28px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="badge badge-accent">
                {task.category_name}
              </span>
              <span className={`badge ${statusClass}`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-prominent)', marginBottom: '14px', lineHeight: 1.3 }}>
              {task.title}
            </h1>

            {/* Poster Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--canvas-subtle)',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px'
              }}>
                {task.owner_name?.charAt(0) || 'U'}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-prominent)' }}>
                  Posted by {task.owner_name} {isOwner && '(You)'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {task.owner_college} • {task.owner_department || 'Engineering'}
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Task Requirements & Scope
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                {task.description}
              </p>
            </div>

            {/* Required Skills */}
            {skillsList.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Required Skills
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {skillsList.map((skill: string, i: number) => (
                    <span key={i} className="badge">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Owner Actions (Cancel & Delete) */}
          {(isOwner || isAdmin) && (
            <div className="card" style={{ padding: '20px', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-prominent)' }}>Listing Controls</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Manage, cancel, or permanently delete this task listing.</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {task.status === 'OPEN' && (
                  <button
                    onClick={handleCancelTask}
                    disabled={cancelling || deleting}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#d97706', borderColor: '#fde68a' }}
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Task'}
                  </button>
                )}
                {task.status !== 'COMPLETED' && (
                  <button
                    onClick={handleDeleteTask}
                    disabled={deleting || cancelling}
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--accent-danger)', borderColor: '#fecaca' }}
                  >
                    <Trash2 size={13} />
                    <span>{deleting ? 'Deleting...' : 'Delete Task'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Financial Overview & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stipend & Timeline Card */}
          <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Allocated Stipend
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)' }}>
                  ₹{formattedBudget}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Target Delivery
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-prominent)', marginTop: '4px' }}>
                  {deadlineDate}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              background: 'var(--canvas-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              <ShieldCheck size={16} color="var(--brand-primary)" />
              <span>Stipend held safely in escrow until deliverable approval.</span>
            </div>
          </div>

          {/* DUAL-ROLE ACTIONS */}
          {isOwner ? (
            /* OWNER VIEW: Applications / Bids List */
            <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-prominent)' }}>
                Applicant Proposals ({applications.length})
              </h3>

              {task.assignment_id && (
                <div style={{ marginBottom: '16px' }}>
                  <Link href={`/assignments/${task.assignment_id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    <span>Open 1:1 Contract Workspace</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              )}

              {applications.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  No student proposals submitted yet. Matching candidates will appear here as bids arrive.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {applications.map((app) => (
                    <div key={app.application_id} style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--canvas-base)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-prominent)' }}>
                            {app.applicant_name || app.student_name || 'Student Applicant'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {[app.applicant_college || app.student_college, app.applicant_department || app.student_department].filter(Boolean).join(' • ') || 'Campus Student'}
                          </div>
                          {app.average_rating && (
                            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                              <Star size={11} fill="#f59e0b" />
                              <span>{Number(app.average_rating).toFixed(1)} ({app.completed_assignments || 0} completed)</span>
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)' }}>
                            ₹{Number(app.proposed_amount).toLocaleString('en-IN')}
                          </div>
                          <span className={`badge ${app.status === 'ACCEPTED' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '10px' }}>
                            {app.status}
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                        "{app.proposal}"
                      </p>

                      {app.status === 'PENDING' && task.status === 'OPEN' && (
                        <button
                          onClick={() => handleAcceptApplication(app.application_id)}
                          disabled={acceptingId === app.application_id}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%' }}
                        >
                          {acceptingId === app.application_id ? 'Assigning...' : 'Accept Proposal & Begin Work'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STUDENT VIEW: Bid Proposal Submission Form OR Assigned Worker CTA */
            <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-prominent)' }}>
                {isAssignedWorker ? 'Your Assigned Contract' : 'Submit Your Proposal'}
              </h3>

              {!user ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    Sign in with your campus student account to bid on this micro-task.
                  </p>
                  <Link href="/login" className="btn btn-primary btn-sm">
                    <span>Sign In to Apply</span>
                  </Link>
                </div>
              ) : isAssignedWorker ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <CheckCircle size={24} />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '6px' }}>
                    You Are Hired For This Task!
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                    Congratulations! Your proposal was accepted. Open the 1:1 Contract Workspace to upload project deliverables, coordinate with the task owner, and request payout.
                  </p>
                  {task.assignment_id ? (
                    <Link 
                      href={`/assignments/${task.assignment_id}`} 
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <span>Open 1:1 Contract Workspace & Submit</span>
                      <ExternalLink size={14} />
                    </Link>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Assignment workspace is loading...
                    </p>
                  )}
                </div>
              ) : task.status !== 'OPEN' ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  This task is currently {task.status.replace('_', ' ').toLowerCase()} and not accepting new proposals.
                </p>
              ) : (
                <form onSubmit={handleApply}>
                  <div className="form-group">
                    <label className="form-label">Your Proposed Stipend (₹)</label>
                    <input
                      type="number"
                      min="100"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value ? Number(e.target.value) : '')}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cover Pitch / Approach</label>
                    <textarea
                      placeholder="Explain how you will complete this deliverable and your relevant technical background..."
                      value={proposalText}
                      onChange={(e) => setProposalText(e.target.value)}
                      className="form-control"
                      style={{ minHeight: '110px' }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingProposal}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Send size={14} />
                    <span>{submittingProposal ? 'Submitting Proposal...' : 'Submit Proposal'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

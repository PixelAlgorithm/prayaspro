'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  Calendar, 
  User, 
  Send, 
  Star, 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft,
  FileCheck,
  CheckCircle,
  ExternalLink,
  Sliders,
  RotateCcw
} from 'lucide-react';

export default function AssignmentWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Worker Progress State
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [workNotes, setWorkNotes] = useState<string>('');
  const [savingProgress, setSavingProgress] = useState(false);
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  // Client Redo / Changes State
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [redoFeedback, setRedoFeedback] = useState('');
  const [submittingRedo, setSubmittingRedo] = useState(false);

  // Review & Rating State
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Payout Closing State
  const [closingTask, setClosingTask] = useState(false);

  useEffect(() => {
    loadAssignment();
  }, [assignmentId, user]);

  async function loadAssignment() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/assignments/${assignmentId}`);
      setAssignment(data);
      setCurrentProgress(Number(data.progress_percentage || 0));
      setWorkNotes(data.submission_notes || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load contract workspace.');
    } finally {
      setLoading(false);
    }
  }

  // Update progress slider
  async function handleUpdateProgress(newVal: number) {
    setCurrentProgress(newVal);
    setSavingProgress(true);
    try {
      await apiRequest(`/assignments/${assignmentId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          progress_percentage: newVal,
          notes: workNotes
        })
      });
      await loadAssignment();
    } catch (err: any) {
      console.warn('Failed to save progress update:', err);
    } finally {
      setSavingProgress(false);
    }
  }

  // Submit deliverables
  async function handleSubmitDeliverable(e: React.FormEvent) {
    e.preventDefault();
    if (!workNotes || workNotes.trim().length < 5) {
      setError('Please provide deliverable details (such as a GitHub PR link or summary of work completed).');
      return;
    }
    setSubmittingDeliverable(true);
    setError(null);
    try {
      await apiRequest(`/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          notes: workNotes
        })
      });
      setActionSuccess('Deliverables submitted. Client has been notified for final review.');
      await loadAssignment();
    } catch (err: any) {
      setError(err.message || 'Failed to submit deliverables.');
    } finally {
      setSubmittingDeliverable(false);
    }
  }

  // Client requests redo
  async function handleRequestRedo(e: React.FormEvent) {
    e.preventDefault();
    if (!redoFeedback.trim()) return;

    setSubmittingRedo(true);
    setError(null);
    try {
      await apiRequest(`/assignments/${assignmentId}/redo`, {
        method: 'POST',
        body: JSON.stringify({
          feedback: redoFeedback
        })
      });
      setShowRedoModal(false);
      setRedoFeedback('');
      setActionSuccess('Revisions requested. Worker has been notified to make updates.');
      await loadAssignment();
    } catch (err: any) {
      setError(err.message || 'Failed to request revision.');
    } finally {
      setSubmittingRedo(false);
    }
  }

  // Client accepts deliverables & completes payout
  async function handleCompleteTask() {
    if (!confirm('Confirm and release stipend to student specialist?')) {
      return;
    }

    setClosingTask(true);
    setError(null);
    try {
      await apiRequest(`/assignments/${assignmentId}/complete`, {
        method: 'POST'
      });
      setActionSuccess('Contract completed. Payout has been released.');
      
      await loadAssignment();
    } catch (err: any) {
      setError(err.message || 'Failed to close contract.');
    } finally {
      setClosingTask(false);
    }
  }

  // Submit peer review
  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewComment.trim()) {
      alert('Please enter a feedback comment.');
      return;
    }

    setSubmittingReview(true);
    setError(null);
    try {
      const currentUserId = user?.user_id || user?.id;
      const isOwner = Boolean(currentUserId && (currentUserId === assignment.owner_id || currentUserId === assignment.task_owner_id));
      const targetUserId = isOwner ? assignment.student_id : (assignment.owner_id || assignment.task_owner_id);

      await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          taskId: assignment.task_id,
          reviewedUserId: targetUserId,
          rating,
          comment: reviewComment
        })
      });

      setReviewSubmitted(true);
      setActionSuccess('Peer review successfully recorded.');
      await loadAssignment();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
        <div>Loading contract workspace...</div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="container" style={{ padding: '60px 0', maxWidth: '520px' }}>
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <AlertCircle size={36} color="var(--accent-danger)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Workspace Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error}</p>
          <Link href="/tasks" className="btn btn-primary">
            <span>Back to Tasks</span>
          </Link>
        </div>
      </div>
    );
  }

  const currentUserId = user?.user_id || user?.id;
  const isOwner = Boolean(currentUserId && (currentUserId === assignment.owner_id || currentUserId === assignment.task_owner_id));
  const isWorker = Boolean(currentUserId && (currentUserId === assignment.student_id));
  const reviewsList: any[] = assignment.reviews || [];
  const myReview = reviewsList.find((r: any) => r.reviewer_id === currentUserId);
  const peerReview = reviewsList.find((r: any) => r.reviewed_user_id === currentUserId);

  const status = assignment.status; // 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'
  const progressPercent = Number(assignment.progress_percentage ?? currentProgress ?? 0);
  const formattedBudget = Number(assignment.task_budget).toLocaleString('en-IN');

  const posterName = assignment.owner_name || assignment.task_owner_name || 'Aarav';
  const posterCollege = assignment.owner_college || assignment.task_owner_college || 'PES University';
  const workerName = assignment.worker_name || assignment.student_name || 'Ananya';
  const workerCollege = assignment.worker_college || assignment.student_college || 'BMSCE';

  const stepIndex = status === 'ASSIGNED' ? 1 
    : status === 'IN_PROGRESS' ? 2 
    : status === 'SUBMITTED' ? 3 
    : 4;

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* Back link */}
      <Link href={`/tasks/${assignment.task_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', textDecoration: 'none' }}>
        <ArrowLeft size={14} />
        <span>Back to Task Overview</span>
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

      {/* 1. Deal Room Header Card */}
      <div className="card" style={{ padding: '28px', background: '#ffffff', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '4px' }}>
              1:1 Contract Workspace
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-prominent)', margin: 0 }}>
              {assignment.task_title}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-primary" style={{ fontSize: '12px' }}>
              {status.replace('_', ' ')}
            </span>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              ₹{formattedBudget}
            </div>
          </div>
        </div>

        {/* Counterparty Identity Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {posterName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Client (poster)</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-prominent)' }}>{posterName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{posterCollege}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ecfdf5', color: 'var(--brand-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {workerName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Specialist (worker)</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-prominent)' }}>{workerName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{workerCollege}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4-Step Milestone Pipeline */}
      <div className="card" style={{ padding: '24px', background: '#ffffff', marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '14px' }}>
          Contract lifecycle
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}>
          {[
            { num: 1, title: 'Contract initiated', desc: 'Agreed terms & scope' },
            { num: 2, title: 'In progress', desc: 'Active execution' },
            { num: 3, title: 'Submitted', desc: 'Pending client review' },
            { num: 4, title: 'Settled & paid', desc: 'Deliverables verified' },
          ].map((step) => {
            const isCompleted = stepIndex >= step.num;
            const isCurrent = stepIndex === step.num;
            return (
              <div
                key={step.num}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isCurrent ? '#eff6ff' : isCompleted ? '#f0fdf4' : 'var(--canvas-subtle)',
                  border: isCurrent ? '1px solid #bfdbfe' : isCompleted ? '1px solid #bbf7d0' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isCompleted ? 'var(--brand-emerald)' : 'var(--border-medium)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {isCompleted ? '✓' : step.num}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-prominent)' }}>
                    {step.title}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {step.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Progress Tracking & Deliverables Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Progress Slider & Deliverable Submission */}
        <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-prominent)', margin: 0 }}>
              Milestone progress
            </h3>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {currentProgress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ height: '100%', width: `${currentProgress}%`, background: 'var(--brand-primary)', transition: 'width 0.3s ease' }} />
          </div>

          {/* Slider & Presets for Worker */}
          {isWorker && status !== 'COMPLETED' && (
            <div style={{ marginBottom: '24px' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={currentProgress}
                onChange={(e) => setCurrentProgress(Number(e.target.value))}
                onMouseUp={() => handleUpdateProgress(currentProgress)}
                onTouchEnd={() => handleUpdateProgress(currentProgress)}
                style={{ width: '100%', cursor: 'pointer', marginBottom: '10px' }}
              />

              <div style={{ display: 'flex', gap: '6px' }}>
                {[25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleUpdateProgress(preset)}
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, fontSize: '12px', padding: '4px' }}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deliverables Submission Form */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '8px' }}>
              Project Deliverables & Notes
            </h4>

            {isWorker && status !== 'COMPLETED' ? (
              <form onSubmit={handleSubmitDeliverable}>
                <textarea
                  placeholder="Paste GitHub repository URLs, Figma designs, drive links, and implementation notes..."
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  className="form-control"
                  style={{ minHeight: '120px', marginBottom: '14px' }}
                  required
                />

                <button
                  type="submit"
                  disabled={submittingDeliverable}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Send size={14} />
                  <span>{submittingDeliverable ? 'Submitting...' : 'Submit Deliverables for Review'}</span>
                </button>
              </form>
            ) : (
              <div style={{
                padding: '14px',
                background: 'var(--canvas-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: 1.6
              }}>
                {workNotes || 'No deliverable notes submitted yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review & Payout Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Client Decision Box */}
          {isOwner && status !== 'COMPLETED' && (
            <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '12px' }}>
                Deliverable Review Controls
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>
                Inspect the work submitted by the specialist. Release the stipend or request revisions if requirements are incomplete.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCompleteTask}
                  disabled={closingTask}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <CheckCircle size={15} />
                  <span>{closingTask ? 'Releasing Payout...' : 'Accept Deliverables & Release Payout'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRedoModal(true)}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <RotateCcw size={15} />
                  <span>Request Revisions</span>
                </button>
              </div>
            </div>
          )}

          {/* Post-Completion Rating Card */}
          {status === 'COMPLETED' && (
            <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '14px' }}>
                Peer Rating & Feedback
              </h3>

              {/* Display feedback received from counterpart if available */}
              {peerReview && (
                <div style={{
                  padding: '14px',
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #e2e8f0',
                  marginBottom: '18px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '4px' }}>
                    Feedback Received from {isOwner ? `Specialist (${workerName})` : `Client (${posterName})`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    <Star size={14} fill="#f59e0b" />
                    <span>{peerReview.rating} / 5 Stars</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{peerReview.comment}"
                  </p>
                </div>
              )}

              {/* User's own review section */}
              {myReview || reviewSubmitted ? (
                <div style={{
                  padding: '14px',
                  background: '#ecfdf5',
                  color: '#065f46',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #a7f3d0',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    ✓ Your Review Submitted ({myReview?.rating || rating} Stars)
                  </div>
                  <div style={{ color: '#047857' }}>
                    "{myReview?.comment || reviewComment}"
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit}>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="form-label">
                      Rate your experience with {isOwner ? workerName : posterName} (1 to 5 Stars)
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRating(starVal)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: starVal <= rating ? '#f59e0b' : 'var(--border-medium)',
                            padding: '4px'
                          }}
                        >
                          <Star size={24} fill={starVal <= rating ? '#f59e0b' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Feedback Comment</label>
                    <textarea
                      placeholder="Share constructive feedback about communication, timeliness, and deliverable quality..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="form-control"
                      style={{ minHeight: '90px' }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>{submittingReview ? 'Submitting...' : 'Submit Peer Review'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Revision Modal */}
      {showRedoModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '28px', background: '#ffffff' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '8px' }}>
              Request Changes / Revision
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Provide clear feedback on what needs adjustment. The task status will revert to In Progress.
            </p>

            <form onSubmit={handleRequestRedo}>
              <textarea
                placeholder="Specific guidance on required updates or missing requirements..."
                value={redoFeedback}
                onChange={(e) => setRedoFeedback(e.target.value)}
                className="form-control"
                style={{ minHeight: '110px', marginBottom: '18px' }}
                required
              />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowRedoModal(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRedo}
                  className="btn btn-primary btn-sm"
                >
                  {submittingRedo ? 'Submitting...' : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

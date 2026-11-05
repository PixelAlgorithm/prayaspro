'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  Layers, 
  PlusCircle, 
  Calendar, 
  IndianRupee, 
  Users, 
  ExternalLink, 
  AlertCircle,
  ArrowRight,
  Trash2
} from 'lucide-react';

export default function MyTasksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadMyTasks();
    }
  }, [user, authLoading]);

  async function loadMyTasks() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/tasks/my/posted');
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posted tasks.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask(taskId: string, title: string) {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(taskId);
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
      await loadMyTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') return ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status);
    return t.status === filterStatus;
  });

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '6px' }}>
            My published tasks
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Manage the micro-tasks you have published to the student network and review applicant proposals.
          </p>
        </div>

        <Link href="/tasks/create" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={15} />
          <span>Post a task</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px', 
        borderBottom: '1px solid var(--border-subtle)', 
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        {[
          { key: 'ALL', label: 'All tasks', count: tasks.length },
          { key: 'OPEN', label: 'Open for bids', count: tasks.filter(t => t.status === 'OPEN').length },
          { key: 'ACTIVE', label: 'In progress', count: tasks.filter(t => ['ASSIGNED', 'IN_PROGRESS'].includes(t.status)).length },
          { key: 'COMPLETED', label: 'Completed', count: tasks.filter(t => t.status === 'COMPLETED').length },
        ].map((tab) => {
          const isActive = filterStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 500,
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                background: isActive ? 'var(--brand-primary)' : 'var(--border-subtle)',
                color: isActive ? '#ffffff' : 'var(--text-muted)'
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '14px' }} />
          <div>Loading your tasks...</div>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px', background: '#ffffff' }}>
          <AlertCircle size={36} color="var(--accent-danger)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Failed to load tasks</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 20px', background: '#ffffff' }}>
          <Layers size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '8px' }}>
            No tasks found in this view
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '380px', margin: '0 auto 20px' }}>
            You haven't posted any micro-tasks matching the "{filterStatus}" filter yet.
          </p>
          <Link href="/tasks/create" className="btn btn-primary">
            <PlusCircle size={15} />
            <span>Post a Task Now</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredTasks.map((task) => (
            <div 
              key={task.task_id} 
              className="card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                padding: '24px',
                background: '#ffffff'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge badge-accent">
                    {task.category_name}
                  </span>
                  <span className={`badge ${
                    task.status === 'OPEN' ? 'badge-success' :
                    task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' ? 'badge-primary' :
                    task.status === 'COMPLETED' ? 'badge-accent' : 'badge-danger'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '8px', lineHeight: 1.35 }}>
                  <Link href={`/tasks/${task.task_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {task.title}
                  </Link>
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {task.description}
                </p>
              </div>

              <div>
                <div className="divider" style={{ margin: '12px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stipend</span>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Number(task.budget).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Due {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link 
                    href={`/tasks/${task.task_id}`} 
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <span>View proposals</span>
                    <ArrowRight size={13} />
                  </Link>

                  {task.assignment_id && (
                    <Link 
                      href={`/assignments/${task.assignment_id}`} 
                      className="btn btn-primary btn-sm"
                      title="Open 1:1 Contract Workspace"
                    >
                      <span>Workspace</span>
                      <ExternalLink size={13} />
                    </Link>
                  )}

                  {task.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleDeleteTask(task.task_id, task.title)}
                      disabled={deletingId === task.task_id}
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--accent-danger)', borderColor: '#fecaca', padding: '0 10px' }}
                      title="Delete Task"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

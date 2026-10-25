'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  ShieldCheck, 
  Users, 
  Briefcase, 
  IndianRupee, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Trash2, 
  Search, 
  ExternalLink 
} from 'lucide-react';

export default function AdminConsolePage() {
  const { user, quickLogin } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'USERS' | 'LEDGER'>('OVERVIEW');
  
  // Search & Filter state
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadAdminData();
    }
  }, [user]);

  async function loadAdminData() {
    setLoading(true);
    setError(null);
    try {
      const [statsData, usersData, tasksData, ledgerData] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/users'),
        apiRequest('/admin/tasks'),
        apiRequest('/admin/ledger')
      ]);

      setStats(statsData);
      setUsersList(usersData);
      setTasksList(tasksData);
      setLedger(ledgerData);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative records.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleUserStatus(userId: string, currentStatus: boolean) {
    try {
      await apiRequest(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      setActionSuccess('User status updated successfully.');
      setUsersList(usersList.map(u => u.user_id === userId ? { ...u, is_active: !currentStatus } : u));
    } catch (err: any) {
      setError(err.message || 'Failed to update user status.');
    }
  }

  async function handleDeleteTask(taskId: string, title: string) {
    if (!confirm(`Are you sure you want to permanently delete task "${title}"? This will cascade remove proposals and assignments.`)) {
      return;
    }

    setDeletingTaskId(taskId);
    try {
      await apiRequest(`/admin/tasks/${taskId}`, {
        method: 'DELETE'
      });
      setActionSuccess(`Task "${title}" deleted.`);
      setTasksList(tasksList.filter(t => t.task_id !== taskId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    } finally {
      setDeletingTaskId(null);
    }
  }

  // Restrict access if not ADMIN
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '480px' }}>
        <div className="card" style={{ padding: '36px', background: '#ffffff' }}>
          <ShieldCheck size={40} color="var(--brand-primary)" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Administrator Access Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.55 }}>
            This supervisory console is restricted to administrators. Switch to the Admin persona to test operations.
          </p>
          <button
            onClick={() => quickLogin('admin@prayaspro.edu')}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Switch to Admin Persona
          </button>
        </div>
      </div>
    );
  }

  const filteredTasks = tasksList.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
                          t.owner_name?.toLowerCase().includes(taskSearch.toLowerCase());
    const matchesStatus = taskStatusFilter === 'ALL' || t.status === taskStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = usersList.filter(u => {
    return u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
           u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
           u.college.toLowerCase().includes(userSearch.toLowerCase());
  });

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-prominent)', marginBottom: '4px' }}>
            Platform Operations & Administration
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Supervise user rosters, manage task listings, and audit settled campus transactions.
          </p>
        </div>

        <button onClick={loadAdminData} className="btn btn-outline btn-sm">
          Refresh Records
        </button>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          marginBottom: '20px',
          fontSize: '13px',
        }}>
          {actionSuccess}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px',
        overflowX: 'auto'
      }}>
        {[
          { key: 'OVERVIEW', label: 'System Overview' },
          { key: 'TASKS', label: `Task Listings (${tasksList.length})` },
          { key: 'USERS', label: `Student Roster (${usersList.length})` },
          { key: 'LEDGER', label: `Financial Ledger (${ledger.length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                background: isActive ? '#eff6ff' : 'transparent',
                border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '14px' }} />
          <div>Loading administrative records...</div>
        </div>
      ) : activeTab === 'OVERVIEW' ? (
        /* TAB 1: OVERVIEW METRICS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            <div className="card" style={{ padding: '20px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL REGISTERED STUDENTS</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {stats?.metrics?.totalUsers || '0'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {stats?.metrics?.totalStudents || '0'} active learners
              </div>
            </div>

            <div className="card" style={{ padding: '20px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL TASKS PUBLISHED</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {stats?.metrics?.totalTasks || '0'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Across {stats?.categoryStats?.length || '5'} departments
              </div>
            </div>

            <div className="card" style={{ padding: '20px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SETTLED STIPEND VOLUME</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--brand-emerald)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                ₹{Number(stats?.metrics?.totalVolume || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Disbursed to student freelancers
              </div>
            </div>

            <div className="card" style={{ padding: '20px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PLATFORM SYSTEM HEALTH</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '6px' }}>
                Operational
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Zero active policy violations
              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'TASKS' ? (
        /* TAB 2: TASKS MANAGEMENT */
        <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search tasks or poster..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="form-control"
              style={{ maxWidth: '300px' }}
            />
            <select
              value={taskStatusFilter}
              onChange={(e) => setTaskStatusFilter(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Title</th>
                  <th style={{ padding: '10px' }}>Poster</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Stipend</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr key={t.task_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{t.title}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{t.owner_name}</td>
                    <td style={{ padding: '12px 10px' }}><span className="badge badge-accent">{t.category_name}</span></td>
                    <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{Number(t.budget).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 10px' }}><span className="badge">{t.status}</span></td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteTask(t.task_id, t.title)}
                        disabled={deletingTaskId === t.task_id}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--accent-danger)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'USERS' ? (
        /* TAB 3: USERS ROSTER */
        <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search students by name, email, or campus..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="form-control"
              style={{ maxWidth: '340px' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Student Name</th>
                  <th style={{ padding: '10px' }}>Campus Email</th>
                  <th style={{ padding: '10px' }}>University</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Controls</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '12px 10px' }}>{u.college}</td>
                    <td style={{ padding: '12px 10px' }}><span className="badge badge-primary">{u.role}</span></td>
                    <td style={{ padding: '12px 10px' }}>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleUserStatus(u.user_id, u.is_active)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 4: FINANCIAL AUDIT LEDGER */
        <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-prominent)' }}>
            Disbursement & Payment Ledger
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Payment Reference</th>
                  <th style={{ padding: '10px' }}>Task Description</th>
                  <th style={{ padding: '10px' }}>Client (Payer)</th>
                  <th style={{ padding: '10px' }}>Specialist (Receiver)</th>
                  <th style={{ padding: '10px' }}>Stipend</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((p, i) => (
                  <tr key={p.payment_id || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.payment_id?.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{p.task_title}</td>
                    <td style={{ padding: '12px 10px' }}>{p.payer_name}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{p.receiver_name}</td>
                    <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span className="badge badge-success">{p.payment_status}</span>
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : 'Completed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

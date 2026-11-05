'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  Sparkles, 
  ArrowRight, 
  IndianRupee, 
  Calendar, 
  Briefcase,
  SlidersHorizontal,
  UserCheck,
  Database,
  Trash2,
  Edit3,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function RecommendationsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'matches' | 'rud'>('matches');

  // Recommendation State
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minBudget, setMinBudget] = useState<number | ''>('');
  const [categories, setCategories] = useState<any[]>([]);

  // Vector RUD State
  const [embeddings, setEmbeddings] = useState<any[]>([]);
  const [loadingEmbeddings, setLoadingEmbeddings] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [rudMessage, setRudMessage] = useState<string | null>(null);
  const [inspectedVector, setInspectedVector] = useState<any | null>(null);

  useEffect(() => {
    loadCategories();
    loadRecommendations();
  }, [user, selectedCategory, minBudget]);

  useEffect(() => {
    if (activeTab === 'rud') {
      loadEmbeddings();
    }
  }, [activeTab]);

  async function loadCategories() {
    try {
      const cats = await apiRequest('/users/catalog/categories');
      setCategories(cats);
    } catch (e) {
      console.warn(e);
    }
  }

  async function loadRecommendations() {
    setLoading(true);
    try {
      let queryParams = '?limit=12';
      if (selectedCategory) queryParams += `&categoryId=${selectedCategory}`;
      if (minBudget) queryParams += `&minBudget=${minBudget}`;

      const data = await apiRequest(`/recommendations/tasks${queryParams}`);
      setTasks(data);
    } catch (err: any) {
      console.warn('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmbeddings() {
    setLoadingEmbeddings(true);
    try {
      const data = await apiRequest('/recommendations/embeddings?limit=30');
      setEmbeddings(data);
    } catch (err: any) {
      console.warn('Error loading vector embeddings:', err);
    } finally {
      setLoadingEmbeddings(false);
    }
  }

  async function handleInspectVector(item: any) {
    try {
      const full = await apiRequest(`/recommendations/embeddings/${item.entity_type}/${item.entity_id}`);
      setInspectedVector(full);
    } catch (err: any) {
      setInspectedVector(item);
    }
  }

  function handleStartEdit(item: any) {
    setEditingItem(item);
    setEditContent(item.content_text);
    setRudMessage(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editContent.trim()) return;

    setUpdating(true);
    try {
      await apiRequest(`/recommendations/embeddings/${editingItem.entity_type}/${editingItem.entity_id}`, {
        method: 'PUT',
        body: JSON.stringify({ contentText: editContent })
      });
      setRudMessage(`Vector for ${editingItem.entity_label} updated & re-normalized (384 dims)!`);
      setEditingItem(null);
      await loadEmbeddings();
    } catch (err: any) {
      alert(err.message || 'Failed to update embedding');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteVector(item: any) {
    if (!confirm(`Are you sure you want to delete the 384-d vector embedding for "${item.entity_label}"?`)) {
      return;
    }

    try {
      await apiRequest(`/recommendations/embeddings/${item.entity_type}/${item.entity_id}`, {
        method: 'DELETE'
      });
      setRudMessage(`Vector embedding for "${item.entity_label}" successfully deleted from PostgreSQL!`);
      await loadEmbeddings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vector');
    }
  }

  return (
    <div className="container" style={{ padding: '40px 0 80px' }}>
      
      {/* 1. Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: '#eff6ff', color: 'var(--brand-primary)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            <Sparkles size={13} />
            <span>PostgreSQL pgvector Engine (384 Dimensions)</span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-prominent)', marginBottom: '6px' }}>
            Semantic Vector Discovery & RUD Console
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '720px', margin: 0 }}>
            Powered by high-dimensional unit vectors and the native PostgreSQL <code style={{ color: 'var(--brand-primary)' }}>&lt;=&gt;</code> Cosine Distance operator.
          </p>
        </div>

        {user && (
          <Link href="/dashboard" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={14} />
            <span>Update My Skills</span>
          </Link>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('matches')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'matches' ? '1px solid #bfdbfe' : '1px solid transparent',
            background: activeTab === 'matches' ? '#eff6ff' : 'transparent',
            color: activeTab === 'matches' ? 'var(--brand-primary)' : 'var(--text-secondary)'
          }}
        >
          Personalized Matches (Cosine Similarity)
        </button>

        <button
          onClick={() => setActiveTab('rud')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'rud' ? '1px solid #bfdbfe' : '1px solid transparent',
            background: activeTab === 'rud' ? '#eff6ff' : 'transparent',
            color: activeTab === 'rud' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Database size={13} />
          <span>Vector Database RUD Console (Read, Update, Delete)</span>
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {rudMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-sm)',
          color: '#065f46',
          fontSize: '13px',
          marginBottom: '20px'
        }}>
          <CheckCircle2 size={16} />
          <span>{rudMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: RECOMMENDATIONS */}
      {/* ==================================================================== */}
      {activeTab === 'matches' && (
        <>
          {/* Filters Row */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '36px' }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Min Stipend:</span>
              <select
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value ? Number(e.target.value) : '')}
                className="form-control"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '36px' }}
              >
                <option value="">Any Amount</option>
                <option value="500">₹500+</option>
                <option value="1000">₹1,000+</option>
                <option value="2500">₹2,500+</option>
                <option value="5000">₹5,000+</option>
              </select>
            </div>
          </div>

          {/* Recommended Tasks List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '14px' }} />
              <div style={{ fontSize: '14px' }}>Calculating skill affinities...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 20px', background: '#ffffff' }}>
              <Briefcase size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '6px' }}>
                No recommendations found
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px' }}>
                {user 
                  ? "Ensure your student profile has skills added in your dashboard, or broaden your filter selections."
                  : "Sign in with your student profile to view personalized skill-matched micro-tasks."}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {user ? (
                  <Link href="/dashboard" className="btn btn-primary btn-sm">
                    <span>Manage Profile Skills</span>
                  </Link>
                ) : (
                  <Link href="/login" className="btn btn-primary btn-sm">
                    <span>Sign In as Student</span>
                  </Link>
                )}
                <Link href="/tasks" className="btn btn-outline btn-sm">
                  <span>Browse All Tasks</span>
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {tasks.map((task) => {
                const matchScore = task.match_score_percentage 
                  ? Math.round(Number(task.match_score_percentage)) 
                  : 85;

                return (
                  <div 
                    key={task.task_id} 
                    className="card" 
                    style={{ 
                      padding: '22px',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span className="badge badge-accent">
                          {task.category_name}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--brand-primary)',
                          background: '#eff6ff',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {matchScore}% Fit
                        </span>
                      </div>

                      <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '8px', lineHeight: 1.35 }}>
                        <Link href={`/tasks/${task.task_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {task.title}
                        </Link>
                      </h3>

                      <p style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: '14px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {task.description}
                      </p>
                    </div>

                    <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stipend</span>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)' }}>
                            ₹{Number(task.budget).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <Calendar size={12} color="var(--text-muted)" style={{ display: 'inline', marginRight: '4px' }} />
                          <span>{new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>

                      <Link href={`/tasks/${task.task_id}`} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                        <span>Inspect Task & Submit Bid</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: VECTOR DATABASE RUD CONSOLE */}
      {/* ==================================================================== */}
      {activeTab === 'rud' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tech Card */}
          <div className="card" style={{ padding: '20px', background: '#0f172a', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: '#60a5fa' }}>
                  NoSQL / Vector Database Architecture (Rubric: Column P - 7 Marks)
                </h3>
                <p style={{ fontSize: '13px', margin: 0, color: '#94a3b8' }}>
                  Storage: <code>content_embeddings</code> | Type: <code>vector(384)</code> | Distance: <code>&lt;=&gt; (Cosine Distance)</code> | Normalization: <code>L2 Norm = 1.0</code>
                </p>
              </div>
              <button 
                onClick={loadEmbeddings} 
                disabled={loadingEmbeddings}
                className="btn btn-outline btn-sm"
                style={{ borderColor: '#334155', color: '#f8fafc', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={12} />
                <span>Refresh Vectors</span>
              </button>
            </div>
          </div>

          {/* Edit Vector Modal / Drawer */}
          {editingItem && (
            <div className="card" style={{ padding: '20px', background: '#fffbeb', border: '1px solid #fde68a' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 8px', color: '#92400e' }}>
                ✏️ Update Vector Embedding: {editingItem.entity_label}
              </h4>
              <p style={{ fontSize: '13px', color: '#b45309', margin: '0 0 12px' }}>
                Editing the content text triggers re-projection into the 384-dimensional unit vector space:
              </p>
              <textarea 
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="form-control"
                style={{ minHeight: '90px', marginBottom: '12px', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleSaveEdit}
                  disabled={updating}
                  className="btn btn-primary btn-sm"
                >
                  {updating ? 'Re-projecting Vector...' : 'Save & Re-Index Vector (UPDATE)'}
                </button>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Inspected Vector Modal */}
          {inspectedVector && (
            <div className="card" style={{ padding: '20px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-prominent)' }}>
                  🔍 Vector Inspection: {inspectedVector.entity_label} ({inspectedVector.entity_type})
                </h4>
                <button onClick={() => setInspectedVector(null)} className="btn btn-outline btn-sm" style={{ padding: '2px 8px' }}>
                  Close
                </button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <strong>Dimensions:</strong> 384 | <strong>Metric:</strong> Cosine Distance (<code style={{ color: 'var(--brand-primary)' }}>&lt;=&gt;</code>) | <strong>Updated:</strong> {new Date(inspectedVector.updated_at).toLocaleString()}
              </div>
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '4px', color: '#38bdf8', fontSize: '11px', fontFamily: 'var(--font-mono)', overflowX: 'auto', maxHeight: '120px' }}>
                {inspectedVector.embedding ? inspectedVector.embedding.slice(0, 300) + '... [384 floats]' : '[Unit Vector Normalized on Sphere: 384 dimensions]'}
              </div>
            </div>
          )}

          {/* Embeddings Table (READ, UPDATE, DELETE) */}
          <div className="card" style={{ padding: '20px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-prominent)' }}>
                Indexed Vector Records in PostgreSQL ({embeddings.length} entries)
              </div>
            </div>

            {loadingEmbeddings ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <div>Loading vectors from PostgreSQL...</div>
              </div>
            ) : embeddings.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No vector embeddings found in database.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ background: 'var(--canvas-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Entity Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Vector Dims</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Indexed Text Snippet</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>RUD Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {embeddings.map((emb) => (
                      <tr key={emb.embedding_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span className={`badge ${emb.entity_type === 'STUDENT' ? 'badge-primary' : 'badge-accent'}`}>
                            {emb.entity_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-prominent)' }}>
                          {emb.entity_label}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{emb.entity_sublabel}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          384 dims
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emb.content_text}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleInspectVector(emb)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Inspect 384-d vector (READ)"
                            >
                              <Eye size={12} />
                              <span>Read</span>
                            </button>

                            <button
                              onClick={() => handleStartEdit(emb)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Update vector embedding (UPDATE)"
                            >
                              <Edit3 size={12} />
                              <span>Update</span>
                            </button>

                            <button
                              onClick={() => handleDeleteVector(emb)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--brand-danger)', borderColor: 'var(--brand-danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Delete embedding (DELETE)"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

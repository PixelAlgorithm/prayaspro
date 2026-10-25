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
  MapPin,
  SlidersHorizontal,
  UserCheck
} from 'lucide-react';

export default function RecommendationsPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minBudget, setMinBudget] = useState<number | ''>('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
    loadRecommendations();
  }, [user, selectedCategory, minBudget]);

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

  return (
    <div className="container" style={{ padding: '40px 0 80px' }}>
      
      {/* 1. Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: '#eff6ff', color: 'var(--brand-primary)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            <Sparkles size={13} />
            <span>AI Skill Matching</span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-prominent)', marginBottom: '6px' }}>
            Personalized Task Matches
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '640px', margin: 0 }}>
            Micro-tasks tailored specifically to your profile skills, academic background, and engineering interests.
          </p>
        </div>

        {user && (
          <Link href="/dashboard" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={14} />
            <span>Update My Skills</span>
          </Link>
        )}
      </div>

      {/* 2. Filters Row */}
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

      {/* 3. Recommended Tasks List */}
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

    </div>
  );
}

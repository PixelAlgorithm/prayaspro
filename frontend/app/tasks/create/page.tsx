'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  PlusCircle, 
  ArrowLeft, 
  AlertCircle, 
  IndianRupee, 
  Calendar, 
  Check
} from 'lucide-react';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState<number | ''>(1000);
  const [deadline, setDeadline] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default deadline to 5 days from today
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setDeadline(d.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, []);

  async function loadCatalogs() {
    try {
      const [cats, sks] = await Promise.all([
        apiRequest('/users/catalog/categories'),
        apiRequest('/users/catalog/skills')
      ]);
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].category_id);
      }
      setAvailableSkills(sks);
    } catch (e) {
      console.warn('Error loading catalogs:', e);
    }
  }

  function toggleSkill(skillName: string) {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  }

  function handleAddCustomSkill(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && customSkillInput.trim()) {
      e.preventDefault();
      const val = customSkillInput.trim();
      if (!selectedSkills.includes(val)) {
        setSelectedSkills([...selectedSkills, val]);
      }
      setCustomSkillInput('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    if (!title.trim() || !description.trim() || !budget || !deadline) {
      setError('Please fill out all required task specifications.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: categoryId,
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          budget: Number(budget),
          deadline: deadline,
          requiredSkills: selectedSkills.join(', '),
          required_skills: selectedSkills.join(', '),
        }),
      });

      if (res.task_id) {
        router.push(`/tasks/${res.task_id}`);
      } else {
        router.push('/tasks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* Back navigation */}
      <Link href="/tasks" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', textDecoration: 'none' }}>
        <ArrowLeft size={14} />
        <span>Back to Tasks</span>
      </Link>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '6px' }}>
          Publish a campus micro-task
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          Define the deliverables, stipend, and technical requirements for fellow campus students.
        </p>
      </div>

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

      {/* Grid: Form (Left) & Preview (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Form */}
        <div className="card" style={{ padding: '28px', background: '#ffffff' }}>
          <form onSubmit={handleSubmit}>
            
            <div className="form-group">
              <label className="form-label">Task Title *</label>
              <input
                type="text"
                placeholder="e.g. Build an Interactive React Visualization for Sorting Algorithms"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Academic Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-control"
                required
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Requirements & Scope *</label>
              <textarea
                placeholder="Describe what needs to be delivered, any specific frameworks/tools, and grading criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-control"
                style={{ minHeight: '120px' }}
                required
              />
            </div>

            {/* Financials & Deadline Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label className="form-label">Stipend Amount (₹) *</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                  className="form-control"
                  required
                />
              </div>

              <div>
                <label className="form-label">Target Deadline *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>

            {/* Required Skills Selection */}
            <div className="form-group">
              <label className="form-label">Required Skills (Click to select)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {availableSkills.slice(0, 15).map((sk) => {
                  const isSelected = selectedSkills.includes(sk.skill_name);
                  return (
                    <button
                      key={sk.skill_id}
                      type="button"
                      onClick={() => toggleSkill(sk.skill_name)}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      {isSelected && <Check size={12} style={{ marginRight: '4px' }} />}
                      <span>{sk.skill_name}</span>
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder="Or type custom skill and press Enter..."
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={handleAddCustomSkill}
                className="form-control"
                style={{ fontSize: '13px' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', marginTop: '12px', justifyContent: 'center' }}
            >
              <PlusCircle size={15} />
              <span>{submitting ? 'Publishing...' : 'Publish micro-task'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Card Preview */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
            Live card preview
          </div>

          <div className="card" style={{ padding: '24px', background: '#ffffff', border: '1px solid var(--border-medium)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="badge badge-accent">
                {categories.find(c => c.category_id === categoryId)?.category_name || 'Category'}
              </span>
              <span className="badge badge-success">Open for bids</span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '8px' }}>
              {title || 'Task title preview'}
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              {description ? description.slice(0, 120) + (description.length > 120 ? '...' : '') : 'Task requirements and deliverable specifications will appear here for student freelancers.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {selectedSkills.length > 0 ? (
                selectedSkills.map((s, i) => (
                  <span key={i} className="badge">
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No required skills selected</span>
              )}
            </div>

            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stipend</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{Number(budget || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Due {deadline || 'In 5 days'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

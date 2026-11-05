'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/api';
import { 
  User, 
  GraduationCap, 
  IndianRupee, 
  Star, 
  CheckCircle, 
  PlusCircle, 
  Trash2, 
  Briefcase, 
  Layers, 
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [catalogSkills, setCatalogSkills] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [assignedContracts, setAssignedContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  // Add skill state
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState('INTERMEDIATE');
  const [yearsExp, setYearsExp] = useState(1);
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillMsg, setSkillMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  async function loadDashboardData() {
    try {
      const skills = await apiRequest('/users/catalog/skills');
      setCatalogSkills(skills);
      if (skills.length > 0) {
        setSelectedSkillId(skills[0].skill_id);
      }

      loadRecommendations();
      loadAssignedContracts();
    } catch (err) {
      console.warn('Dashboard catalog loading error:', err);
    }
  }

  async function loadAssignedContracts() {
    setLoadingContracts(true);
    try {
      const list = await apiRequest('/assignments/my/assigned');
      setAssignedContracts(list || []);
    } catch (err) {
      console.warn('Dashboard assigned contracts error:', err);
    } finally {
      setLoadingContracts(false);
    }
  }

  async function loadRecommendations() {
    setLoadingRecs(true);
    try {
      const recs = await apiRequest('/recommendations/tasks?limit=4');
      setRecommendations(recs);
    } catch (err) {
      console.warn('Dashboard recommendations error:', err);
    } finally {
      setLoadingRecs(false);
    }
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSkillId) return;

    setAddingSkill(true);
    setSkillMsg(null);
    try {
      await apiRequest('/users/skills', {
        method: 'POST',
        body: JSON.stringify({
          skill_id: selectedSkillId,
          proficiency_level: proficiency,
          years_experience: Number(yearsExp)
        })
      });

      setSkillMsg('Skill added to your profile!');
      await refreshProfile();
      await loadRecommendations();
    } catch (err: any) {
      setSkillMsg(err.message || 'Failed to add skill.');
    } finally {
      setAddingSkill(false);
    }
  }

  async function handleRemoveSkill(userSkillId: string) {
    if (!confirm('Remove this skill from your profile?')) return;

    try {
      await apiRequest(`/users/skills/${userSkillId}`, {
        method: 'DELETE'
      });
      await refreshProfile();
      await loadRecommendations();
    } catch (err: any) {
      alert(err.message || 'Failed to remove skill.');
    }
  }

  if (authLoading || !user) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
        <div>Loading your student dashboard...</div>
      </div>
    );
  }

  const userSkills = user.skills || [];
  const repScore = Number(user.reputation_score || 5.0).toFixed(1);

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* 1. Student Identity Banner */}
      <div className="card" style={{ padding: '28px', background: '#ffffff', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#eff6ff',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '18px'
            }}>
              {user.name.charAt(0)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-prominent)', margin: 0 }}>
                  {user.name}
                </h1>
                <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                  {user.role}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {user.college || 'PES University'} • {user.department || 'Computer Science'} • {user.email}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reputation</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px', fontVariantNumeric: 'tabular-nums' }}>
                <Star size={15} fill="#d97706" />
                <span>{repScore}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Earnings</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                ₹{Number(user.total_earnings || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completed</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {user.tasks_completed || 0}
              </div>
            </div>
          </div>

        </div>

        {/* Quick Links Row */}
        <div style={{
          display: 'flex',
          gap: '12px',
          paddingTop: '20px',
          marginTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap'
        }}>
          <Link href="/my-tasks" className="btn btn-outline btn-sm">
            <Layers size={14} />
            <span>My published tasks</span>
          </Link>
          <Link href="/my-applications" className="btn btn-outline btn-sm">
            <FileText size={14} />
            <span>My proposals and bids</span>
          </Link>
          <Link href="/tasks/create" className="btn btn-primary btn-sm">
            <PlusCircle size={14} />
            <span>Post a task</span>
          </Link>
        </div>
      </div>

      {/* 2. Active Contracts & Deliverables (Hiree Workspace Hub) */}
      <div className="card" style={{ padding: '28px', background: '#ffffff', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-prominent)', margin: 0 }}>
                Active contracts and deliverables
              </h2>
              <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                {assignedContracts.length} Assigned
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Contracts where you are hired to deliver work. Track milestones and submit your deliverables for escrow release.
            </p>
          </div>

          <Link href="/my-applications" className="btn btn-outline btn-sm">
            <FileText size={13} />
            <span>View All Bids</span>
          </Link>
        </div>

        {loadingContracts ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '10px' }} />
            <div>Loading your contracts...</div>
          </div>
        ) : assignedContracts.length === 0 ? (
          <div style={{
            padding: '28px 20px',
            textAlign: 'center',
            background: 'var(--canvas-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--border-subtle)'
          }}>
            <Briefcase size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '4px' }}>
              No Active Contracts In Progress
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 16px' }}>
              When a client accepts your bid, your 1:1 Contract Workspace will appear here so you can update progress and submit your deliverables.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Link href="/tasks" className="btn btn-primary btn-sm">
                <span>Browse Open Tasks</span>
              </Link>
              <Link href="/my-applications" className="btn btn-outline btn-sm">
                <span>Check Submitted Bids</span>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {assignedContracts.map((c) => (
              <div 
                key={c.assignment_id} 
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--canvas-base)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-accent" style={{ fontSize: '11px' }}>
                      {c.category_name || 'Micro-Task'}
                    </span>
                    <span className={`badge ${
                      c.status === 'COMPLETED' ? 'badge-success' :
                      c.status === 'SUBMITTED' ? 'badge-accent' : 'badge-primary'
                    }`} style={{ fontSize: '10px' }}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-prominent)', margin: '0 0 6px 0' }}>
                    <Link href={`/tasks/${c.task_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {c.task_title}
                    </Link>
                  </h3>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Client: <strong>{c.owner_name}</strong> • {c.owner_college}
                  </div>
                </div>

                <div>
                  {/* Progress Meter */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Contract Progress</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-prominent)' }}>{c.progress_percentage || 0}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(5, c.progress_percentage || 0))}%`,
                        background: c.status === 'COMPLETED' ? 'var(--accent-success)' : 'var(--brand-primary)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Stipend</span>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Number(c.task_budget).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <Link href={`/assignments/${c.assignment_id}`} className="btn btn-primary btn-sm">
                      <span>Open workspace</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Skills Portfolio & Recommendations Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '28px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Verified Skills Portfolio */}
        <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '14px' }}>
            Verified skills portfolio
          </h3>

          {skillMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: '#eff6ff',
              color: 'var(--brand-primary)',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {skillMsg}
            </div>
          )}

          {/* Current Skills Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {userSkills.length > 0 ? (
              userSkills.map((sk: any) => (
                <span key={sk.user_skill_id || sk.skill_name} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  background: 'var(--canvas-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--text-prominent)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <span>{sk.skill_name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({sk.proficiency_level})</span>
                  <button
                    onClick={() => handleRemoveSkill(sk.user_skill_id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                    title="Remove skill"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                No skills added yet. Add your technical competencies below to unlock personalized recommendations.
              </p>
            )}
          </div>

          {/* Add Skill Form */}
          <form onSubmit={handleAddSkill} style={{
            padding: '16px',
            background: 'var(--canvas-base)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '10px' }}>
              Add skill to profile
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="form-control"
                style={{ height: '38px', fontSize: '13px' }}
              >
                {catalogSkills.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>
                    {s.skill_name}
                  </option>
                ))}
              </select>

              <select
                value={proficiency}
                onChange={(e) => setProficiency(e.target.value)}
                className="form-control"
                style={{ height: '38px', fontSize: '13px' }}
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={addingSkill}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {addingSkill ? 'Saving...' : 'Add skill'}
            </button>
          </form>
        </div>

        {/* Right Column: Recommendations Feed */}
        <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-prominent)', margin: 0 }}>
              Recommended for you
            </h3>
            <Link href="/recommendations" style={{ fontSize: '12px', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 500 }}>
              View all matches →
            </Link>
          </div>

          {loadingRecs ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
              Finding matching micro-tasks...
            </div>
          ) : recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              No matches found. Add more skills to your profile to get personalized recommendations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recommendations.map((rec) => (
                <div key={rec.task_id} style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--canvas-base)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <Link href={`/tasks/${rec.task_id}`} style={{ fontWeight: 600, color: 'var(--text-prominent)', fontSize: '14px', textDecoration: 'none' }}>
                      {rec.title}
                    </Link>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Number(rec.budget).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {rec.category_name} • By {rec.owner_name}
                    </span>
                    <Link href={`/tasks/${rec.task_id}`} className="btn btn-outline btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }}>
                      View task
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

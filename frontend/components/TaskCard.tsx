'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

export interface TaskItem {
  task_id: string;
  title: string;
  description: string;
  required_skills: string;
  budget: string | number;
  deadline: string;
  status: string;
  category_name: string;
  owner_name: string;
  owner_college: string;
  application_count?: number;
  match_score_percentage?: string | number;
}

export default function TaskCard({ task }: { task: TaskItem }) {
  const formattedBudget = Number(task.budget).toLocaleString('en-IN');
  
  const deadlineDate = task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  }) : 'Flexible';

  const skillsList = task.required_skills 
    ? task.required_skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const statusClass = 
    task.status === 'OPEN' ? 'badge-success' :
    task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' ? 'badge-primary' :
    task.status === 'COMPLETED' ? 'badge-accent' : 'badge-danger';

  return (
    <Link href={`/tasks/${task.task_id}`} style={{ display: 'block', height: '100%', textDecoration: 'none' }}>
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '20px',
        position: 'relative',
        borderRadius: 'var(--radius-md)',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
      }}>
        
        <div>
          {/* Category & Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--canvas-subtle)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)'
            }}>
              {task.category_name}
            </span>
            <span className={`badge ${statusClass}`} style={{ fontSize: '11px' }}>
              {task.status.replace('_', ' ')}
            </span>
          </div>

          {/* Title */}
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            marginBottom: '6px',
            lineHeight: 1.35,
            color: 'var(--text-prominent)'
          }}>
            {task.title}
          </h3>

          {/* Description */}
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginBottom: '14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5
          }}>
            {task.description}
          </p>

          {/* Required Skills Chips */}
          {skillsList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '16px' }}>
              {skillsList.slice(0, 3).map((skill, i) => (
                <span key={i} style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'var(--canvas-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {skill}
                </span>
              ))}
              {skillsList.length > 3 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  +{skillsList.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Match Score if present */}
          {task.match_score_percentage !== undefined && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              background: '#eff6ff',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--brand-primary)',
              marginBottom: '14px'
            }}>
              <span>{task.match_score_percentage}% Skill Affinity</span>
            </div>
          )}
        </div>

        {/* Bottom Card Footer */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Stipend
            </div>
            <div style={{
              fontSize: '17px',
              fontWeight: 800,
              color: 'var(--text-prominent)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-mono)'
            }}>
              ₹{formattedBudget}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              <Calendar size={12} color="var(--text-muted)" />
              <span>Due {deadlineDate}</span>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '2px',
              justifyContent: 'flex-end'
            }}>
              <MapPin size={11} color="var(--brand-primary)" />
              <span>{task.owner_college || 'PES University'}</span>
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}

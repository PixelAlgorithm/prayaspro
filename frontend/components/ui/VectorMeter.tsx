'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface VectorMeterProps {
  matchPercentage: number | string;
  cosineDistance?: number;
  label?: string;
  showFormula?: boolean;
}

export default function VectorMeter({
  matchPercentage,
  cosineDistance,
  label = 'pgvector Semantic Similarity',
  showFormula = false,
}: VectorMeterProps) {
  const numericScore = Math.min(100, Math.max(0, Number(matchPercentage) || 0));
  
  // Format distance cleanly if provided
  const formattedDistance = cosineDistance !== undefined 
    ? Number(cosineDistance).toFixed(4)
    : undefined;

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: '10px',
      background: 'rgba(56, 189, 248, 0.05)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 600,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
          <Sparkles size={14} />
          <span>{label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {formattedDistance !== undefined && (
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              d: {formattedDistance}
            </span>
          )}
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            color: '#ffffff',
            fontFamily: 'var(--font-mono)',
          }}>
            {numericScore}% Match
          </span>
        </div>
      </div>

      {/* Progress Track & Fill */}
      <div className="match-bar" style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)' }}>
        <div
          className="match-bar-fill"
          style={{
            width: `${numericScore}%`,
            background: numericScore >= 70
              ? 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)'
              : numericScore >= 40
              ? 'linear-gradient(90deg, #f59e0b 0%, #38bdf8 100%)'
              : 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)',
          }}
        />
      </div>

      {showFormula && (
        <div style={{
          marginTop: '8px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>Metric: Cosine Distance (&lt;=&gt;)</span>
          <span>Score = (1.0 - d) × 100%</span>
        </div>
      )}
    </div>
  );
}

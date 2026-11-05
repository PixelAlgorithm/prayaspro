'use client';

import React from 'react';
import { Sliders } from 'lucide-react';

interface VectorMeterProps {
  matchPercentage: number | string;
  cosineDistance?: number;
  label?: string;
  showFormula?: boolean;
}

export default function VectorMeter({
  matchPercentage,
  cosineDistance,
  label = 'pgvector semantic similarity',
  showFormula = false,
}: VectorMeterProps) {
  const numericScore = Math.min(100, Math.max(0, Number(matchPercentage) || 0));
  
  const formattedDistance = cosineDistance !== undefined 
    ? Number(cosineDistance).toFixed(4)
    : undefined;

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--canvas-subtle)',
      border: '1px solid var(--border-subtle)',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 500,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <Sliders size={13} color="var(--text-muted)" />
          <span>{label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {formattedDistance !== undefined && (
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              d: {formattedDistance}
            </span>
          )}
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--brand-primary)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {numericScore}% match
          </span>
        </div>
      </div>

      {/* Progress Track & Fill (Solid accent, no hue gradients) */}
      <div style={{ height: '6px', background: 'var(--border-hairline)', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${numericScore}%`,
            background: numericScore >= 70 ? 'var(--brand-primary)' : 'var(--text-muted)',
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      {showFormula && (
        <div style={{
          marginTop: '8px',
          paddingTop: '6px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>Metric: Cosine distance (&lt;=&gt;)</span>
          <span>Score = (1.0 - d) × 100%</span>
        </div>
      )}
    </div>
  );
}

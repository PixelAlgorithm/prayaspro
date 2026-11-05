'use client';

import React, { useState } from 'react';
import { Database, Copy, Check, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface DbTelemetryCardProps {
  title: string;
  concept?: string;
  vivaConcept?: string;
  sql: string;
  executionTimeMs?: number;
  rowCount?: number;
  rowsAffected?: number;
  defaultExpanded?: boolean;
  notes?: string;
}

export default function DbTelemetryCard({
  title,
  concept,
  vivaConcept,
  sql,
  executionTimeMs,
  rowCount,
  rowsAffected,
  defaultExpanded = false,
  notes,
}: DbTelemetryCardProps) {
  const activeConcept = concept || vivaConcept || 'Relational SQL';
  const activeRowCount = rowCount !== undefined ? rowCount : rowsAffected;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sql.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      margin: '16px 0',
      transition: 'border-color 0.15s ease',
    }}>
      {/* Header Bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--canvas-subtle)',
          borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-primary)',
          }}>
            <Database size={13} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-prominent)' }}>
                {title}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'var(--surface-raised)',
                padding: '2px 7px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
              }}>
                {activeConcept}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {executionTimeMs !== undefined && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--brand-emerald)',
              background: '#ecfdf5',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid #a7f3d0',
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <Clock size={11} />
              <span>{executionTimeMs.toFixed(2)} ms</span>
            </span>
          )}

          {activeRowCount !== undefined && (
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {activeRowCount} rows
            </span>
          )}

          <button
            onClick={handleCopy}
            title="Copy SQL to clipboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              padding: '4px 8px',
              fontSize: '11px',
              color: copied ? 'var(--brand-emerald)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'SQL'}</span>
          </button>

          {expanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Expanded Code & Notes Body */}
      {expanded && (
        <div style={{ padding: '16px' }}>
          {notes && (
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              marginBottom: '12px',
              padding: '8px 12px',
              background: 'var(--canvas-subtle)',
              borderRadius: 'var(--radius-xs)',
              borderLeft: '2px solid var(--brand-primary)',
            }}>
              {notes}
            </p>
          )}

          <div style={{
            background: '#0f172a',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-xs)',
            padding: '12px 14px',
            overflowX: 'auto',
          }}>
            <pre style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#e2e8f0',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              <code>{sql.trim()}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

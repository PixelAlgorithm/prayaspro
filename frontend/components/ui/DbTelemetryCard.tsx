'use client';

import React, { useState } from 'react';
import { Database, Terminal, Check, Copy, ChevronDown, ChevronUp, Cpu, ShieldCheck } from 'lucide-react';

interface DbTelemetryCardProps {
  title: string;
  concept?: string; // e.g. "ACID Transaction (Row-Lock FOR UPDATE)", "pgvector Cosine Distance (<=>)"
  vivaConcept?: string; // alias for concept
  sql: string;
  executionTimeMs?: number;
  rowCount?: number;
  rowsAffected?: number; // alias for rowCount
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
      background: 'rgba(8, 12, 20, 0.95)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      margin: '16px 0',
      transition: 'border-color 0.2s ease',
    }}>
      {/* Header Bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderBottom: expanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
          }}>
            <Database size={14} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                {title}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                color: '#38bdf8',
                background: 'rgba(2, 132, 199, 0.18)',
                padding: '2px 7px',
                borderRadius: '4px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
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
              fontSize: '11px',
              fontWeight: 600,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontFamily: 'var(--font-mono)',
            }}>
              ⚡ {executionTimeMs.toFixed(2)} ms
            </span>
          )}

          {activeRowCount !== undefined && (
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {activeRowCount} rows
            </span>
          )}

          <button
            onClick={handleCopy}
            title="Copy SQL to Clipboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '11px',
              color: copied ? '#34d399' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'SQL'}</span>
          </button>

          {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Expanded Code & Viva Notes Body */}
      {expanded && (
        <div style={{ padding: '16px' }}>
          {notes && (
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '12px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '6px',
              borderLeft: '3px solid #38bdf8',
            }}>
              {notes}
            </p>
          )}

          <div style={{
            background: '#04060a',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
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

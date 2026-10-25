'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  Database, 
  Code2, 
  Clock, 
  Sparkles, 
  CheckCircle, 
  ArrowRight,
  RefreshCw,
  Terminal,
  Play
} from 'lucide-react';
import DbTelemetryCard from '@/components/ui/DbTelemetryCard';

export default function DbShowcasePage() {
  const [demos, setDemos] = useState<any[]>([]);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('join_group_by_having');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Ad-hoc EXPLAIN ANALYZE state
  const [explainSql, setExplainSql] = useState<string>(
    `SELECT t.task_id, t.title, t.budget, c.category_name, u.name as owner_name\nFROM tasks t\nJOIN categories c ON t.category_id = c.category_id\nJOIN users u ON t.owner_id = u.user_id\nWHERE t.status = 'OPEN'\nORDER BY t.budget DESC;`
  );
  const [explainPlan, setExplainPlan] = useState<any>(null);
  const [analyzingPlan, setAnalyzingPlan] = useState(false);

  useEffect(() => {
    loadDemos();
  }, []);

  async function loadDemos() {
    setLoading(true);
    try {
      const data = await apiRequest('/db-showcase/demonstrations');
      setDemos(data);
      if (data.length > 0 && !selectedDemoId) {
        setSelectedDemoId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching database demonstrations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshDemos() {
    setRefreshing(true);
    try {
      const data = await apiRequest('/db-showcase/demonstrations');
      setDemos(data);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRunExplain() {
    if (!explainSql.trim()) return;
    setAnalyzingPlan(true);
    try {
      const res = await apiRequest('/db-showcase/explain', {
        method: 'POST',
        body: JSON.stringify({ sql: explainSql })
      });
      setExplainPlan(res.plan);
    } catch (err: any) {
      alert(err.message || 'Failed to explain query');
    } finally {
      setAnalyzingPlan(false);
    }
  }

  const currentDemo = demos.find((d) => d.id === selectedDemoId) || demos[0];

  return (
    <div className="container" style={{ padding: '36px 0 80px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: '#eff6ff', color: 'var(--brand-primary)', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            <Database size={13} />
            <span>Academic Architecture</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-prominent)', marginBottom: '4px' }}>
            Database Architecture & SQL Demonstrations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '720px', margin: 0 }}>
            Technical demonstration interface for PostgreSQL relational queries, triggers, ACID transactions, analytical views, and pgvector cosine distance.
          </p>
        </div>

        <button 
          onClick={handleRefreshDemos} 
          disabled={refreshing}
          className="btn btn-outline btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} />
          <span>{refreshing ? 'Executing Queries...' : 'Re-Execute Queries'}</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {demos.map((demo) => {
          const isActive = demo.id === selectedDemoId;
          return (
            <button
              key={demo.id}
              onClick={() => setSelectedDemoId(demo.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                background: isActive ? '#eff6ff' : 'transparent',
                border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {demo.title}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '14px' }} />
          <div>Connecting to PostgreSQL query engine...</div>
        </div>
      ) : currentDemo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>{currentDemo.concept}</span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-prominent)', margin: 0 }}>
                  {currentDemo.title}
                </h2>
              </div>

              {currentDemo.executionTimeMs && (
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-emerald)', fontFamily: 'var(--font-mono)' }}>
                  ⚡ {currentDemo.executionTimeMs.toFixed(2)} ms latency
                </span>
              )}
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.6 }}>
              {currentDemo.description}
            </p>

            {/* SQL Code Block */}
            <div style={{
              background: '#0f172a',
              borderRadius: 'var(--radius-sm)',
              padding: '16px 20px',
              overflowX: 'auto',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                SQL Definition
              </div>
              <pre style={{
                margin: 0,
                color: '#f8fafc',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.55
              }}>
                {currentDemo.sql}
              </pre>
            </div>

            {/* Results Table */}
            {currentDemo.result && Array.isArray(currentDemo.result) && currentDemo.result.length > 0 ? (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '10px' }}>
                  Execution Result ({currentDemo.result.length} rows)
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: 'var(--canvas-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <tr>
                        {Object.keys(currentDemo.result[0]).map((col) => (
                          <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDemo.result.map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--canvas-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-muted)' }}>
                Query executed successfully. (0 rows returned or DDL definition)
              </div>
            )}
          </div>

          {/* Interactive EXPLAIN ANALYZE Planner */}
          <div className="card" style={{ padding: '24px', background: '#ffffff' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '6px' }}>
              Query Cost Planner (EXPLAIN ANALYZE)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Execute ad-hoc SELECT queries to inspect the PostgreSQL cost optimizer, index scans, and join strategies.
            </p>

            <textarea
              value={explainSql}
              onChange={(e) => setExplainSql(e.target.value)}
              className="form-control"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', minHeight: '90px', marginBottom: '12px' }}
            />

            <button
              onClick={handleRunExplain}
              disabled={analyzingPlan}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
            >
              <Play size={13} />
              <span>{analyzingPlan ? 'Analyzing Query...' : 'Run EXPLAIN ANALYZE'}</span>
            </button>

            {explainPlan && (
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
                <pre style={{ margin: 0, color: '#f8fafc', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  {JSON.stringify(explainPlan, null, 2)}
                </pre>
              </div>
            )}
          </div>

        </div>
      ) : null}

    </div>
  );
}

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      background: '#ffffff',
      padding: '48px 0 28px 0',
      marginTop: '64px',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px',
          marginBottom: '40px'
        }}>
          {/* Brand Note */}
          <div style={{ gridColumn: 'span 1', minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px'
              }}>
                P
              </div>
              <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-prominent)' }}>
                Prayas<span style={{ color: 'var(--brand-primary)' }}>Pro</span>
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: 1.55 }}>
              Campus micro-task marketplace connecting university students for technical tasks, creative deliverables, and peer academic collaboration.
            </p>
          </div>

          {/* Marketplace Links */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Marketplace
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <li><Link href="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>Browse Tasks</Link></li>
              <li><Link href="/recommendations" style={{ color: 'inherit', textDecoration: 'none' }}>Skill Recommendations</Link></li>
              <li><Link href="/tasks/create" style={{ color: 'inherit', textDecoration: 'none' }}>Post a Task</Link></li>
              <li><Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Student Dashboard</Link></li>
            </ul>
          </div>

          {/* Partner Campuses */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Campus Network
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <li>PES University (RR & EC Campuses)</li>
              <li>RV College of Engineering</li>
              <li>BMS College of Engineering</li>
              <li>M.S. Ramaiah Institute of Technology</li>
            </ul>
          </div>

          {/* Resources & Academic Links */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resources
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <li><Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link></li>
              <li><Link href="/register" style={{ color: 'inherit', textDecoration: 'none' }}>Student Registration</Link></li>
              <li>
                <Link href="/db-showcase" style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 500 }}>
                  DBMS Academic Architecture
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            © 2026 PrayasPro • University Micro-Task Marketplace
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Verified Student Network</span>
            <span>•</span>
            <Link href="/db-showcase" style={{ color: 'inherit', textDecoration: 'none' }}>
              Database Console
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

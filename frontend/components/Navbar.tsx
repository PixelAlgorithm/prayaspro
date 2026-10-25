'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { 
  Briefcase, 
  Sparkles, 
  User, 
  LogOut, 
  Layers, 
  FileText,
  Menu,
  X,
  PlusCircle,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, quickLogin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);

  const navLinks = [
    { href: '/tasks', label: 'Explore Tasks' },
    { href: '/recommendations', label: 'Skill Match' },
  ];

  if (user) {
    navLinks.push({ href: '/tasks/create', label: 'Post a Task' });
    navLinks.push({ href: '/my-tasks', label: 'My Tasks' });
    navLinks.push({ href: '/my-applications', label: 'My Proposals' });
    if (user.role === 'ADMIN') {
      navLinks.push({ href: '/admin', label: 'Admin Deck' });
    }
  }

  const demoPersonas = [
    { name: 'Aarav (Task Poster)', email: 'aarav@pesu.edu', campus: 'PES University' },
    { name: 'Ananya (Worker / Bidder)', email: 'ananya@bmsce.edu', campus: 'BMSCE' },
    { name: 'Priya (Student / AI)', email: 'priya@pesu.edu', campus: 'PES University' },
    { name: 'Admin (System Supervisor)', email: 'admin@prayaspro.edu', campus: 'Campus Operations' },
  ];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '16px'
            }}>
              P
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-prominent)', letterSpacing: '-0.02em' }}>
              Prayas<span style={{ color: 'var(--brand-primary)' }}>Pro</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="desktop-nav" style={{ gap: '4px', alignItems: 'center' }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    background: isActive ? '#eff6ff' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Section: Persona Switcher & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Quick Persona Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 10px' }}
              title="Switch demo persona for testing"
            >
              <span>{user ? user.name.split(' ')[0] : 'Demo Profiles'}</span>
              <ChevronDown size={13} color="var(--text-muted)" />
            </button>

            {personaMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                padding: '6px',
                zIndex: 200
              }}>
                <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1-Click Test Personas
                </div>
                {demoPersonas.map((p) => (
                  <button
                    key={p.email}
                    onClick={() => {
                      quickLogin(p.email);
                      setPersonaMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: user?.email === p.email ? '#eff6ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: user?.email === p.email ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.campus}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Status / Actions */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href="/dashboard"
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <LayoutDashboard size={14} />
                <span className="hide-mobile">Dashboard</span>
              </Link>
              <button
                onClick={logout}
                className="btn btn-outline btn-sm"
                title="Sign out"
                style={{ padding: '6px 10px', color: 'var(--text-muted)' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link href="/login" className="btn btn-outline btn-sm">
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: pathname === link.href ? 'var(--brand-primary)' : 'var(--text-primary)',
                padding: '8px 0',
                textDecoration: 'none'
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        @media (min-width: 769px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Briefcase, 
  PlusCircle, 
  CheckCircle2, 
  Users, 
  Layers, 
  Sparkles,
  Calendar,
  MapPin
} from 'lucide-react';
import TaskCard, { TaskItem } from '@/components/TaskCard';

// Fetch real marketplace tasks directly on the server for fast, SEO-friendly SSR
async function getMarketplaceData() {
  const backendPort = process.env.BACKEND_PORT || 5001;
  try {
    const [tasksRes, statsRes] = await Promise.all([
      fetch(`http://localhost:${backendPort}/api/tasks?limit=6`, { cache: 'no-store' }),
      fetch(`http://localhost:${backendPort}/api/health`, { cache: 'no-store' }),
    ]);

    const tasks = tasksRes.ok ? await tasksRes.json() : [];
    const health = statsRes.ok ? await statsRes.json() : null;

    return { tasks, health };
  } catch (err) {
    return { tasks: [], health: null };
  }
}

export default async function HomePage() {
  const { tasks, health } = await getMarketplaceData();
  const dbInfo = health?.database;
  const featuredTask = tasks && tasks.length > 0 ? (tasks.find((t: any) => t.status === 'OPEN') || tasks[0]) : null;

  return (
    <div>
      
      {/* 1. Asymmetric Editorial Hero Section */}
      <section style={{
        padding: '64px 0 56px 0',
        background: '#ffffff',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '48px',
            alignItems: 'center'
          }}>
            
            {/* Left Column: Core Value Proposition */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                background: '#eff6ff',
                color: 'var(--brand-primary)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '20px'
              }}>
                <span>University Student Talent Network</span>
              </div>

              <h1 style={{
                fontSize: '44px',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: 'var(--text-prominent)',
                marginBottom: '18px'
              }}>
                Where student talent delivers campus work.
              </h1>

              <p style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '28px',
                maxWidth: '520px'
              }}>
                PrayasPro connects engineering and university students for technical micro-tasks, research formatting, design deliverables, and peer collaboration.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <Link href="/tasks" className="btn btn-primary btn-lg">
                  <span>Browse Tasks</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/tasks/create" className="btn btn-outline btn-lg">
                  <PlusCircle size={16} />
                  <span>Post a Task</span>
                </Link>
              </div>

              {/* Campus Community Strip */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                  Students participating from campuses including:
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span>PES University</span>
                  <span>•</span>
                  <span>RVCE</span>
                  <span>•</span>
                  <span>BMSCE</span>
                  <span>•</span>
                  <span>Ramaiah MSRIT</span>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Task Preview Card (Real Data from PostgreSQL) */}
            <div>
              {featuredTask ? (
                <div style={{
                  background: 'var(--canvas-base)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="badge badge-accent">{featuredTask.category_name || 'Technical Task'}</span>
                    <span className={`badge ${featuredTask.status === 'OPEN' ? 'badge-success' : 'badge-neutral'}`}>
                      {featuredTask.status === 'OPEN' ? 'Open for Bids' : featuredTask.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-prominent)' }}>
                    {featuredTask.title}
                  </h3>

                  <p style={{ 
                    fontSize: '14px', 
                    color: 'var(--text-secondary)', 
                    lineHeight: 1.6, 
                    marginBottom: '20px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {featuredTask.description}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {featuredTask.required_skills ? (
                      featuredTask.required_skills.split(',').slice(0, 3).map((skill: string, idx: number) => (
                        <span key={idx} className="badge">
                          {skill.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="badge">{featuredTask.category_name}</span>
                    )}
                    {featuredTask.owner_college && (
                      <span className="badge" style={{ background: '#f1f5f9' }}>
                        {featuredTask.owner_college}
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stipend</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)' }}>
                        ₹{Number(featuredTask.budget || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <Link href={`/tasks/${featuredTask.task_id}`} className="btn btn-primary btn-sm">
                      <span>Inspect Task</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--canvas-base)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px',
                  boxShadow: 'var(--shadow-md)',
                  textAlign: 'center'
                }}>
                  <Briefcase size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-prominent)' }}>
                    Ready for the First Task
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Publish a micro-task on the student network to connect with skilled campus peers.
                  </p>
                  <Link href="/tasks/create" className="btn btn-primary btn-sm">
                    <PlusCircle size={14} />
                    <span>Post a Task</span>
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* 2. Platform Summary Strip - Sourced directly from PostgreSQL */}
      {dbInfo && (
        <section style={{ padding: '32px 0', background: 'var(--canvas-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '24px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)' }}>
                  {dbInfo.total_tasks || '0'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Live Tasks in Database
                </div>
              </div>

              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)' }}>
                  {dbInfo.total_users || '0'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Registered Student Profiles
                </div>
              </div>

              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-prominent)', fontFamily: 'var(--font-mono)' }}>
                  {dbInfo.total_embeddings || '0'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Semantic Embeddings Indexed
                </div>
              </div>

              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                  Active
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Campus Peer Marketplace
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. The 4-Step Student Workflow */}
      <section style={{ padding: '64px 0', background: '#ffffff', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ marginBottom: '40px', maxWidth: '640px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              How PrayasPro Works
            </span>
            <h2 style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: 'var(--text-prominent)' }}>
              From task posting to completed deliverable
            </h2>
            <p style={{ marginTop: '8px', fontSize: '15px' }}>
              A straightforward, transparent process designed around student schedules and academic milestones.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px'
          }}>
            {[
              {
                step: '01',
                title: 'Post Your Task',
                desc: 'Describe what you need done, set your budget stipend, and define the delivery deadline.'
              },
              {
                step: '02',
                title: 'Review Peer Bids',
                desc: 'Students with matching skills submit proposals with estimated completion time and pitch.'
              },
              {
                step: '03',
                title: '1:1 Work Workspace',
                desc: 'Once accepted, work together in a dedicated deal room with milestone progress tracking.'
              },
              {
                step: '04',
                title: 'Deliver & Settle',
                desc: 'Review submitted project deliverables, complete payout settlement, and exchange ratings.'
              }
            ].map((item) => (
              <div key={item.step} style={{
                padding: '24px',
                borderLeft: '2px solid var(--brand-primary)',
                background: 'var(--canvas-base)',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-prominent)', marginBottom: '6px' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Latest Campus Tasks Grid */}
      <section style={{ padding: '64px 0', background: 'var(--canvas-base)' }}>
        <div className="container">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Campus Marketplace
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: 'var(--text-prominent)' }}>
                Latest Micro-Tasks
              </h2>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>
                Open opportunities looking for skilled student collaborators.
              </p>
            </div>

            <Link href="/tasks" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>View All Tasks</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {tasks && tasks.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {tasks.map((task: TaskItem) => (
                <TaskCard key={task.task_id} task={task} />
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '48px', textAlign: 'center', background: '#ffffff' }}>
              <Briefcase size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No tasks currently open</h3>
              <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
                Be the first to publish a micro-task on the student network and collaborate with campus peers.
              </p>
              <Link href="/tasks/create" className="btn btn-primary">
                <PlusCircle size={15} />
                <span>Post a Micro-Task</span>
              </Link>
            </div>
          )}

        </div>
      </section>

    </div>
  );
}

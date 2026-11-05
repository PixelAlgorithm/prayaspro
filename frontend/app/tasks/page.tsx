'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import TaskCard, { TaskItem } from '@/components/TaskCard';
import { Search, Filter, SlidersHorizontal, PlusCircle, RotateCcw, Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('OPEN');
  const [minBudget, setMinBudget] = useState<number>(0);
  const [useVectorMatch, setUseVectorMatch] = useState<boolean>(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedCategory, selectedStatus, minBudget, useVectorMatch]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/users/catalog/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchTasks() {
    setLoading(true);
    try {
      if (useVectorMatch && user) {
        let url = `/api/recommendations/tasks?limit=30`;
        if (selectedCategory) url += `&categoryId=${selectedCategory}`;
        if (minBudget > 0) url += `&minBudget=${minBudget}`;
        
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('prayaspro_token')}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } else {
        let url = `/api/tasks?limit=50`;
        if (selectedCategory) url += `&categoryId=${selectedCategory}`;
        if (selectedStatus && selectedStatus !== 'ALL') url += `&status=${selectedStatus}`;
        if (minBudget > 0) url += `&minBudget=${minBudget}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchTasks();
  }

  return (
    <div className="container" style={{ padding: '40px 0 80px' }}>
      
      {/* 1. Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '6px' }}>
            Campus task marketplace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px', margin: 0 }}>
            Discover student projects, technical assignments, and peer work opportunities across partner university departments.
          </p>
        </div>

        <Link href="/tasks/create" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={15} />
          <span>Post a task</span>
        </Link>
      </div>

      {/* 2. Search & Filter Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Search Input Row */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search tasks by title, skill, or keyword"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
            Search
          </button>
        </form>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '36px' }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '36px' }}
            >
              <option value="OPEN">Open for bids</option>
              <option value="ALL">All statuses</option>
              <option value="ASSIGNED">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Minimum Stipend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Min stipend:</span>
            <select
              value={minBudget}
              onChange={(e) => setMinBudget(Number(e.target.value))}
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '36px' }}
            >
              <option value={0}>Any amount</option>
              <option value={500}>₹500+</option>
              <option value={1000}>₹1,000+</option>
              <option value={2000}>₹2,000+</option>
              <option value={5000}>₹5,000+</option>
            </select>
          </div>

          {/* AI Skill Match Switch (for logged-in users) */}
          {user && (
            <button
              type="button"
              onClick={() => setUseVectorMatch(!useVectorMatch)}
              className={`btn ${useVectorMatch ? 'btn-primary' : 'btn-outline'} btn-sm`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
            >
              <SlidersHorizontal size={13} />
              <span>{useVectorMatch ? 'Skill match active' : 'Match my skills'}</span>
            </button>
          )}

        </div>
      </div>

      {/* 3. Task Results List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-medium)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '14px' }} />
          <div style={{ fontSize: '14px' }}>Loading matching opportunities...</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 20px', background: '#ffffff' }}>
          <Briefcase size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-prominent)', marginBottom: '6px' }}>
            No tasks found matching your filters
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Try broadening your search term, resetting the category filter, or reducing the minimum stipend requirement.
          </p>
          <button
            onClick={() => { setSelectedCategory(''); setSelectedStatus('OPEN'); setMinBudget(0); setSearch(''); setUseVectorMatch(false); }}
            className="btn btn-outline btn-sm"
          >
            <RotateCcw size={13} style={{ marginRight: '6px' }} />
            <span>Reset filters</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {tasks.map((task) => (
            <TaskCard key={task.task_id} task={task} />
          ))}
        </div>
      )}

    </div>
  );
}

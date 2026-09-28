import React, { useState, useEffect, useCallback } from 'react';
import { Visitor, VisitorFormData, VisitorStats, ReceptionUser } from './types/index.ts';
import { VisitorForm } from './components/VisitorForm.tsx';
import { VisitorTable } from './components/VisitorTable.tsx';
import { ReceptionLogin } from './components/ReceptionLogin.tsx';
import { ManageDesksModal } from './components/ManageDesksModal.tsx';
import {
  getVisitors,
  getVisitorStats,
  createVisitor,
  updateVisitor,
  deleteVisitor,
  getExportCsvUrl,
} from './services/api.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<ReceptionUser | null>(() => {
    try {
      const saved = localStorage.getItem('reception_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats>({ todayTotal: 0, totalVisitors: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [showDesksModal, setShowDesksModal] = useState<boolean>(false);

  // Simple alert message for feedback
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 3500);
  };

  const handleLoginSuccess = (user: ReceptionUser) => {
    setCurrentUser(user);
    localStorage.setItem('reception_user', JSON.stringify(user));
    showAlert(`Logged in to ${user.stationName} (${user.deskId})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('reception_user');
    showAlert('Logged out from reception desk');
  };

  // Fetch visitors and stats
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [visitorsList, statsData] = await Promise.all([
        getVisitors(searchQuery),
        getVisitorStats(),
      ]);
      setVisitors(visitorsList);
      setStats(statsData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      showAlert('Unable to reach server', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const delayTimer = setTimeout(() => {
        fetchData();
      }, 200);
      return () => clearTimeout(delayTimer);
    }
  }, [fetchData, currentUser]);

  // Handle Create or Update
  const handleSubmitForm = async (formData: VisitorFormData, idToEdit?: string) => {
    try {
      setSubmitting(true);
      if (idToEdit) {
        // Edit existing visitor
        const updated = await updateVisitor(idToEdit, formData);
        setVisitors((prev) => prev.map((v) => (v.id === idToEdit ? updated : v)));
        setEditingVisitor(null);
        showAlert(`Updated record for "${updated.name}"`);
      } else {
        // Add new visitor
        const created = await createVisitor({
          ...formData,
          registeredByDesk: currentUser?.deskId || 'admin',
        });
        setVisitors((prev) => [created, ...prev]);
        showAlert(`Registered visitor "${created.name}"`);
      }
      // Refresh dashboard stats
      const newStats = await getVisitorStats();
      setStats(newStats);
    } catch (err: any) {
      showAlert(err.message || 'Action failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteVisitor = async (id: string, name: string) => {
    const confirmed = window.confirm(`Delete visitor record for "${name}"?`);
    if (!confirmed) return;

    try {
      await deleteVisitor(id);
      setVisitors((prev) => prev.filter((v) => v.id !== id));
      showAlert(`Deleted visitor record for "${name}"`);
      const newStats = await getVisitorStats();
      setStats(newStats);
    } catch (err: any) {
      showAlert(err.message || 'Failed to delete record', 'error');
    }
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    const url = getExportCsvUrl(searchQuery);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `visitor-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('Visitor log downloaded as CSV');
  };

  // If receptionist is not logged in, show Login Screen
  if (!currentUser) {
    return <ReceptionLogin onLoginSuccess={handleLoginSuccess} />;
  }

  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold px-2 py-1 rounded">
              {currentUser.deskId.toUpperCase()}
            </span>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                Employee Visitor Registration System
              </h1>
              <p className="text-[11px] text-slate-400">
                {currentUser.stationName}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2.5">
            {/* Manage Multiple Desks Button */}
            <button
              type="button"
              onClick={() => setShowDesksModal(true)}
              className="text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded transition cursor-pointer font-medium"
              title="View, add, and manage reception desk accounts"
            >
              Manage Desks
            </button>

            <span className="text-slate-600 hidden sm:inline">|</span>

            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Operator: <strong>{currentUser.deskId}</strong></span>
            </span>

            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="font-mono text-[11px] hidden md:inline">{todayDateString}</span>

            <span className="text-slate-600">|</span>
            <button
              onClick={handleLogout}
              className="text-xs text-rose-300 hover:text-white hover:underline cursor-pointer font-medium"
              title="Log out of reception desk session"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Simple Notification Banner */}
        {alert && (
          <div
            className={`p-3 rounded text-xs font-medium border flex items-center justify-between transition-all ${
              alert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <span>{alert.message}</span>
            <button
              onClick={() => setAlert(null)}
              className="text-xs underline ml-2 font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Bonus Feature: Dashboard showing today's total visitors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today's Total Visitors */}
          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Total Visitors
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {stats.todayTotal}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Visitors registered today ({todayDateString})
            </p>
          </div>

          {/* Total Visitors in Database */}
          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Visitors
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {stats.totalVisitors}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              All records stored in register
            </p>
          </div>

          {/* System Date & Station */}
          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Current Reception Desk
            </p>
            <p className="text-base font-bold text-slate-800 mt-2 truncate">
              {currentUser.stationName}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Desk ID: <strong className="text-slate-700">{currentUser.deskId}</strong>
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Add / Edit Visitor Form (4 columns on desktop) */}
          <div className="lg:col-span-4">
            <VisitorForm
              onSubmit={handleSubmitForm}
              editingVisitor={editingVisitor}
              onCancelEdit={() => setEditingVisitor(null)}
              submitting={submitting}
            />
          </div>

          {/* Right Column: View / Search / Edit / Delete Table (8 columns on desktop) */}
          <div className="lg:col-span-8">
            <VisitorTable
              visitors={visitors}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onEdit={(visitor) => {
                setEditingVisitor(visitor);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onDelete={handleDeleteVisitor}
              onExportCsv={handleExportCsv}
              loading={loading}
            />
          </div>
        </div>
      </main>

      {/* Multiple Desks Management Modal */}
      <ManageDesksModal
        isOpen={showDesksModal}
        onClose={() => setShowDesksModal(false)}
        currentUser={currentUser}
        onSwitchUser={(_deskId) => {}}
      />

      {/* Standard Human Developer Footer */}
      <footer className="bg-white border-t border-slate-300 py-3 mt-auto text-center text-xs text-slate-500">
        Employee Visitor Registration System • Front Desk Portal
      </footer>
    </div>
  );
}

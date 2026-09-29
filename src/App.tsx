import React, { useState, useEffect, useCallback } from 'react';
import {
  Visitor,
  VisitorFormData,
  VisitorStats,
  VisitorStatus,
  ReceptionUser,
  DbStatus,
} from './types/index.ts';
import { VisitorForm } from './components/VisitorForm.tsx';
import { VisitorTable } from './components/VisitorTable.tsx';
import { ReceptionLogin } from './components/ReceptionLogin.tsx';
import { ManageDesksModal } from './components/ManageDesksModal.tsx';
import { DatabaseStatusModal } from './components/DatabaseStatusModal.tsx';
import {
  getVisitors,
  getVisitorStats,
  createVisitor,
  updateVisitor,
  deleteVisitor,
  checkOutVisitor,
  checkInVisitor,
  getExportCsvUrl,
  getDbStatus,
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
  const [stats, setStats] = useState<VisitorStats>({
    todayTotal: 0,
    totalVisitors: 0,
    currentlyInside: 0,
    checkedOutToday: 0,
  });
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VisitorStatus>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [showDesksModal, setShowDesksModal] = useState<boolean>(false);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);

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
      const [visitorsList, statsData, dbStatusData] = await Promise.all([
        getVisitors(searchQuery, statusFilter),
        getVisitorStats(),
        getDbStatus().catch(() => null),
      ]);
      setVisitors(visitorsList);
      setStats(statsData);
      if (dbStatusData) setDbStatus(dbStatusData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      showAlert('Unable to reach server', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentUser]);

  useEffect(() => {
    getDbStatus().then(setDbStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser) {
      const delayTimer = setTimeout(() => {
        fetchData();
      }, 200);
      return () => clearTimeout(delayTimer);
    }
  }, [fetchData, currentUser]);

  // Handle Check-Out
  const handleCheckOut = async (visitor: Visitor) => {
    try {
      setCheckingId(visitor.id);
      const updated = await checkOutVisitor(visitor.id, currentUser?.deskId);
      setVisitors((prev) => prev.map((v) => (v.id === visitor.id ? updated : v)));
      const newStats = await getVisitorStats();
      setStats(newStats);
      showAlert(`Visitor "${visitor.name}" checked out successfully`);
    } catch (err: any) {
      showAlert(err.message || 'Failed to check out visitor', 'error');
    } finally {
      setCheckingId(null);
    }
  };

  // Handle Re-Check-In
  const handleCheckIn = async (visitor: Visitor) => {
    try {
      setCheckingId(visitor.id);
      const updated = await checkInVisitor(visitor.id, currentUser?.deskId);
      setVisitors((prev) => prev.map((v) => (v.id === visitor.id ? updated : v)));
      const newStats = await getVisitorStats();
      setStats(newStats);
      showAlert(`Visitor "${visitor.name}" re-checked in successfully`);
    } catch (err: any) {
      showAlert(err.message || 'Failed to check in visitor', 'error');
    } finally {
      setCheckingId(null);
    }
  };

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
          status: 'CHECKED_IN',
        });
        setVisitors((prev) => [created, ...prev]);
        showAlert(`Checked in visitor "${created.name}"`);
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
    const url = getExportCsvUrl(searchQuery, statusFilter);
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
            {/* Database & Storage Status Button */}
            <button
              type="button"
              onClick={() => setShowDbModal(true)}
              className={`text-xs px-2.5 py-1 rounded transition cursor-pointer font-medium flex items-center gap-1.5 border ${
                dbStatus?.isConnected
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/70 hover:bg-amber-900'
              }`}
              title="Click to view live MongoDB connection details or connect MongoDB"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  dbStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
              <span>
                {dbStatus?.isConnected
                  ? `Live MongoDB: ${dbStatus.databaseName || 'visitor_db'} (${dbStatus.mongoVisitorCount})`
                  : 'MongoDB Not Connected (Click to Connect)'}
              </span>
            </button>

            <span className="text-slate-600 hidden sm:inline">|</span>

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

        {/* Live MongoDB Connection Banner */}
        {dbStatus?.isConnected ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <strong>LIVE MONGODB ACTIVE:</strong> All records are stored directly in live MongoDB database{' '}
                <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                  {dbStatus.databaseName || 'visitor_db'}
                </span>{' '}
                &gt; collection{' '}
                <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                  visitors
                </span>{' '}
                ({dbStatus.mongoVisitorCount} documents).
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDbModal(true)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer whitespace-nowrap"
            >
              MongoDB Settings &amp; Info ↗
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-300 rounded px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <div>
                <strong>STORE ONLY IN MONGODB LIVE DATA:</strong> MongoDB is not connected yet. Connect your MongoDB Atlas connection string to save all visitor logs directly to live MongoDB.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDbModal(true)}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded font-bold text-xs cursor-pointer whitespace-nowrap shadow-xs"
            >
              Connect Live MongoDB ↗
            </button>
          </div>
        )}

        {/* Check-In / Check-Out Metrics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Currently Inside Premises (Key Feature) */}
          <div className="bg-white border-2 border-emerald-500/80 rounded p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Currently Inside
              </p>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-3xl font-extrabold text-emerald-900 mt-1">
              {stats.currentlyInside}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Active visitors inside facility now
            </p>
          </div>

          {/* Today's Total Check-Ins */}
          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Check-Ins
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {stats.todayTotal}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Entries recorded today
            </p>
          </div>

          {/* Today's Check-Outs */}
          <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Check-Outs
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {stats.checkedOutToday}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Departures completed today
            </p>
          </div>

          {/* Total Registered in System */}
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
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Check In / Edit Visitor Form (4 columns on desktop) */}
          <div className="lg:col-span-4">
            <VisitorForm
              onSubmit={handleSubmitForm}
              editingVisitor={editingVisitor}
              onCancelEdit={() => setEditingVisitor(null)}
              submitting={submitting}
            />
          </div>

          {/* Right Column: View / Filter / Check-Out Register Table (8 columns on desktop) */}
          <div className="lg:col-span-8">
            <VisitorTable
              visitors={visitors}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onCheckOut={handleCheckOut}
              onCheckIn={handleCheckIn}
              onEdit={(visitor) => {
                setEditingVisitor(visitor);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onDelete={handleDeleteVisitor}
              onExportCsv={handleExportCsv}
              loading={loading}
              checkingId={checkingId}
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

      {/* MongoDB Database Location & Status Modal */}
      <DatabaseStatusModal
        isOpen={showDbModal}
        onClose={() => setShowDbModal(false)}
        status={dbStatus}
        onRefresh={fetchData}
        onAlert={showAlert}
      />

      {/* Standard Human Developer Footer */}
      <footer className="bg-white border-t border-slate-300 py-3 mt-auto text-center text-xs text-slate-500">
        Employee Visitor Registration System • Front Desk Portal
      </footer>
    </div>
  );
}

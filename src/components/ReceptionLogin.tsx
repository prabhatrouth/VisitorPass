import React, { useState, useEffect } from 'react';
import { loginReceptionDesk, createReceptionDesk, getDbStatus } from '../services/api.ts';
import { ReceptionUser, DbStatus } from '../types/index.ts';
import { DatabaseStatusModal } from './DatabaseStatusModal.tsx';

interface ReceptionLoginProps {
  onLoginSuccess: (user: ReceptionUser) => void;
}

export const ReceptionLogin: React.FC<ReceptionLoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [deskId, setDeskId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New Reception Desk registration fields
  const [newDeskId, setNewDeskId] = useState('');
  const [newStationName, setNewStationName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [showDbModal, setShowDbModal] = useState(false);

  const loadStatus = () => {
    getDbStatus().then(setDbStatus).catch(() => {});
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskId.trim() || !password.trim()) {
      setError('Please enter both Desk ID and Password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await loginReceptionDesk(deskId.trim(), password.trim());
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!newDeskId.trim()) {
      setError('Please provide a Desk ID / Username');
      return;
    }
    if (!newStationName.trim()) {
      setError('Please provide a Reception Station Name (e.g. Gate 1, Lobby Desk)');
      return;
    }
    if (!newPassword.trim()) {
      setError('Please provide a Password');
      return;
    }
    if (newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const created = await createReceptionDesk({
        deskId: newDeskId.trim(),
        stationName: newStationName.trim(),
        password: newPassword.trim(),
      });

      // Auto-log into the newly created reception desk
      const user = await loginReceptionDesk(created.deskId, newPassword.trim());
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Failed to create reception desk');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Header Branding (No AI logo, clean corporate style) */}
        <div className="text-center mb-6">
          <div className="inline-block bg-slate-800 text-slate-200 text-xs font-mono font-semibold px-2.5 py-1 rounded border border-slate-700 mb-2">
            RECEPTION DESK ACCESS
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Employee Visitor Registration System
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access the visitor log register for your assigned reception desk.
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white border border-slate-300 rounded shadow-xs p-6">
          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 cursor-pointer transition ${
                mode === 'login'
                  ? 'border-slate-800 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Desk Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 cursor-pointer transition ${
                mode === 'register'
                  ? 'border-slate-800 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              + Create Reception Desk
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded font-medium">
              {successMsg}
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Desk ID / Username <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter desk ID or username"
                  value={deskId}
                  onChange={(e) => setDeskId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter desk password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-medium px-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded transition cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'Authenticating...' : 'Log In to Reception Desk'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-xs text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
                >
                  Need another desk account? Create a new reception desk
                </button>
              </div>
            </form>
          ) : (
            /* Register New Reception Desk Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Desk ID / Username <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. gate1, lobby_north, desk2"
                  value={newDeskId}
                  onChange={(e) => setNewDeskId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Unique identifier used by receptionist to log in
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Reception Station Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Lobby Reception, Gate 1 Security"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Create a desk password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-medium px-1"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded transition cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Reception Desk...' : 'Create & Log In'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
                >
                  Already have a desk account? Back to Login
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex flex-col items-center justify-center mt-4 gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => setShowDbModal(true)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              dbStatus?.isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                dbStatus?.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span>
              {dbStatus?.isConnected
                ? `MongoDB Connected (${dbStatus.databaseName || 'test'}.visitors: ${dbStatus.mongoVisitorCount})`
                : 'Storage: Local File (data/visitors.json) • Click for DB details'}
            </span>
          </button>

          <div>Employee Visitor Registration System • Front Desk Portal</div>
        </div>

        <DatabaseStatusModal
          isOpen={showDbModal}
          onClose={() => setShowDbModal(false)}
          status={dbStatus}
          onRefresh={loadStatus}
          onAlert={(msg) => setSuccessMsg(msg)}
        />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { loginReceptionDesk } from '../services/api.ts';
import { ReceptionUser } from '../types/index.ts';

interface ReceptionLoginProps {
  onLoginSuccess: (user: ReceptionUser) => void;
}

export const ReceptionLogin: React.FC<ReceptionLoginProps> = ({ onLoginSuccess }) => {
  const [deskId, setDeskId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Header Branding */}
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
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">
            Desk Login
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded font-medium">
              {error}
            </div>
          )}

          {/* Login Form */}
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
          </form>
        </div>

        <div className="text-center mt-4 text-xs text-slate-500">
          Employee Visitor Registration System • Front Desk Portal
        </div>
      </div>
    </div>
  );
};

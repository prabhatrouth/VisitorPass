import React, { useState, useEffect } from 'react';
import { ReceptionDesk, ReceptionUser } from '../types/index.ts';
import { getReceptionDesks, createReceptionDesk, deleteReceptionDesk } from '../services/api.ts';

interface ManageDesksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ReceptionUser;
  onSwitchUser: (deskId: string) => void;
}

export const ManageDesksModal: React.FC<ManageDesksModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [desks, setDesks] = useState<ReceptionDesk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New desk form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeskId, setNewDeskId] = useState('');
  const [newStationName, setNewStationName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDesks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReceptionDesks();
      setDesks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reception desks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDesks();
      setShowAddForm(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleCreateDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeskId.trim() || !newStationName.trim() || !newPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await createReceptionDesk({
        deskId: newDeskId.trim(),
        stationName: newStationName.trim(),
        password: newPassword.trim(),
      });
      setSuccess(`Reception Desk "${created.stationName}" created successfully.`);
      setNewDeskId('');
      setNewStationName('');
      setNewPassword('');
      setShowAddForm(false);
      await fetchDesks();
    } catch (err: any) {
      setError(err.message || 'Failed to create reception desk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDesk = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove reception desk "${name}"?`)) {
      return;
    }

    try {
      setError(null);
      await deleteReceptionDesk(id);
      setSuccess(`Reception Desk "${name}" deleted.`);
      await fetchDesks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete reception desk');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded shadow-md w-full max-w-2xl max-h-[90vh] flex flex-col font-sans">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Manage Reception Desks
            </h3>
            <p className="text-xs text-slate-500">
              Configured reception terminals and operator accounts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-base px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded font-medium">
              {success}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Active Desks ({desks.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setError(null);
                setSuccess(null);
              }}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded transition cursor-pointer"
            >
              {showAddForm ? 'Cancel' : '+ Add New Reception Desk'}
            </button>
          </div>

          {/* Add Form Section */}
          {showAddForm && (
            <form
              onSubmit={handleCreateDesk}
              className="p-4 bg-slate-50 border border-slate-300 rounded space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Register New Reception Desk
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Desk ID / Username <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. gate2, north_lobby"
                    value={newDeskId}
                    onChange={(e) => setNewDeskId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reception Station Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Security Gate 02, Tower B Lobby"
                    value={newStationName}
                    onChange={(e) => setNewStationName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Set desk password (min 4 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Save Reception Desk'}
                </button>
              </div>
            </form>
          )}

          {/* Table of Desks */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                  <th className="py-2 px-3">Desk ID</th>
                  <th className="py-2 px-3">Station Name</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      Loading reception desks...
                    </td>
                  </tr>
                ) : desks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No reception desks found.
                    </td>
                  </tr>
                ) : (
                  desks.map((desk) => {
                    const isCurrent = desk.deskId.toLowerCase() === currentUser.deskId.toLowerCase();
                    return (
                      <tr key={desk.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                          {desk.deskId}
                          {isCurrent && (
                            <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-sans">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {desk.stationName}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {desk.isPrimary ? (
                            <span className="text-[10px] bg-slate-200 text-slate-800 font-medium px-2 py-0.5 rounded">
                              Primary (Env)
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                              Created Desk
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {!desk.isPrimary && !isCurrent ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteDesk(desk.id, desk.stationName)}
                              className="text-red-600 hover:text-red-800 font-semibold underline text-xs cursor-pointer"
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

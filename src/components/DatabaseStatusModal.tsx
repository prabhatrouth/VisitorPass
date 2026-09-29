import React, { useState } from 'react';
import { DbStatus } from '../types/index.ts';
import { migrateDb, connectDb, disconnectDb } from '../services/api.ts';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: DbStatus | null;
  onRefresh: () => void;
  onAlert: (msg: string, type: 'success' | 'error') => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
  onAlert,
}) => {
  const [mongoUriInput, setMongoUriInput] = useState('');
  const [dbNameInput, setDbNameInput] = useState('visitor_db');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUriInput.trim()) {
      setConnectionError('Please enter your MongoDB connection string URI.');
      return;
    }

    try {
      setConnecting(true);
      setConnectionError(null);
      const res = await connectDb(mongoUriInput.trim(), dbNameInput.trim() || undefined);
      onAlert(res.message, 'success');
      setMongoUriInput('');
      onRefresh();
    } catch (err: any) {
      setConnectionError(err.message || 'Failed to connect to MongoDB');
      onAlert(err.message || 'Failed to connect to MongoDB', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const confirm = window.confirm('Disconnect from live MongoDB?');
    if (!confirm) return;

    try {
      setDisconnecting(true);
      await disconnectDb();
      onAlert('Disconnected from MongoDB', 'success');
      onRefresh();
    } catch (err: any) {
      onAlert(err.message || 'Failed to disconnect', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleMigrate = async () => {
    try {
      setMigrating(true);
      const res = await migrateDb();
      onAlert(`Successfully synced ${res.migrated} records into MongoDB collection "visitors"!`, 'success');
      onRefresh();
    } catch (err: any) {
      onAlert(err.message || 'Failed to sync to MongoDB', 'error');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🍃</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                MongoDB Live Database Storage
              </h2>
              <p className="text-xs text-slate-500">
                Store and query visitor registration records exclusively in MongoDB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current Connection Status Box */}
        {status?.isConnected ? (
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Live MongoDB Active (Storing Exclusively in MongoDB)
                </span>
              </div>
              <span className="text-[11px] font-mono bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded font-bold">
                LIVE
              </span>
            </div>

            <p className="text-xs text-emerald-900 font-medium">
              All visitor check-in, check-out, and registration logs are stored directly and exclusively in your live MongoDB cluster.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded border border-emerald-200 shadow-2xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Database Name:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {status.databaseName || 'visitor_db'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Collection Name:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {status.collectionName}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Live Documents in MongoDB:</span>
                <span className="font-bold text-emerald-700 text-base">
                  {status.mongoVisitorCount} visitors
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-xs mt-1">
                  ✓ Verified Live Connection
                </span>
              </div>
            </div>

            {status.maskedUri && (
              <p className="text-[11px] font-mono text-slate-600 break-all bg-emerald-100/50 p-2 rounded">
                URI: {status.maskedUri}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              {status.localVisitorCount > 0 && status.localVisitorCount !== status.mongoVisitorCount && (
                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {migrating ? 'Syncing...' : 'Sync Local Backup into MongoDB'}
                </button>
              )}

              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="py-1.5 px-3 border border-red-300 text-red-700 hover:bg-red-50 rounded text-xs font-semibold transition cursor-pointer"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                MongoDB Not Connected (Temporary Fallback Mode)
              </span>
            </div>

            <p className="text-xs text-amber-900">
              To store <strong>only in MongoDB live data</strong>, connect your MongoDB Atlas or local MongoDB instance below.
            </p>

            {status?.error && (
              <div className="bg-white p-2.5 rounded border border-amber-200 text-xs font-mono text-amber-900 break-words">
                <strong>Error:</strong> {status.error}
              </div>
            )}
          </div>
        )}

        {/* Connect to MongoDB Form */}
        <form onSubmit={handleConnect} className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
          <h3 className="font-bold text-slate-900 text-xs flex items-center justify-between">
            <span>🔌 Connect Live MongoDB Atlas Database</span>
            <span className="text-[11px] font-normal text-slate-500">Auto-saved to .env</span>
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              MongoDB Connection String URI <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/visitor_db?retryWrites=true&w=majority"
              value={mongoUriInput}
              onChange={(e) => {
                setMongoUriInput(e.target.value);
                setConnectionError(null);
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Paste your standard MongoDB Atlas or self-hosted MongoDB URI.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Database Name (Optional)
            </label>
            <input
              type="text"
              placeholder="visitor_db"
              value={dbNameInput}
              onChange={(e) => setDbNameInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>

          {connectionError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
              {connectionError}
            </div>
          )}

          <button
            type="submit"
            disabled={connecting || !mongoUriInput.trim()}
            className="w-full py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {connecting ? (
              <span>Connecting &amp; Verifying MongoDB...</span>
            ) : (
              <>
                <span>🍃</span> Connect &amp; Store Only in MongoDB Live
              </>
            )}
          </button>
        </form>

        {/* MongoDB Atlas Setup Checklist */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white text-xs space-y-2 text-slate-700">
          <h4 className="font-bold text-slate-900 text-xs">
            📍 Where to View Live Data in MongoDB Atlas:
          </h4>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
            <li>
              Log into <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="text-blue-700 underline font-semibold">MongoDB Atlas</a> and click <strong>&quot;Browse Collections&quot;</strong>.
            </li>
            <li>
              Open database <strong>&quot;{status?.databaseName || dbNameInput || 'visitor_db'}&quot;</strong>.
            </li>
            <li>
              Inspect collection <strong>&quot;visitors&quot;</strong>: all visitor entries, check-in, and check-out timestamps are stored live here.
            </li>
            <li>
              <strong>Atlas Network Access</strong>: Ensure IP <strong>0.0.0.0/0</strong> (Allow access from anywhere) is configured in Atlas so your cloud app can connect.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
          >
            ↻ Refresh Status
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

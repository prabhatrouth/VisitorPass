import React, { useState } from 'react';
import { DbStatus } from '../types/index.ts';
import { migrateDb } from '../services/api.ts';

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
  const [migrating, setMigrating] = useState(false);

  if (!isOpen) return null;

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
      <div className="bg-white rounded border border-slate-300 shadow-xl max-w-xl w-full p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍃</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                MongoDB Storage &amp; Database Location
              </h2>
              <p className="text-xs text-slate-500">
                Locate your data in MongoDB Atlas / Compass
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
          <div className="bg-emerald-50 border border-emerald-300 rounded p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                MongoDB is Connected &amp; Active
              </span>
            </div>

            <p className="text-xs text-emerald-800">
              New visitor registrations and check-ins are actively saved to your MongoDB database.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded border border-emerald-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Database Name:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {status.databaseName || 'test'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Collection Name:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {status.collectionName}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Visitors in MongoDB:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {status.mongoVisitorCount} records
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Local File Backup:</span>
                <span className="font-medium text-slate-700 text-sm">
                  {status.localVisitorCount} records
                </span>
              </div>
            </div>

            {status.maskedUri && (
              <p className="text-[11px] font-mono text-slate-500 break-all pt-1">
                URI: {status.maskedUri}
              </p>
            )}

            {status.localVisitorCount > 0 && status.localVisitorCount !== status.mongoVisitorCount && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {migrating ? 'Syncing...' : 'Sync Local File Visitors into MongoDB Collection'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 rounded p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Operating in Local File Storage Mode
              </span>
            </div>

            <p className="text-xs text-amber-800">
              Your visitors are currently saved in local file storage (<strong>data/visitors.json</strong>, {status?.localVisitorCount || 0} records) because MongoDB is not yet connected.
            </p>

            {status?.error && (
              <div className="bg-white/80 p-2.5 rounded border border-amber-200 text-xs font-mono text-amber-900 break-words">
                <strong>Reason:</strong> {status.error}
              </div>
            )}
          </div>
        )}

        {/* Where to Find Data in MongoDB Checklist */}
        <div className="border border-slate-200 rounded p-3.5 bg-slate-50 text-xs space-y-2 text-slate-700">
          <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <span>📍</span> Where to Find Your Data in MongoDB Atlas:
          </h3>

          <ol className="list-decimal pl-5 space-y-1.5 text-[11px] leading-relaxed">
            <li>
              Log into <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="text-blue-700 font-semibold underline">MongoDB Atlas</a> and click <strong>&quot;Browse Collections&quot;</strong> on your Cluster.
            </li>
            <li>
              Look under the database named <strong>&quot;{status?.databaseName || 'visitor_db'}&quot;</strong> or <strong>&quot;test&quot;</strong> (if no database name was specified in the connection string URI).
            </li>
            <li>
              Select the collection <strong>&quot;visitors&quot;</strong> to view all registered visitors and check-in / check-out logs.
            </li>
            <li>
              Select the collection <strong>&quot;receptiondesks&quot;</strong> to view reception accounts.
            </li>
          </ol>
        </div>

        {/* Setup Guide if Not Connected or Deploying to Render */}
        <div className="border border-slate-200 rounded p-3.5 bg-white text-xs space-y-2 text-slate-700">
          <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <span>⚙️</span> How to Connect MongoDB on Render / Local:
          </h3>

          <div className="space-y-1.5 text-[11px] text-slate-600">
            <p>
              1. In <strong>MongoDB Atlas</strong> &gt; <strong>Network Access</strong>, ensure <strong>0.0.0.0/0</strong> (Allow access from anywhere) is active so Render or your server can connect.
            </p>
            <p>
              2. In your <strong>Render Dashboard</strong> &gt; Select your service &gt; <strong>Environment</strong>:
            </p>
            <div className="bg-slate-900 text-slate-100 p-2.5 rounded font-mono text-[10px] break-all space-y-1 select-all">
              <div>MONGODB_URI = &quot;mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.abcde.mongodb.net/visitor_db?retryWrites=true&amp;w=majority&quot;</div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Tip: Including <code>/visitor_db</code> before <code>?retryWrites=true</code> creates a dedicated database instead of saving into the default &quot;test&quot; database.
            </p>
          </div>
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

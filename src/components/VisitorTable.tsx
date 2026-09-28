import React from 'react';
import { Visitor } from '../types/index.ts';
import { formatDateTime } from '../utils/formatters.ts';

interface VisitorTableProps {
  visitors: Visitor[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onEdit: (visitor: Visitor) => void;
  onDelete: (id: string, name: string) => void;
  onExportCsv: () => void;
  loading: boolean;
}

export const VisitorTable: React.FC<VisitorTableProps> = ({
  visitors,
  searchQuery,
  setSearchQuery,
  onEdit,
  onDelete,
  onExportCsv,
  loading,
}) => {
  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs flex flex-col">
      {/* Controls Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Visitor Records Register
          </h2>
          <p className="text-xs text-slate-500">
            {visitors.length} {visitors.length === 1 ? 'record' : 'records'} logged
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search by Name or Mobile Number */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={onExportCsv}
            disabled={visitors.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[11px] tracking-wide">
              <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">#</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Name</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Mobile Number</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Company / College</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Person to Meet</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Purpose of Visit</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Date &amp; Time</th>
              <th className="py-2.5 px-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Loading records...
                </td>
              </tr>
            ) : visitors.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  {searchQuery ? (
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">No visitors matched your search</p>
                      <p className="text-xs text-slate-500 mt-1">No record matching &quot;{searchQuery}&quot;</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-xs text-blue-700 underline font-medium"
                      >
                        Clear search filter
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">No visitor records yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Use the registration form on the left to add visitors to this register.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              visitors.map((visitor, index) => (
                <tr key={visitor.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                    {visitor.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-200">
                    {visitor.mobileNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200">
                    {visitor.companyOrCollege}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200">
                    {visitor.personToMeet}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-200">
                    <span className="text-slate-800 font-medium">
                      {visitor.purposeOfVisit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 border-r border-slate-200 whitespace-nowrap">
                    {formatDateTime(visitor.dateTime)}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(visitor)}
                        className="text-blue-700 hover:text-blue-900 font-semibold hover:underline cursor-pointer"
                        title="Edit visitor details"
                      >
                        Edit
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => onDelete(visitor.id, visitor.name)}
                        className="text-red-600 hover:text-red-800 font-semibold hover:underline cursor-pointer"
                        title="Delete visitor record"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {visitors.length > 0 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Showing {visitors.length} entries</span>
          <span>Click &apos;Export to CSV&apos; to download records as spreadsheet</span>
        </div>
      )}
    </div>
  );
};

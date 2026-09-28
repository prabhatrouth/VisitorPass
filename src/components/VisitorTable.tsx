import React, { useState } from 'react';
import { Visitor, VisitorStatus } from '../types/index.ts';
import {
  formatDateTime,
  formatTimeOnly,
  formatDuration,
  getTimeSince,
} from '../utils/formatters.ts';

interface VisitorTableProps {
  visitors: Visitor[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: 'ALL' | VisitorStatus;
  setStatusFilter: (status: 'ALL' | VisitorStatus) => void;
  onCheckOut: (visitor: Visitor) => void;
  onCheckIn: (visitor: Visitor) => void;
  onEdit: (visitor: Visitor) => void;
  onDelete: (id: string, name: string) => void;
  onExportCsv: () => void;
  loading: boolean;
  checkingId?: string | null;
}

export const VisitorTable: React.FC<VisitorTableProps> = ({
  visitors,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onCheckOut,
  onCheckIn,
  onEdit,
  onDelete,
  onExportCsv,
  loading,
  checkingId,
}) => {
  const [selectedVisitorForModal, setSelectedVisitorForModal] = useState<Visitor | null>(null);

  const insideCount = visitors.filter((v) => v.status === 'CHECKED_IN').length;
  const outCount = visitors.filter((v) => v.status === 'CHECKED_OUT').length;

  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs flex flex-col">
      {/* Controls & Filter Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Visitor Records &amp; Gate Register
            </h2>
            <p className="text-xs text-slate-500">
              Monitor active visitors on premise and check-in / check-out times
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search by Name or Mobile Number */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, phone, host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
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
              Export CSV
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            All Visitors ({visitors.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CHECKED_IN')}
            className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'CHECKED_IN'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Currently Inside ({insideCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CHECKED_OUT')}
            className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
              statusFilter === 'CHECKED_OUT'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Checked Out ({outCount})
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[10px] tracking-wide">
              <th className="py-2.5 px-3 w-8 text-center border-r border-slate-200">#</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Visitor Details</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Company / College</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Person to Meet &amp; Purpose</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Status &amp; Timings</th>
              <th className="py-2.5 px-3 text-center w-36">Check In / Out</th>
              <th className="py-2.5 px-3 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading records...
                </td>
              </tr>
            ) : visitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  {searchQuery ? (
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">No visitors matched your search</p>
                      <p className="text-xs text-slate-500 mt-1">No record matching &quot;{searchQuery}&quot;</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-xs text-blue-700 underline font-medium cursor-pointer"
                      >
                        Clear search filter
                      </button>
                    </div>
                  ) : statusFilter === 'CHECKED_IN' ? (
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">No active visitors currently inside</p>
                      <p className="text-xs text-slate-500 mt-1">
                        All visitors have checked out, or register a new visitor using the form.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">No visitor records found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Use the registration form on the left to check in visitors.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              visitors.map((visitor, index) => {
                const isInside = visitor.status === 'CHECKED_IN';
                const inTime = visitor.checkInTime || visitor.dateTime;
                const outTime = visitor.checkOutTime;

                return (
                  <tr
                    key={visitor.id}
                    className={`transition hover:bg-slate-50 ${
                      isInside ? 'bg-white' : 'bg-slate-50/40 text-slate-600'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200 text-[11px]">
                      {index + 1}
                    </td>

                    {/* Visitor Details */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900 text-xs">
                        {visitor.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-600">
                        {visitor.mobileNumber}
                      </div>
                    </td>

                    {/* Company / College */}
                    <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200 text-xs">
                      {visitor.companyOrCollege}
                    </td>

                    {/* Host & Purpose */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <div className="text-slate-900 font-semibold">
                        {visitor.personToMeet}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {visitor.purposeOfVisit}
                      </div>
                    </td>

                    {/* Status & Timings */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      {isInside ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            INSIDE PREMISES
                          </span>
                          <div className="text-[10px] text-slate-500">
                            In: <span className="font-semibold text-slate-700">{formatTimeOnly(inTime)}</span> ({getTimeSince(inTime)})
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-700">
                            ✓ CHECKED OUT
                          </span>
                          <div className="text-[10px] text-slate-500">
                            In: {formatTimeOnly(inTime)} • Out: {formatTimeOnly(outTime)}
                          </div>
                          <div className="text-[10px] font-medium text-slate-600">
                            Stay: {formatDuration(inTime, outTime)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Check In / Check Out Action Button */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                      {isInside ? (
                        <button
                          type="button"
                          disabled={checkingId === visitor.id}
                          onClick={() => onCheckOut(visitor)}
                          className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          title="Record visitor departure and check out"
                        >
                          {checkingId === visitor.id ? (
                            'Saving...'
                          ) : (
                            <>
                              <span>⇥</span> Check Out
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={checkingId === visitor.id}
                          onClick={() => onCheckIn(visitor)}
                          className="w-full py-1 px-2.5 bg-slate-100 hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold text-xs rounded transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          title="Re-check in visitor if they returned or checked out by mistake"
                        >
                          {checkingId === visitor.id ? (
                            'Saving...'
                          ) : (
                            <>
                              <span>↺</span> Re-Check In
                            </>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Edit / Delete actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs">
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Visitor, VisitorFormData, VisitorStatus } from '../types/index.ts';
import { formatDateTime } from '../utils/formatters.ts';

interface VisitorFormProps {
  onSubmit: (data: VisitorFormData, idToEdit?: string) => Promise<void>;
  editingVisitor: Visitor | null;
  onCancelEdit: () => void;
  submitting: boolean;
}

export const VisitorForm: React.FC<VisitorFormProps> = ({
  onSubmit,
  editingVisitor,
  onCancelEdit,
  submitting,
}) => {
  const [formData, setFormData] = useState<VisitorFormData>({
    name: '',
    mobileNumber: '',
    companyOrCollege: '',
    personToMeet: '',
    purposeOfVisit: '',
    dateTime: '',
    status: 'CHECKED_IN',
    checkInTime: '',
    checkOutTime: null,
  });

  const [currentAutoTime, setCurrentAutoTime] = useState<string>(new Date().toISOString());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Auto-updating live time for new registrations
  useEffect(() => {
    if (!editingVisitor) {
      const updateTimer = () => {
        setCurrentAutoTime(new Date().toISOString());
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [editingVisitor]);

  // Populate form when editing or clear when adding new
  useEffect(() => {
    if (editingVisitor) {
      setFormData({
        name: editingVisitor.name,
        mobileNumber: editingVisitor.mobileNumber,
        companyOrCollege: editingVisitor.companyOrCollege,
        personToMeet: editingVisitor.personToMeet,
        purposeOfVisit: editingVisitor.purposeOfVisit,
        dateTime: editingVisitor.dateTime,
        status: editingVisitor.status || 'CHECKED_IN',
        checkInTime: editingVisitor.checkInTime || editingVisitor.dateTime,
        checkOutTime: editingVisitor.checkOutTime || null,
      });
      setErrors({});
    } else {
      setFormData({
        name: '',
        mobileNumber: '',
        companyOrCollege: '',
        personToMeet: '',
        purposeOfVisit: '',
        dateTime: '',
        status: 'CHECKED_IN',
        checkInTime: '',
        checkOutTime: null,
      });
      setErrors({});
    }
  }, [editingVisitor]);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errs.name = 'Please enter the visitor name';
    }
    if (!formData.mobileNumber.trim()) {
      errs.mobileNumber = 'Please enter the mobile number';
    } else if (formData.mobileNumber.trim().length < 8) {
      errs.mobileNumber = 'Please enter a valid mobile number (at least 8 digits)';
    }
    if (!formData.companyOrCollege.trim()) {
      errs.companyOrCollege = 'Please enter the company or college name';
    }
    if (!formData.personToMeet.trim()) {
      errs.personToMeet = 'Please enter the person to meet';
    }
    if (!formData.purposeOfVisit.trim()) {
      errs.purposeOfVisit = 'Please enter the purpose of visit';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const recordedTime = editingVisitor
      ? formData.checkInTime || formData.dateTime
      : currentAutoTime;

    await onSubmit(
      {
        ...formData,
        dateTime: recordedTime,
        checkInTime: recordedTime,
        status: formData.status || 'CHECKED_IN',
      },
      editingVisitor?.id
    );

    if (!editingVisitor) {
      setFormData({
        name: '',
        mobileNumber: '',
        companyOrCollege: '',
        personToMeet: '',
        purposeOfVisit: '',
        dateTime: '',
        status: 'CHECKED_IN',
        checkInTime: '',
        checkOutTime: null,
      });
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      mobileNumber: '',
      companyOrCollege: '',
      personToMeet: '',
      purposeOfVisit: '',
      dateTime: '',
      status: 'CHECKED_IN',
      checkInTime: '',
      checkOutTime: null,
    });
    setErrors({});
    if (editingVisitor) {
      onCancelEdit();
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs p-5">
      <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {editingVisitor ? 'Edit Visitor Record' : 'Check In New Visitor'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {editingVisitor
              ? 'Modify details or update visitor entry status'
              : 'Register and check in an arriving visitor'}
          </p>
        </div>

        {editingVisitor && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded px-2.5 py-1 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Visitor Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Visitor Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 ${
              errors.name ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
            }`}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Mobile Number <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            placeholder="e.g. 9876543210"
            value={formData.mobileNumber}
            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 ${
              errors.mobileNumber ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
            }`}
          />
          {errors.mobileNumber && (
            <p className="text-xs text-red-600 mt-1">{errors.mobileNumber}</p>
          )}
        </div>

        {/* Company/College Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Company / College Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="Organization or Institution name"
            value={formData.companyOrCollege}
            onChange={(e) => setFormData({ ...formData, companyOrCollege: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 ${
              errors.companyOrCollege ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
            }`}
          />
          {errors.companyOrCollege && (
            <p className="text-xs text-red-600 mt-1">{errors.companyOrCollege}</p>
          )}
        </div>

        {/* Person to Meet */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Person to Meet <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="Host / Staff member name"
            value={formData.personToMeet}
            onChange={(e) => setFormData({ ...formData, personToMeet: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 ${
              errors.personToMeet ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
            }`}
          />
          {errors.personToMeet && (
            <p className="text-xs text-red-600 mt-1">{errors.personToMeet}</p>
          )}
        </div>

        {/* Purpose of Visit */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Purpose of Visit <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Official Meeting, Interview, Delivery"
            value={formData.purposeOfVisit}
            onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 ${
              errors.purposeOfVisit ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
            }`}
          />
          {errors.purposeOfVisit && (
            <p className="text-xs text-red-600 mt-1">{errors.purposeOfVisit}</p>
          )}
        </div>

        {/* Status Dropdown (when editing) */}
        {editingVisitor && (
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Premises Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as VisitorStatus })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="CHECKED_IN">CHECKED_IN (Inside Premises)</option>
              <option value="CHECKED_OUT">CHECKED_OUT (Departed)</option>
            </select>
          </div>
        )}

        {/* Check-In Date & Time (auto-captured) */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Check-In Time <span className="text-slate-500 font-normal">(Auto-captured)</span>
          </label>
          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-slate-700 text-xs font-mono select-none">
            {editingVisitor
              ? formatDateTime(formData.checkInTime || formData.dateTime)
              : `${formatDateTime(currentAutoTime)} (Current Time)`}
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 py-2 px-4 rounded text-sm font-bold text-white transition cursor-pointer disabled:opacity-50 ${
              editingVisitor
                ? 'bg-blue-700 hover:bg-blue-800'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {submitting
              ? 'Processing...'
              : editingVisitor
              ? 'Update Record'
              : '✓ Check In Visitor'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="py-2 px-3 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
          >
            {editingVisitor ? 'Cancel' : 'Clear'}
          </button>
        </div>
      </form>
    </div>
  );
};

import {
  Visitor,
  VisitorFormData,
  VisitorStats,
  ReceptionUser,
  ReceptionDesk,
} from '../types/index.ts';

const BASE_URL = '/api';

export async function loginReceptionDesk(deskId: string, password: string): Promise<ReceptionUser> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deskId, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Invalid Desk ID or Password');
  }
  return json.data;
}

export async function verifyReceptionSession(token: string): Promise<ReceptionUser> {
  const res = await fetch(`${BASE_URL}/auth/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Session expired');
  }
  return json.data;
}

export async function getReceptionDesks(): Promise<ReceptionDesk[]> {
  const res = await fetch(`${BASE_URL}/receptions`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch reception desks');
  }
  return json.data || [];
}

export async function createReceptionDesk(data: {
  deskId: string;
  password: string;
  stationName: string;
}): Promise<ReceptionDesk> {
  const res = await fetch(`${BASE_URL}/receptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to create reception desk');
  }
  return json.data;
}

export async function deleteReceptionDesk(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/receptions/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to delete reception desk');
  }
  return true;
}

export async function getVisitors(search?: string, status?: string): Promise<Visitor[]> {
  const query = new URLSearchParams();
  if (search && search.trim()) {
    query.append('search', search.trim());
  }
  if (status && status !== 'ALL') {
    query.append('status', status.trim());
  }

  const res = await fetch(`${BASE_URL}/visitors?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch visitor records');
  }
  const json = await res.json();
  return json.data || [];
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const res = await fetch(`${BASE_URL}/visitors/stats`);
  if (!res.ok) {
    throw new Error('Failed to fetch stats');
  }
  const json = await res.json();
  return json.data || { todayTotal: 0, totalVisitors: 0, currentlyInside: 0, checkedOutToday: 0 };
}

export async function checkOutVisitor(
  id: string,
  deskId?: string,
  checkOutTime?: string
): Promise<Visitor> {
  const res = await fetch(`${BASE_URL}/visitors/${id}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deskId, checkOutTime }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to check out visitor');
  }
  return json.data;
}

export async function checkInVisitor(
  id: string,
  deskId?: string,
  checkInTime?: string
): Promise<Visitor> {
  const res = await fetch(`${BASE_URL}/visitors/${id}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deskId, checkInTime }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to check in visitor');
  }
  return json.data;
}

export async function createVisitor(data: VisitorFormData): Promise<Visitor> {
  const res = await fetch(`${BASE_URL}/visitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to register visitor');
  }
  return json.data;
}

export async function updateVisitor(id: string, data: VisitorFormData): Promise<Visitor> {
  const res = await fetch(`${BASE_URL}/visitors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to update visitor');
  }
  return json.data;
}

export async function deleteVisitor(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/visitors/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Failed to delete visitor');
  }
  return true;
}

export function getExportCsvUrl(search?: string, status?: string): string {
  const query = new URLSearchParams();
  if (search && search.trim()) {
    query.append('search', search.trim());
  }
  if (status && status !== 'ALL') {
    query.append('status', status.trim());
  }
  return `${BASE_URL}/visitors/export?${query.toString()}`;
}



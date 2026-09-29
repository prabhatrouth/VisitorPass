export type VisitorStatus = 'CHECKED_IN' | 'CHECKED_OUT';

export interface Visitor {
  id: string;
  name: string;
  mobileNumber: string;
  companyOrCollege: string;
  personToMeet: string;
  purposeOfVisit: string;
  dateTime: string;
  status: VisitorStatus;
  checkInTime: string;
  checkOutTime?: string | null;
  registeredByDesk?: string;
  checkedOutByDesk?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VisitorFormData {
  name: string;
  mobileNumber: string;
  companyOrCollege: string;
  personToMeet: string;
  purposeOfVisit: string;
  dateTime?: string;
  status?: VisitorStatus;
  checkInTime?: string;
  checkOutTime?: string | null;
  registeredByDesk?: string;
}

export interface VisitorStats {
  todayTotal: number;
  totalVisitors: number;
  currentlyInside: number;
  checkedOutToday: number;
}

export interface ReceptionUser {
  token: string;
  deskId: string;
  stationName: string;
  isPrimary?: boolean;
}

export interface ReceptionDesk {
  id: string;
  deskId: string;
  stationName: string;
  createdAt: string;
  isPrimary?: boolean;
}

export interface DbStatus {
  isConnected: boolean;
  storageType: string;
  databaseName: string | null;
  collectionName: string;
  maskedUri: string | null;
  mongoVisitorCount: number;
  localVisitorCount: number;
  error: string | null;
}

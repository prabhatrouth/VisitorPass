export interface Visitor {
  id: string;
  name: string;
  mobileNumber: string;
  companyOrCollege: string;
  personToMeet: string;
  purposeOfVisit: string;
  dateTime: string;
  registeredByDesk?: string;
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
  registeredByDesk?: string;
}

export interface VisitorStats {
  todayTotal: number;
  totalVisitors: number;
}

export interface ReceptionDesk {
  id: string;
  deskId: string;
  password: string;
  stationName: string;
  createdAt: string;
  isPrimary?: boolean;
}

import mongoose from 'mongoose';
import { Visitor, VisitorFormData, VisitorStats, ReceptionDesk } from './types.js';
import { VisitorModel } from './models/Visitor.js';
import { ReceptionDeskModel } from './models/ReceptionDesk.js';

const NOT_CONNECTED_MSG =
  'STORE ONLY IN MONGODB LIVE DATA: MongoDB is not connected yet. Connect your MongoDB Atlas connection string to save all visitor logs directly to live MongoDB.';

class VisitorDatabase {
  public isConnectedToMongo: boolean = false;
  public mongoDbUri: string = '';
  public mongoDatabaseName: string = '';
  public mongoError: string | null = null;

  constructor() {
    this.initMongoConnection();
  }

  public async initMongoConnection(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri || !uri.trim()) {
      this.isConnectedToMongo = false;
      this.mongoError = NOT_CONNECTED_MSG;
      console.log(`[VisitorPass Database] ${NOT_CONNECTED_MSG}`);
      return;
    }

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      this.mongoDbUri = masked;

      const customDbName = process.env.MONGODB_DB_NAME;
      await mongoose.connect(uri.trim(), {
        serverSelectionTimeoutMS: 8000,
        ...(customDbName ? { dbName: customDbName.trim() } : {}),
      });

      // Verify connection ping
      await mongoose.connection.db?.admin().ping();

      this.isConnectedToMongo = true;
      this.mongoDatabaseName = mongoose.connection.name || (mongoose.connection.db as any)?.databaseName || 'visitor_db';
      this.mongoError = null;

      console.log(`[VisitorPass Database] Connected to LIVE MongoDB database: "${this.mongoDatabaseName}" (${masked})`);
      await this.ensurePrimaryReceptionDesk();
    } catch (err: any) {
      this.isConnectedToMongo = false;
      this.mongoError = err.message || NOT_CONNECTED_MSG;
      console.error('[VisitorPass Database] MongoDB connection failed:', err.message);
    }
  }

  private ensureConnected(): void {
    if (!this.isConnectedToMongo) {
      throw new Error(NOT_CONNECTED_MSG);
    }
  }

  public async ensurePrimaryReceptionDesk(): Promise<void> {
    const envDeskId = (process.env.RECEPTION_ID || 'admin').trim().toLowerCase();
    const envPassword = (process.env.RECEPTION_PASSWORD || 'admin123').trim();

    if (this.isConnectedToMongo) {
      try {
        const existing = await ReceptionDeskModel.findOne({ deskId: envDeskId });
        if (!existing) {
          await ReceptionDeskModel.create({
            deskId: envDeskId,
            password: envPassword,
            stationName: 'Main Entrance Reception Desk',
            isPrimary: true,
          });
          console.log(`[VisitorPass Database] Primary reception desk "${envDeskId}" initialized in MongoDB.`);
        }
      } catch (err: any) {
        console.error('Error ensuring primary desk in MongoDB:', err.message);
      }
    }
  }

  // --- RECEPTION AUTHENTICATION & MULTI-DESK MANAGEMENT ---

  public async authenticateReceptionDesk(
    deskId: string,
    password: string
  ): Promise<Omit<ReceptionDesk, 'password'> | null> {
    const normalizedDeskId = deskId.trim().toLowerCase();
    const plainPassword = password.trim();

    // Check in live MongoDB if connected
    if (this.isConnectedToMongo) {
      const deskDoc = await ReceptionDeskModel.findOne({ deskId: normalizedDeskId });
      if (deskDoc && deskDoc.password === plainPassword) {
        const json = deskDoc.toJSON();
        return {
          id: json.id,
          deskId: json.deskId,
          stationName: json.stationName,
          createdAt: json.createdAt,
          isPrimary: !!json.isPrimary,
        };
      }
    }

    // Fallback authentication for primary admin configured via .env credentials
    const envDeskId = (process.env.RECEPTION_ID || 'admin').trim().toLowerCase();
    const envPassword = (process.env.RECEPTION_PASSWORD || 'admin123').trim();

    if (normalizedDeskId === envDeskId && plainPassword === envPassword) {
      return {
        id: 'admin-primary',
        deskId: envDeskId,
        stationName: 'Main Entrance Reception Desk',
        createdAt: new Date().toISOString(),
        isPrimary: true,
      };
    }

    return null;
  }

  public async getAllReceptionDesks(): Promise<Omit<ReceptionDesk, 'password'>[]> {
    if (this.isConnectedToMongo) {
      const docs = await ReceptionDeskModel.find().sort({ createdAt: 1 });
      return docs.map((d) => {
        const json = d.toJSON();
        return {
          id: json.id,
          deskId: json.deskId,
          stationName: json.stationName,
          createdAt: json.createdAt,
          isPrimary: !!json.isPrimary,
        };
      });
    }

    // Default primary desk from env
    const envDeskId = (process.env.RECEPTION_ID || 'admin').trim().toLowerCase();
    return [
      {
        id: 'admin-primary',
        deskId: envDeskId,
        stationName: 'Main Entrance Reception Desk',
        createdAt: new Date().toISOString(),
        isPrimary: true,
      },
    ];
  }

  public async createReceptionDesk(data: {
    deskId: string;
    password: string;
    stationName: string;
  }): Promise<Omit<ReceptionDesk, 'password'>> {
    this.ensureConnected();

    const normalizedDeskId = data.deskId.trim().toLowerCase();
    const stationName = data.stationName.trim() || `Reception ${normalizedDeskId.toUpperCase()}`;
    const password = data.password.trim();

    const exists = await ReceptionDeskModel.findOne({ deskId: normalizedDeskId });
    if (exists) {
      throw new Error(`Desk ID "${normalizedDeskId}" already exists. Please choose a different ID.`);
    }

    const doc = await ReceptionDeskModel.create({
      deskId: normalizedDeskId,
      password,
      stationName,
      isPrimary: false,
    });
    const json = doc.toJSON();
    return {
      id: json.id,
      deskId: json.deskId,
      stationName: json.stationName,
      createdAt: json.createdAt,
      isPrimary: false,
    };
  }

  public async deleteReceptionDesk(id: string): Promise<boolean> {
    this.ensureConnected();

    const count = await ReceptionDeskModel.countDocuments();
    if (count <= 1) {
      throw new Error('Cannot delete the only remaining reception desk.');
    }
    const desk = await ReceptionDeskModel.findById(id);
    if (desk?.isPrimary) {
      throw new Error('Primary reception desk cannot be deleted.');
    }
    const res = await ReceptionDeskModel.findByIdAndDelete(id);
    return !!res;
  }

  // --- VISITORS MANAGEMENT: STORED ONLY IN MONGODB LIVE DATA ---

  public async getAll(search?: string, statusFilter?: string): Promise<Visitor[]> {
    if (!this.isConnectedToMongo) {
      return [];
    }

    const query: any = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { mobileNumber: regex },
        { companyOrCollege: regex },
        { personToMeet: regex },
      ];
    }
    if (statusFilter && statusFilter !== 'ALL') {
      query.status = statusFilter;
    }
    const docs = await VisitorModel.find(query).sort({ checkInTime: -1 });
    return docs.map((d) => d.toJSON() as Visitor);
  }

  public async getById(id: string): Promise<Visitor | null> {
    this.ensureConnected();
    const doc = await VisitorModel.findById(id);
    return doc ? (doc.toJSON() as Visitor) : null;
  }

  public async create(data: VisitorFormData): Promise<Visitor> {
    this.ensureConnected();

    const now = new Date().toISOString();
    const dateTime = data.dateTime || now;
    const checkInTime = data.checkInTime || dateTime;
    const status = data.status || 'CHECKED_IN';
    const checkOutTime = data.checkOutTime || null;

    const doc = await VisitorModel.create({
      name: data.name.trim(),
      mobileNumber: data.mobileNumber.trim(),
      companyOrCollege: data.companyOrCollege.trim(),
      personToMeet: data.personToMeet.trim(),
      purposeOfVisit: data.purposeOfVisit.trim(),
      dateTime,
      status,
      checkInTime,
      checkOutTime,
      registeredByDesk: data.registeredByDesk || 'admin',
    });

    return doc.toJSON() as Visitor;
  }

  public async checkOut(
    id: string,
    deskId?: string,
    checkOutTime?: string
  ): Promise<Visitor | null> {
    this.ensureConnected();

    const outTime = checkOutTime || new Date().toISOString();
    const doc = await VisitorModel.findByIdAndUpdate(
      id,
      {
        status: 'CHECKED_OUT',
        checkOutTime: outTime,
        ...(deskId && { checkedOutByDesk: deskId }),
      },
      { new: true }
    );
    return doc ? (doc.toJSON() as Visitor) : null;
  }

  public async checkIn(id: string, checkInTime?: string): Promise<Visitor | null> {
    this.ensureConnected();

    const inTime = checkInTime || new Date().toISOString();
    const doc = await VisitorModel.findByIdAndUpdate(
      id,
      {
        status: 'CHECKED_IN',
        checkInTime: inTime,
        checkOutTime: null,
      },
      { new: true }
    );
    return doc ? (doc.toJSON() as Visitor) : null;
  }

  public async update(id: string, data: Partial<VisitorFormData>): Promise<Visitor | null> {
    this.ensureConnected();

    const doc = await VisitorModel.findByIdAndUpdate(
      id,
      {
        ...(data.name && { name: data.name.trim() }),
        ...(data.mobileNumber && { mobileNumber: data.mobileNumber.trim() }),
        ...(data.companyOrCollege && { companyOrCollege: data.companyOrCollege.trim() }),
        ...(data.personToMeet && { personToMeet: data.personToMeet.trim() }),
        ...(data.purposeOfVisit && { purposeOfVisit: data.purposeOfVisit.trim() }),
        ...(data.dateTime && { dateTime: data.dateTime }),
        ...(data.status && { status: data.status }),
        ...(data.checkInTime && { checkInTime: data.checkInTime }),
        ...(data.checkOutTime !== undefined && { checkOutTime: data.checkOutTime }),
      },
      { new: true }
    );
    return doc ? (doc.toJSON() as Visitor) : null;
  }

  public async delete(id: string): Promise<boolean> {
    this.ensureConnected();
    const res = await VisitorModel.findByIdAndDelete(id);
    return !!res;
  }

  public async getStats(): Promise<VisitorStats> {
    if (!this.isConnectedToMongo) {
      return {
        todayTotal: 0,
        totalVisitors: 0,
        currentlyInside: 0,
        checkedOutToday: 0,
      };
    }

    const allVisitors = await this.getAll();
    const todayStr = new Date().toISOString().slice(0, 10);

    const todayCheckIns = allVisitors.filter((v) => {
      const t = v.checkInTime || v.dateTime;
      return t && t.slice(0, 10) === todayStr;
    }).length;

    const currentlyInside = allVisitors.filter((v) => v.status === 'CHECKED_IN').length;

    const checkedOutToday = allVisitors.filter((v) => {
      return v.status === 'CHECKED_OUT' && v.checkOutTime && v.checkOutTime.slice(0, 10) === todayStr;
    }).length;

    return {
      todayTotal: todayCheckIns,
      totalVisitors: allVisitors.length,
      currentlyInside,
      checkedOutToday,
    };
  }
}

export const db = new VisitorDatabase();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Visitor, VisitorFormData, VisitorStats, ReceptionDesk } from './types.js';
import { VisitorModel } from './models/Visitor.js';
import { ReceptionDeskModel } from './models/ReceptionDesk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'visitors.json');
const RECEPTION_FILE = path.join(DATA_DIR, 'receptionists.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

class VisitorDatabase {
  private visitors: Visitor[] = [];
  private receptionists: ReceptionDesk[] = [];
  public isConnectedToMongo: boolean = false;
  public mongoDbUri: string = '';
  public mongoDatabaseName: string = '';
  public mongoError: string | null = null;

  constructor() {
    this.loadLocalData();
    this.initMongoConnection().then(() => {
      this.ensurePrimaryReceptionDesk();
    });
  }

  private async initMongoConnection(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      this.mongoError = 'MONGODB_URI is not set. Data is currently in temporary mode. Please connect your live MongoDB URI to store data directly in MongoDB.';
      console.log('[VisitorPass Database] MONGODB_URI not found.');
      return;
    }

    try {
      await this.connectMongo(uri, process.env.MONGODB_DB_NAME, false);
    } catch (err: any) {
      console.error('[VisitorPass Database] Initial MongoDB connection failed:', err.message);
    }
  }

  public async connectMongo(
    rawUri: string,
    customDbName?: string,
    persistToEnv: boolean = true
  ): Promise<{
    success: boolean;
    databaseName: string;
    collectionName: string;
    mongoVisitorCount: number;
    maskedUri: string;
  }> {
    const uri = rawUri.trim();
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://');
    }

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      this.mongoDbUri = masked;

      const dbName = customDbName?.trim() || process.env.MONGODB_DB_NAME || undefined;
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        ...(dbName ? { dbName } : {}),
      });

      // Verify connection with ping
      await mongoose.connection.db?.admin().ping();

      this.isConnectedToMongo = true;
      this.mongoDatabaseName = mongoose.connection.name || (mongoose.connection.db as any)?.databaseName || 'test';
      this.mongoError = null;

      if (persistToEnv) {
        this.saveEnv('MONGODB_URI', uri);
        if (dbName) {
          this.saveEnv('MONGODB_DB_NAME', dbName);
        }
      }

      console.log(`[VisitorPass Database] LIVE MongoDB active: database="${this.mongoDatabaseName}", uri="${masked}"`);

      // Ensure receptionist desk and migrate existing records
      await this.ensurePrimaryReceptionDesk();
      await this.autoMigrateLocalDataIfEmpty();

      const count = await VisitorModel.countDocuments();

      return {
        success: true,
        databaseName: this.mongoDatabaseName,
        collectionName: 'visitors',
        mongoVisitorCount: count,
        maskedUri: masked,
      };
    } catch (err: any) {
      this.isConnectedToMongo = false;
      this.mongoError = err.message || 'Failed to connect to MongoDB';
      console.error('[VisitorPass Database] MongoDB connect error:', err.message);
      throw new Error(`MongoDB connection failed: ${err.message}`);
    }
  }

  public async disconnectMongo(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    this.isConnectedToMongo = false;
    this.mongoDatabaseName = '';
    this.mongoError = 'MongoDB disconnected by user request.';
  }

  private saveEnv(key: string, value: string): void {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
      }
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}="${value}"`;
      if (regex.test(content)) {
        content = content.replace(regex, newLine);
      } else {
        content = content.trim() ? `${content.trim()}\n${newLine}\n` : `${newLine}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
      process.env[key] = value;
    } catch (err) {
      console.error('Error saving .env file:', err);
    }
  }

  private async autoMigrateLocalDataIfEmpty(): Promise<void> {
    try {
      if (!this.isConnectedToMongo || this.visitors.length === 0) return;
      const count = await VisitorModel.countDocuments();
      if (count === 0) {
        console.log(`[VisitorPass Database] MongoDB collection "visitors" is empty. Auto-migrating ${this.visitors.length} existing local records...`);
        for (const v of this.visitors) {
          await VisitorModel.create({
            name: v.name,
            mobileNumber: v.mobileNumber,
            companyOrCollege: v.companyOrCollege,
            personToMeet: v.personToMeet,
            purposeOfVisit: v.purposeOfVisit,
            dateTime: v.dateTime || new Date().toISOString(),
            status: v.status || 'CHECKED_IN',
            checkInTime: v.checkInTime || v.dateTime || new Date().toISOString(),
            checkOutTime: v.checkOutTime || null,
            registeredByDesk: v.registeredByDesk || 'admin',
          });
        }
        console.log(`[VisitorPass Database] Auto-migration successfully stored ${this.visitors.length} visitors in MongoDB!`);
      }
    } catch (err: any) {
      console.error('[VisitorPass Database] Auto-migration error:', err.message);
    }
  }

  private loadLocalData(): void {
    ensureDataDir();
    // Visitors
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Normalize check-in / check-out status for existing records
          this.visitors = parsed.map((v: any) => ({
            ...v,
            status: v.status || (v.checkOutTime ? 'CHECKED_OUT' : 'CHECKED_IN'),
            checkInTime: v.checkInTime || v.dateTime || new Date().toISOString(),
            checkOutTime: v.checkOutTime || null,
          }));
          this.saveVisitors();
        } else {
          this.visitors = [];
          this.saveVisitors();
        }
      } else {
        this.visitors = [];
        this.saveVisitors();
      }
    } catch {
      this.visitors = [];
      this.saveVisitors();
    }

    // Receptionists
    try {
      if (fs.existsSync(RECEPTION_FILE)) {
        const raw = fs.readFileSync(RECEPTION_FILE, 'utf-8');
        this.receptionists = JSON.parse(raw);
        if (!Array.isArray(this.receptionists)) {
          this.receptionists = [];
        }
      } else {
        this.receptionists = [];
      }
    } catch {
      this.receptionists = [];
    }

    this.ensurePrimaryReceptionDesk();
  }

  private saveVisitors(): void {
    ensureDataDir();
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.visitors, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write visitors.json:', err);
    }
  }

  private saveReceptionists(): void {
    ensureDataDir();
    try {
      fs.writeFileSync(RECEPTION_FILE, JSON.stringify(this.receptionists, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write receptionists.json:', err);
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
            stationName: 'Main Reception Desk',
            isPrimary: true,
          });
        }
      } catch (err) {
        console.error('Error ensuring primary desk in Mongo:', err);
      }
      return;
    }

    const existingIdx = this.receptionists.findIndex(
      (r) => r.deskId.toLowerCase() === envDeskId
    );

    if (existingIdx === -1) {
      this.receptionists.unshift({
        id: `desk-main-${Date.now()}`,
        deskId: envDeskId,
        password: envPassword,
        stationName: 'Main Reception Desk',
        createdAt: new Date().toISOString(),
        isPrimary: true,
      });
      this.saveReceptionists();
    }
  }

  // --- RECEPTION DESKS MANAGEMENT ---

  public async getReceptionDesks(): Promise<Omit<ReceptionDesk, 'password'>[]> {
    await this.ensurePrimaryReceptionDesk();

    if (this.isConnectedToMongo) {
      const docs = await ReceptionDeskModel.find().sort({ createdAt: 1 });
      return docs.map((d) => {
        const json = d.toJSON();
        return {
          id: json.id,
          deskId: json.deskId,
          stationName: json.stationName,
          createdAt: json.createdAt,
          isPrimary: json.isPrimary,
        };
      });
    }

    return this.receptionists.map((r) => ({
      id: r.id,
      deskId: r.deskId,
      stationName: r.stationName,
      createdAt: r.createdAt,
      isPrimary: r.isPrimary,
    }));
  }

  public async findReceptionDeskForAuth(deskId: string): Promise<ReceptionDesk | null> {
    await this.ensurePrimaryReceptionDesk();
    const normalized = deskId.trim().toLowerCase();

    if (this.isConnectedToMongo) {
      const doc = await ReceptionDeskModel.findOne({ deskId: normalized });
      return doc ? (doc.toJSON() as ReceptionDesk) : null;
    }

    const found = this.receptionists.find(
      (r) => r.deskId.toLowerCase() === normalized
    );
    return found || null;
  }

  public async createReceptionDesk(data: {
    deskId: string;
    password: string;
    stationName: string;
  }): Promise<Omit<ReceptionDesk, 'password'>> {
    const normalizedDeskId = data.deskId.trim().toLowerCase();
    const stationName = data.stationName.trim() || `Reception ${normalizedDeskId.toUpperCase()}`;
    const password = data.password.trim();

    if (this.isConnectedToMongo) {
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

    const exists = this.receptionists.some(
      (r) => r.deskId.toLowerCase() === normalizedDeskId
    );
    if (exists) {
      throw new Error(`Desk ID "${normalizedDeskId}" already exists. Please choose a different ID.`);
    }

    const newDesk: ReceptionDesk = {
      id: `desk-${Date.now()}`,
      deskId: normalizedDeskId,
      password,
      stationName,
      createdAt: new Date().toISOString(),
      isPrimary: false,
    };

    this.receptionists.push(newDesk);
    this.saveReceptionists();

    return {
      id: newDesk.id,
      deskId: newDesk.deskId,
      stationName: newDesk.stationName,
      createdAt: newDesk.createdAt,
      isPrimary: false,
    };
  }

  public async deleteReceptionDesk(id: string): Promise<boolean> {
    if (this.isConnectedToMongo) {
      const count = await ReceptionDeskModel.countDocuments();
      if (count <= 1) {
        throw new Error('Cannot delete the only remaining reception desk.');
      }
      const desk = await ReceptionDeskModel.findById(id);
      if (desk?.isPrimary) {
        throw new Error('Primary reception desk configured in .env cannot be deleted.');
      }
      const res = await ReceptionDeskModel.findByIdAndDelete(id);
      return !!res;
    }

    if (this.receptionists.length <= 1) {
      throw new Error('Cannot delete the only remaining reception desk.');
    }

    const desk = this.receptionists.find((r) => r.id === id);
    if (desk?.isPrimary) {
      throw new Error('Primary reception desk configured in .env cannot be deleted.');
    }

    const initialLen = this.receptionists.length;
    this.receptionists = this.receptionists.filter((r) => r.id !== id);
    if (this.receptionists.length !== initialLen) {
      this.saveReceptionists();
      return true;
    }
    return false;
  }

  // --- VISITORS MANAGEMENT & CHECK-IN / CHECK-OUT ---

  public async getAll(search?: string, statusFilter?: string): Promise<Visitor[]> {
    if (this.isConnectedToMongo) {
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

    let results = [...this.visitors];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.mobileNumber.toLowerCase().includes(q) ||
          v.companyOrCollege.toLowerCase().includes(q) ||
          v.personToMeet.toLowerCase().includes(q)
      );
    }

    if (statusFilter && statusFilter !== 'ALL') {
      results = results.filter((v) => v.status === statusFilter);
    }

    results.sort(
      (a, b) =>
        new Date(b.checkInTime || b.dateTime).getTime() -
        new Date(a.checkInTime || a.dateTime).getTime()
    );
    return results;
  }

  public async getById(id: string): Promise<Visitor | null> {
    if (this.isConnectedToMongo) {
      const doc = await VisitorModel.findById(id);
      return doc ? (doc.toJSON() as Visitor) : null;
    }
    return this.visitors.find((v) => v.id === id) || null;
  }

  public async create(data: VisitorFormData): Promise<Visitor> {
    const now = new Date().toISOString();
    const dateTime = data.dateTime || now;
    const checkInTime = data.checkInTime || dateTime;
    const status = data.status || 'CHECKED_IN';
    const checkOutTime = data.checkOutTime || null;

    if (this.isConnectedToMongo) {
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

    const newVisitor: Visitor = {
      id: `vis-${Date.now()}`,
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
      createdAt: now,
    };

    this.visitors.unshift(newVisitor);
    this.saveVisitors();
    return newVisitor;
  }

  public async checkOut(
    id: string,
    deskId?: string,
    checkOutTime?: string
  ): Promise<Visitor | null> {
    const outTime = checkOutTime || new Date().toISOString();

    if (this.isConnectedToMongo) {
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

    const idx = this.visitors.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    this.visitors[idx] = {
      ...this.visitors[idx],
      status: 'CHECKED_OUT',
      checkOutTime: outTime,
      ...(deskId && { checkedOutByDesk: deskId }),
      updatedAt: new Date().toISOString(),
    };

    this.saveVisitors();
    return this.visitors[idx];
  }

  public async checkIn(
    id: string,
    deskId?: string,
    checkInTime?: string
  ): Promise<Visitor | null> {
    const inTime = checkInTime || new Date().toISOString();

    if (this.isConnectedToMongo) {
      const doc = await VisitorModel.findByIdAndUpdate(
        id,
        {
          status: 'CHECKED_IN',
          checkInTime: inTime,
          checkOutTime: null,
          ...(deskId && { registeredByDesk: deskId }),
        },
        { new: true }
      );
      return doc ? (doc.toJSON() as Visitor) : null;
    }

    const idx = this.visitors.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    this.visitors[idx] = {
      ...this.visitors[idx],
      status: 'CHECKED_IN',
      checkInTime: inTime,
      checkOutTime: null,
      ...(deskId && { registeredByDesk: deskId }),
      updatedAt: new Date().toISOString(),
    };

    this.saveVisitors();
    return this.visitors[idx];
  }

  public async update(id: string, data: Partial<VisitorFormData>): Promise<Visitor | null> {
    if (this.isConnectedToMongo) {
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

    const idx = this.visitors.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    const existing = this.visitors[idx];
    const updated: Visitor = {
      ...existing,
      ...(data.name && { name: data.name.trim() }),
      ...(data.mobileNumber && { mobileNumber: data.mobileNumber.trim() }),
      ...(data.companyOrCollege && { companyOrCollege: data.companyOrCollege.trim() }),
      ...(data.personToMeet && { personToMeet: data.personToMeet.trim() }),
      ...(data.purposeOfVisit && { purposeOfVisit: data.purposeOfVisit.trim() }),
      ...(data.dateTime && { dateTime: data.dateTime }),
      ...(data.status && { status: data.status }),
      ...(data.checkInTime && { checkInTime: data.checkInTime }),
      ...(data.checkOutTime !== undefined && { checkOutTime: data.checkOutTime }),
      updatedAt: new Date().toISOString(),
    };

    this.visitors[idx] = updated;
    this.saveVisitors();
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    if (this.isConnectedToMongo) {
      const res = await VisitorModel.findByIdAndDelete(id);
      return !!res;
    }

    const initialLen = this.visitors.length;
    this.visitors = this.visitors.filter((v) => v.id !== id);
    if (this.visitors.length !== initialLen) {
      this.saveVisitors();
      return true;
    }
    return false;
  }

  public async getStats(): Promise<VisitorStats> {
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

  public async getDbStatus(): Promise<{
    isConnected: boolean;
    storageType: string;
    databaseName: string | null;
    collectionName: string;
    maskedUri: string | null;
    mongoVisitorCount: number;
    localVisitorCount: number;
    error: string | null;
  }> {
    let mongoCount = 0;
    let dbName: string | null = null;
    if (this.isConnectedToMongo) {
      try {
        mongoCount = await VisitorModel.countDocuments();
        dbName = this.mongoDatabaseName || mongoose.connection.name || (mongoose.connection.db as any)?.databaseName || null;
      } catch {
        // ignore
      }
    }

    return {
      isConnected: this.isConnectedToMongo,
      storageType: this.isConnectedToMongo ? 'MongoDB' : 'Local File Storage (data/visitors.json)',
      databaseName: dbName,
      collectionName: 'visitors',
      maskedUri: this.mongoDbUri || null,
      mongoVisitorCount: mongoCount,
      localVisitorCount: this.visitors.length,
      error: this.mongoError || null,
    };
  }

  public async migrateLocalVisitorsToMongo(): Promise<{ migrated: number; total: number }> {
    if (!this.isConnectedToMongo) {
      throw new Error(
        this.mongoError || 'MongoDB is not connected. Please verify your MONGODB_URI configuration.'
      );
    }

    let migrated = 0;
    for (const v of this.visitors) {
      const exists = await VisitorModel.findOne({
        mobileNumber: v.mobileNumber,
        name: v.name,
      });

      if (!exists) {
        await VisitorModel.create({
          name: v.name,
          mobileNumber: v.mobileNumber,
          companyOrCollege: v.companyOrCollege,
          personToMeet: v.personToMeet,
          purposeOfVisit: v.purposeOfVisit,
          dateTime: v.dateTime || new Date().toISOString(),
          status: v.status || 'CHECKED_IN',
          checkInTime: v.checkInTime || v.dateTime || new Date().toISOString(),
          checkOutTime: v.checkOutTime || null,
          registeredByDesk: v.registeredByDesk || 'admin',
        });
        migrated++;
      }
    }

    return { migrated, total: this.visitors.length };
  }
}

export const db = new VisitorDatabase();

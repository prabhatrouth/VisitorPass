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

  constructor() {
    this.loadLocalData();
    this.initMongoConnection().then(() => {
      this.ensurePrimaryReceptionDesk();
    });
  }

  private async initMongoConnection(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return;
    }

    try {
      this.mongoDbUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      await mongoose.connect(uri);
      this.isConnectedToMongo = true;
      console.log(`Connected to MongoDB successfully: ${this.mongoDbUri}`);
    } catch (err: any) {
      console.error('Failed to connect to MongoDB, using local file storage:', err.message);
      this.isConnectedToMongo = false;
    }
  }

  private loadLocalData(): void {
    ensureDataDir();
    // Visitors
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.visitors = JSON.parse(raw);
        if (!Array.isArray(this.visitors)) {
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

  // --- VISITORS MANAGEMENT ---

  public async getAll(search?: string): Promise<Visitor[]> {
    if (this.isConnectedToMongo) {
      const query: any = {};
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ name: regex }, { mobileNumber: regex }];
      }
      const docs = await VisitorModel.find(query).sort({ dateTime: -1 });
      return docs.map((d) => d.toJSON() as Visitor);
    }

    let results = [...this.visitors];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.mobileNumber.toLowerCase().includes(q)
      );
    }

    results.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
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

    if (this.isConnectedToMongo) {
      const doc = await VisitorModel.create({
        name: data.name.trim(),
        mobileNumber: data.mobileNumber.trim(),
        companyOrCollege: data.companyOrCollege.trim(),
        personToMeet: data.personToMeet.trim(),
        purposeOfVisit: data.purposeOfVisit.trim(),
        dateTime,
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
      registeredByDesk: data.registeredByDesk || 'admin',
    };

    this.visitors.unshift(newVisitor);
    this.saveVisitors();
    return newVisitor;
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
      id: existing.id,
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
    const todayCount = allVisitors.filter((v) => v.dateTime.slice(0, 10) === todayStr).length;

    return {
      todayTotal: todayCount,
      totalVisitors: allVisitors.length,
    };
  }
}

export const db = new VisitorDatabase();

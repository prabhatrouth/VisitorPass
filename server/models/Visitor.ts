import mongoose, { Schema, Document } from 'mongoose';

export type VisitorStatus = 'CHECKED_IN' | 'CHECKED_OUT';

export interface IVisitorDoc extends Document {
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
  createdAt: string;
  updatedAt: string;
}

const visitorSchema = new Schema<IVisitorDoc>(
  {
    name: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    companyOrCollege: { type: String, required: true, trim: true },
    personToMeet: { type: String, required: true, trim: true },
    purposeOfVisit: { type: String, required: true, trim: true },
    dateTime: { type: String, required: true, default: () => new Date().toISOString() },
    status: {
      type: String,
      enum: ['CHECKED_IN', 'CHECKED_OUT'],
      default: 'CHECKED_IN',
    },
    checkInTime: {
      type: String,
      default: () => new Date().toISOString(),
    },
    checkOutTime: {
      type: String,
      default: null,
    },
    registeredByDesk: {
      type: String,
      default: 'admin',
    },
    checkedOutByDesk: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

visitorSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (_doc, ret: any) {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  },
});

export const VisitorModel =
  mongoose.models.Visitor || mongoose.model<IVisitorDoc>('Visitor', visitorSchema);

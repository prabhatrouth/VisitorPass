import mongoose, { Schema, Document } from 'mongoose';

export interface IReceptionDeskDoc extends Document {
  deskId: string;
  password: string;
  stationName: string;
  createdAt: Date;
  isPrimary: boolean;
}

const ReceptionDeskSchema: Schema = new Schema(
  {
    deskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    stationName: {
      type: String,
      required: true,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ReceptionDeskModel =
  mongoose.models.ReceptionDesk ||
  mongoose.model<IReceptionDeskDoc>('ReceptionDesk', ReceptionDeskSchema);

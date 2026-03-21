import mongoose from 'mongoose';
import { VALID_ROLES } from '../../shared/roles.js';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    role: {
      type: String,
      enum: VALID_ROLES,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model('User', UserSchema);

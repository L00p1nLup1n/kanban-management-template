import mongoose from 'mongoose';

const { Schema } = mongoose;

const VALID_ROLES = [
  'project_manager',
  'business_analyst',
  'developer',
  'designer',
  'qa_tester',
  'devops_engineer',
  'scrum_master',
];

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

export { VALID_ROLES };

export default mongoose.model('User', UserSchema);

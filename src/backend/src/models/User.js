import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
}, { timestamps: true });

export default mongoose.model('User', UserSchema);

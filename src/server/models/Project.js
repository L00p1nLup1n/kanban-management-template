import mongoose from 'mongoose';

const { Schema } = mongoose;

const ColumnSchema = new Schema({
  id: { type: String, required: true },
  key: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true },
  // optional WIP limit for the column
  wip: { type: Number },
});

const ProjectSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    columns: [ColumnSchema],
    // users who joined this project (excluding owner)
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // short join code used for inviting members
    joinCode: { type: String, index: true },
  },
  { timestamps: true },
);

// Index for faster queries by owner
ProjectSchema.index({ ownerId: 1 });

// strip __v from json responses
ProjectSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Project', ProjectSchema);

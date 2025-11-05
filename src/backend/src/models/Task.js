import mongoose from 'mongoose';

const { Schema } = mongoose;

const TaskSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    // columnKey may be undefined for backlog tasks
    columnKey: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    color: { type: String },
    order: { type: Number, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    labels: [{ type: String }],
    estimate: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    backlog: { type: Boolean, default: false },
}, { timestamps: true });

// Indexes for efficient queries
TaskSchema.index({ projectId: 1, columnKey: 1, order: 1 });

export default mongoose.model('Task', TaskSchema);

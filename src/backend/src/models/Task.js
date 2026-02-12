import mongoose from 'mongoose';

const { Schema } = mongoose;

const TaskSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    sprintId: { type: Schema.Types.ObjectId, ref: 'Sprint' },
    // columnKey may be undefined for backlog tasks
    columnKey: { type: String },
    title: { type: String },
    description: { type: String },
    color: { type: String },
    order: { type: Number, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    labels: [{ type: String }],
    estimate: { type: Number },
    dueDate: { type: Date },
    // Scrumban properties
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    backlog: { type: Boolean, default: false },
    // Status timestamps
    committedAt: { type: Date },   // when task entered the board (pulled from backlog or created on board)
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes for efficient queries
TaskSchema.index({ projectId: 1, sprintId: 1, order: 1 });
TaskSchema.index({ projectId: 1, columnKey: 1, order: 1 });

export default mongoose.model('Task', TaskSchema);

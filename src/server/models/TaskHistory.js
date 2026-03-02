import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * TaskHistory records every column transition for a task.
 * Used to compute Cumulative Flow Diagrams (CFD) and per-column time metrics.
 *
 * Examples:
 *   backlog → todo:        { fromColumn: null,  toColumn: 'todo',       fromBacklog: true,  toBacklog: false }
 *   todo → inprogress:     { fromColumn: 'todo', toColumn: 'inprogress', fromBacklog: false, toBacklog: false }
 *   inprogress → backlog:  { fromColumn: 'inprogress', toColumn: null,  fromBacklog: false, toBacklog: true  }
 *   created on board:      { fromColumn: null,  toColumn: 'todo',       fromBacklog: false, toBacklog: false }
 *   created in backlog:    { fromColumn: null,  toColumn: null,         fromBacklog: false, toBacklog: true  }
 */
const TaskHistorySchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  // Column keys (null when backlog)
  fromColumn: { type: String, default: null },
  toColumn: { type: String, default: null },
  // Backlog flags for clarity
  fromBacklog: { type: Boolean, default: false },
  toBacklog: { type: Boolean, default: false },
  // Who triggered the transition
  movedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  movedAt: { type: Date, default: Date.now },
});

// Fast lookups: per-task timeline and per-project CFD queries
TaskHistorySchema.index({ taskId: 1, movedAt: 1 });
TaskHistorySchema.index({ projectId: 1, movedAt: 1 });

export default mongoose.model('TaskHistory', TaskHistorySchema);

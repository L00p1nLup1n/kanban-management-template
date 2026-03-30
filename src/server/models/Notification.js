import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'invitation',
        'task_assigned',
        'member_joined',
        'member_removed',
        'project_updated',
        'general',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
    actionUrl: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

NotificationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Notification', NotificationSchema);

import mongoose from 'mongoose';

const { Schema } = mongoose;

const InvitationSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
    },
    message: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

InvitationSchema.index({ projectId: 1, recipientId: 1, status: 1 });
InvitationSchema.index({ recipientId: 1, status: 1 });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

InvitationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Invitation', InvitationSchema);

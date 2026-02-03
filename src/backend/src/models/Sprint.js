import mongoose from 'mongoose';

const { Schema } = mongoose;

const SprintSchema = new Schema(
    {
        projectId: {
            type: Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        goal: { type: String },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ['planning', 'active', 'completed', 'archived'],
            default: 'planning',
        },
        capacity: { type: Number, default: 0 },
        completedPoints: { type: Number, default: 0 },
        retrospective: {
            whatWentWell: [String],
            whatCouldImprove: [String],
            actionItems: [String],
        },
    },
    { timestamps: true },
);

SprintSchema.index({ projectId: 1, status: 1 });

SprintSchema.pre('save', async function (next) {
    if (this.status === 'active' && !this.isModified('status')) {
        next();
        return;
    }
    if (this.status === 'active') {
        const existing = await this.constructor.findOne({
            projectId: this.projectId,
            status: 'active',
            _id: { $ne: this._id },
        });
        if (existing) {
            throw new Error('Only one active sprint allowed per project');
        }
    }
    if (this.startDate >= this.endDate) {
        next(new Error('Start date cannot be after end date'));
    }
    next();
});

export default mongoose.model('Sprint', SprintSchema);

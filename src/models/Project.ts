import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const projectSchema = new Schema(
  {
    name: { type: String },
    companyName: { type: String },
    clientName: { type: String },
    websiteName: { type: String },
    ownerUser: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    ownerFreelancer: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    description: String,
    progress: Number,
    startDate: String,
    dueDate: String,
    taxNumber: String,
    services: [{}],
    images: [{}],
    files: [{}],
    avatar: String,
    hoursWorked: Number,
  },
  { timestamps: true },
);

export default mongoose.model('project', projectSchema);

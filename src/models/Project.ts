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
    text: String,
    progress: Number,
    startDate: Date,
    dueDate: Date,
    images: [[String, String]],
    files: [[String, String]],
    hoursWorked: Number,
  },
  { timestamps: true },
);

export default mongoose.model('project', projectSchema);

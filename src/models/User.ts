import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: { type: String, required: true, min: 2, max: 25 },
    email: { type: String, required: true, unique: true, min: 3, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: 'Client' },
    verifiedEmail: { type: Boolean, default: false },
    lastRequestResetPassword: Number,
    messages: [{ type: mongoose.Types.ObjectId, required: false, ref: 'message' }],
    projects: [{ type: mongoose.Types.ObjectId, required: false, ref: 'project' }],
    users: [{ type: mongoose.Types.ObjectId, required: false, ref: 'user' }],
    freelancers: [{ type: mongoose.Types.ObjectId, required: false, ref: 'user' }],
    identityCardNumber: { type: String, required: false, unique: true, sparse: true },
    phone: String,
    taxNumber: String,
    paymentMethod: String,
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

export default mongoose.model('user', userSchema);

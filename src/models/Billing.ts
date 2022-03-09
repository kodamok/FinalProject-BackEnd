import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const billingSchema = new Schema(
  {
    text: String,
    user: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    taxNumber: String,
    service: [[String, Number, String]],
    total: Number,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('billing', billingSchema);

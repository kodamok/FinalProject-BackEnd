import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    text: { type: String, required: true },
    user: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    name: String,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('message', messageSchema);

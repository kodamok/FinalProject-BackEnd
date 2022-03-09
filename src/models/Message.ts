import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    text: { type: String, required: true },
    creator: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    receiver: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    nameCreator: String,
    nameReceiver: String,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('message', messageSchema);

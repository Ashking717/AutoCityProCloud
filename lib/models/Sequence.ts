import mongoose, { Schema } from 'mongoose';

const SequenceSchema = new Schema(
  {
    _id: { type: String, required: true },
    value: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

const Sequence = mongoose.models.Sequence
  || mongoose.model('Sequence', SequenceSchema);

export default Sequence;

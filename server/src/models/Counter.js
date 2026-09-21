import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const Counter = mongoose.model('Counter', counterSchema);
export default Counter;

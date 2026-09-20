import mongoose, { Schema } from 'mongoose';

const attachmentSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'Associated issue is required'],
      index: true,
    },
    uploader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user is required'],
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters'],
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      unique: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [1, 'File cannot be empty'],
      max: [5242880, 'File size cannot exceed 5MB (5242880 bytes)'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Attachment = mongoose.model('Attachment', attachmentSchema);
export default Attachment;

import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Project key must be at least 2 characters'],
      maxlength: [10, 'Project key cannot exceed 10 characters'],
      match: [/^[A-Z0-9]+$/, 'Project key must contain only uppercase alphanumeric characters (e.g. BUG, PROJ1)'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Project description cannot exceed 500 characters'],
      default: '',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Unique index on key is created by unique: true
export const Project = mongoose.model('Project', projectSchema);

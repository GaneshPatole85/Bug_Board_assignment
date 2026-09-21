import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ROLES_LIST } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Prevent password hash from leaking in queries by default
    },
    role: {
      type: String,
      required: [true, 'User role is required'],
      enum: {
        values: ROLES_LIST,
        message: 'Role "{VALUE}" is invalid. Must be Admin, Developer, or Tester',
      },
      default: ROLES.DEVELOPER,
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^[A-Za-z0-9_-]{3,20}$/, 'Employee ID must be 3-20 characters long (letters, numbers, hyphens, underscores)'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters'],
    },
    avatarUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+$/, 'Avatar URL must be a valid HTTP or HTTPS URL'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordResetTokenHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordResetTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-save middleware to securely hash password before persisting.
 * Uses bcrypt with cost factor 12.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  // Only hash if not already a 60-char bcrypt hash
  const isAlreadyHashed = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.passwordHash);
  if (!isAlreadyHashed) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

/**
 * Instance method to compare candidate password against stored bcrypt hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not selected in query');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);

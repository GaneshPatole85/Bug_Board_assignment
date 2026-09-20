import mongoose from 'mongoose';
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
  },
  {
    timestamps: true,
  }
);

// Unique index on email is created by unique: true
export const User = mongoose.model('User', userSchema);

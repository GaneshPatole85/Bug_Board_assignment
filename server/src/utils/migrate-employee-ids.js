import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { generateEmployeeId } from '../services/user.service.js';
import { logger } from './logger.js';

/**
 * Migration script to backfill sequential, role-prefixed employee IDs
 * for all existing users currently lacking one.
 *
 * Ordered by createdAt ascending so sequence mirrors account creation order.
 * Idempotent: Subsequent runs find 0 unassigned users and make 0 changes.
 */
export const migrateEmployeeIds = async () => {
  const usersMissingId = await User.find({
    $or: [{ employeeId: { $exists: false } }, { employeeId: null }, { employeeId: '' }],
  }).sort({ createdAt: 1 });

  if (usersMissingId.length === 0) {
    console.log('✨ No users found missing employeeId. Migration already complete or not needed.');
    return { count: 0, users: [] };
  }

  console.log(`\n📋 Found ${usersMissingId.length} user(s) missing employeeId. Backfilling sequentially...\n`);

  const updatedUsers = [];
  for (const user of usersMissingId) {
    const newEmployeeId =
      user.role === 'Admin'
        ? env.ADMIN_EMPLOYEE_ID || 'ADM-0001'
        : await generateEmployeeId(user.role);
    user.employeeId = newEmployeeId;
    await user.save();
    console.log(`  • Assigned ${newEmployeeId} to ${user.name} (${user.role} - ${user.email})`);
    updatedUsers.push({ id: user._id, name: user.name, role: user.role, employeeId: newEmployeeId });
  }

  console.log(`\n✅ Successfully backfilled ${updatedUsers.length} user(s).\n`);
  return { count: updatedUsers.length, users: updatedUsers };
};

export const runMigration = async () => {
  let shouldClose = false;
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.info({ uri: env.MONGODB_URI }, 'Connecting to MongoDB for employee ID migration...');
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      shouldClose = true;
      logger.info('Connected to MongoDB.');
    }

    console.log('\n=============================================================');
    console.log('🔄 BugBoard Employee ID Backfill Migration');
    console.log('=============================================================\n');

    await migrateEmployeeIds();

    if (shouldClose) {
      await mongoose.connection.close();
      logger.info('Database connection closed. Migration finished.');
    }
  } catch (error) {
    logger.fatal({ err: error.message }, 'Migration failed');
    console.error('❌ Migration failed:', error.message);
    if (shouldClose) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('migrate-employee-ids.js')) {
  runMigration();
}

export default migrateEmployeeIds;

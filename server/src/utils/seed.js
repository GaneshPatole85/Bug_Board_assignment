import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { logger } from './logger.js';

export const SEED_ACCOUNTS = [
  {
    name: 'Admin User',
    email: 'admin@bugboard.test',
    password: 'Password123!',
    role: ROLES.ADMIN,
  },
  {
    name: 'Lead Developer',
    email: 'dev@bugboard.test',
    password: 'Password123!',
    role: ROLES.DEVELOPER,
  },
  {
    name: 'QA Tester',
    email: 'tester@bugboard.test',
    password: 'Password123!',
    role: ROLES.TESTER,
  },
];

export const seedDatabase = async () => {
  try {
    logger.info({ uri: env.MONGODB_URI }, 'Connecting to MongoDB for seeding...');
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('Connected to MongoDB.');

    console.log('\n=============================================================');
    console.log('🌱 BugBoard Database Seeder — Phase 2 Sample Login Accounts');
    console.log('=============================================================\n');

    for (const account of SEED_ACCOUNTS) {
      const existing = await User.findOne({ email: account.email });
      if (existing) {
        console.log(`ℹ️ Account already exists: ${account.email} (${account.role}) - Skipping`);
      } else {
        const user = new User({
          name: account.name,
          email: account.email,
          passwordHash: account.password, // Pre-save hook will hash with bcrypt cost factor 12
          role: account.role,
        });
        await user.save();
        console.log(`✅ Created: ${account.name} | ${account.email} | ${account.role}`);
      }
    }

    console.log('\n-------------------------------------------------------------');
    console.log('🔑 SAMPLE CREDENTIALS FOR REVIEWERS:');
    console.log('-------------------------------------------------------------');
    console.table(
      SEED_ACCOUNTS.map((acc) => ({
        Role: acc.role,
        Email: acc.email,
        Password: acc.password,
      }))
    );
    console.log('=============================================================\n');

    await mongoose.connection.close();
    logger.info('Database connection closed. Seeding complete.');
  } catch (error) {
    logger.fatal({ err: error.message }, 'Seeding failed');
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}

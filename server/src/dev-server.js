import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import { SEED_ACCOUNTS } from './utils/seed.js';

const startDev = async () => {
  console.log('\n⏳ Initializing In-Memory MongoDB Engine for development...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  process.env.MONGODB_URI = uri;

  // Dynamically import application modules with the memory URI configured
  const { connectDB, setupGracefulShutdown } = await import('./config/db.js');
  const { default: app } = await import('./app.js');
  const { env } = await import('./config/env.js');
  const { User } = await import('./models/User.js');

  env.MONGODB_URI = uri;
  await connectDB();

  // Automatically seed the 3 interview demo accounts
  for (const account of SEED_ACCOUNTS) {
    const existing = await User.findOne({ email: account.email });
    if (!existing) {
      const user = new User({
        name: account.name,
        email: account.email,
        passwordHash: account.password, // Pre-save hook hashes with bcrypt
        role: account.role,
      });
      await user.save();
    }
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`BugBoard API server running on http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    console.log('\n=============================================================');
    console.log('🎉 BUGBOARD BACKEND RUNNING WITH IN-MEMORY MONGODB');
    console.log('=============================================================');
    console.log(`📡 Backend API: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    console.log(`💚 Health Check: http://localhost:${env.PORT}/api/${env.API_VERSION}/health`);
    console.log('\n🔑 Pre-Seeded Sample Accounts (Ready to Log In):');
    console.log('   👑 Admin:     admin@bugboard.test  / Password123!');
    console.log('   💻 Developer: dev@bugboard.test    / Password123!');
    console.log('   🔍 Tester:    tester@bugboard.test / Password123!');
    console.log('=============================================================\n');
  });

  setupGracefulShutdown(server);
};

startDev().catch((err) => {
  logger.fatal({ err }, 'Failed to start in-memory development server');
  console.error('❌ Dev server error:', err);
  process.exit(1);
});

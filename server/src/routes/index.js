import { Router } from 'express';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

// Mount sub-routers
apiRouter.use('/health', healthRoutes);

// Stubs for Phase 2/3 routers:
// apiRouter.use('/auth', authRoutes);         // Phase 2
// apiRouter.use('/users', userRoutes);       // Phase 2
// apiRouter.use('/projects', projectRoutes); // Phase 3
// apiRouter.use('/issues', issueRoutes);     // Phase 3

export default apiRouter;

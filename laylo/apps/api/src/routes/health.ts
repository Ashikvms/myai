import { Router } from 'express';

const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

export { healthRouter };

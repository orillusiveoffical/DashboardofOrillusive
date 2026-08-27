import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: Error & { errors?: { path: (string | number)[]; message: string }[] },
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  if (err instanceof ZodError || err.name === 'ZodError') {
    const details = (err.errors || []).map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details,
    });
  }

  console.error(`[Server Error] ${req.method} ${req.originalUrl}`);
  console.error('  Params:', JSON.stringify(req.params));
  console.error('  Query:', JSON.stringify(req.query));
  console.error('  Stack:', err.stack || err);

  const isDev = process.env.NODE_ENV !== 'production';

  return res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
}

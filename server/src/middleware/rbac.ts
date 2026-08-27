import { Request, Response, NextFunction } from 'express';

export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'STAFF';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  STAFF: 1,
  MANAGER: 2,
  OWNER: 3,
  SUPER_ADMIN: 4,
};

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const userRole = req.user.role;

    if (allowedRoles.includes(userRole) || userRole === 'SUPER_ADMIN') {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
    });
  };
}

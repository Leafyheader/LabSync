import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'STAFF', 'SUPERADMIN'])
});

const updateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'STAFF', 'SUPERADMIN']).optional()
});

// Get all users (Admin and SuperAdmin only)
router.get('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { search, role } = req.query;
    
    interface WhereCondition {
      OR?: Array<{
        username?: { contains: string };
        name?: { contains: string };
      }>;
      role?: string;
    }

    const where: WhereCondition = {};

    if (search) {
      where.OR = [
        { username: { contains: search as string } },
        { name: { contains: search as string } }
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role as string;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (Admin and SuperAdmin only)
router.get('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Create new user (Admin and SuperAdmin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const currentUser = req.user!;

    // Only SuperAdmin can create SuperAdmin users
    if (data.role === 'SUPERADMIN' && currentUser.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only SuperAdmin can create SuperAdmin users' });
    }

    // Admin cannot create other Admin users unless they are SuperAdmin
    if (data.role === 'ADMIN' && currentUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin cannot create other Admin users' });
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        role: data.role
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// Update user (Admin and SuperAdmin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);
    const currentUser = req.user!;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent users from editing themselves
    if (existingUser.id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot edit your own account through user management' });
    }

    // Only SuperAdmin can modify SuperAdmin users
    if (existingUser.role === 'SUPERADMIN' && currentUser.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only SuperAdmin can modify SuperAdmin users' });
    }

    // Only SuperAdmin can set SUPERADMIN role
    if (data.role === 'SUPERADMIN' && currentUser.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only SuperAdmin can assign SuperAdmin role' });
    }

    // Admin cannot modify other Admin users unless they are SuperAdmin
    if (existingUser.role === 'ADMIN' && currentUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin cannot modify other Admin users' });
    }

    // Admin cannot set ADMIN role unless they are SuperAdmin
    if (data.role === 'ADMIN' && currentUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin cannot assign Admin role' });
    }

    // Check username uniqueness if changing username
    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: data.username }
      });

      if (usernameExists) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // Prepare update data
    interface UpdateData {
      username?: string;
      name?: string;
      role?: string;
      password?: string;
    }

    const updateData: UpdateData = {};
    
    if (data.username) updateData.username = data.username;
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Delete user (Admin and SuperAdmin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent users from deleting themselves
    if (existingUser.id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Only SuperAdmin can delete SuperAdmin users
    if (existingUser.role === 'SUPERADMIN' && currentUser.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only SuperAdmin can delete SuperAdmin users' });
    }

    // Admin cannot delete other Admin users unless they are SuperAdmin
    if (existingUser.role === 'ADMIN' && currentUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admin cannot delete other Admin users' });
    }

    // Note: Transaction history is preserved even after user deletion
    // If you need to track user relationships with transactions, consider adding a createdById field to the Transaction model

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user statistics (Admin and SuperAdmin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [
      totalUsers,
      adminCount,
      staffCount,
      superAdminCount,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'STAFF' } }),
      prisma.user.count({ where: { role: 'SUPERADMIN' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true
        }
      })
    ]);

    res.json({
      totalUsers,
      roleDistribution: {
        SUPERADMIN: superAdminCount,
        ADMIN: adminCount,
        STAFF: staffCount
      },
      recentUsers
    });
  } catch (error) {
    next(error);
  }
});

export default router;

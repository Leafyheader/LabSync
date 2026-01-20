import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, requireAdmin, authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const labTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional()
});

const updateLabTestSchema = labTestSchema.partial();

// Get all lab tests
router.get('/', async (req, res, next) => {
  try {
    const { search, category, page = '1', limit = '10' } = req.query;
    
    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10)); // Cap at 100 items per page
    const skip = (pageNum - 1) * limitNum;
    
    const where: {
      isActive: boolean;
      OR?: Array<{ [key: string]: { contains: string } }>;
      category?: { contains: string };
    } = {
      isActive: true
    };

    if (search) {
      const s = String(search).trim();
      where.OR = [
        { name: { contains: s } },
        { description: { contains: s } }
      ];
    }

    if (category) {
      where.category = { contains: String(category).trim() };
    }

    // Get total count for pagination
    const total = await prisma.labTest.count({ where });
    
    // Get paginated results
    const tests = await prisma.labTest.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({ 
      tests,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    });
  } catch (error) {
    next(error);
  }
});

// Get lab test by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const test = await prisma.labTest.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Lab test not found' });
    }

    res.json({ test });
  } catch (error) {
    next(error);
  }
});

// Create new lab test (Authenticated users)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = labTestSchema.parse(req.body);

    const test = await prisma.labTest.create({
      data: {
        name: data.name,
        price: data.price,
        category: data.category,
        description: data.description
      },
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({ test });
  } catch (error) {
    next(error);
  }
});

// Update lab test (Admin only)
router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = updateLabTestSchema.parse(req.body);

    const test = await prisma.labTest.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ test });
  } catch (error) {
    next(error);
  }
});

// Delete lab test (Admin only)
router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    await prisma.labTest.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Lab test deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

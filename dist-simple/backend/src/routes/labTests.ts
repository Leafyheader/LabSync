import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';

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
    const { search, category } = req.query;
    
    const where: any = {
      isActive: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }

    if (category) {
      where.category = category;
    }

    const tests = await prisma.labTest.findMany({
      where,
      orderBy: { name: 'asc' },
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

    res.json({ tests });
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

// Create new lab test (Admin only)
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res, next) => {
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

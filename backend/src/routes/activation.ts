import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const activationCheckSchema = z.object({
  code: z.string().min(1, 'Activation code is required')
});

const activationUpdateSchema = z.object({
  code: z.string().min(1, 'Activation code is required'),
  status: z.enum(['ON', 'OFF']),
  activateAt: z.string().optional().transform((val) => val ? new Date(val) : null)
});

// Check if activation is required and validate code (public endpoint)
router.post('/check', async (req, res, next) => {
  try {
    const { code } = activationCheckSchema.parse(req.body);

    // Find the activation record with this code
    const activation = await prisma.activation.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        activateAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!activation) {
      return res.status(404).json({
        valid: false,
        requiresActivation: true,
        message: 'Invalid activation code. Please check your code and try again.',
        error: 'Invalid activation code'
      });
    }

    if (activation.status === 'OFF') {
      return res.status(400).json({
        valid: false,
        requiresActivation: true,
        message: 'This activation code has already been used or is disabled',
        error: 'Activation code is disabled'
      });
    }

    // Check if activation date has passed (if specified)
    if (activation.activateAt && new Date() < new Date(activation.activateAt)) {
      return res.status(400).json({
        valid: false,
        requiresActivation: true,
        message: 'This activation code is not yet active',
        error: 'Activation code not yet active'
      });
    }

    // AUTOMATICALLY DISABLE THE CODE AFTER SUCCESSFUL VALIDATION
    await prisma.activation.update({
      where: { code },
      data: { 
        status: 'OFF',
        updatedAt: new Date()
      }
    });

    res.json({
      valid: true,
      requiresActivation: true,
      message: 'Activation code is valid and has been consumed',
      serverTime: new Date().toISOString(), // Include server timestamp
      activation: {
        ...activation,
        status: 'OFF' // Return updated status
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get current activation status (public endpoint)
router.get('/status', async (req, res, next) => {
  try {
    const now = new Date();
    
    // Check if there are any activation codes that should be active
    const activeActivations = await prisma.activation.findMany({
      where: { 
        status: 'ON',
        OR: [
          { activateAt: null }, // No date specified, active immediately
          { activateAt: { lte: now } } // Date specified and has passed
        ]
      },
      select: {
        id: true,
        code: true,
        status: true,
        activateAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const requiresActivation = activeActivations.length > 0;

    res.json({
      requiresActivation,
      activeCount: activeActivations.length,
      serverTime: now.toISOString(), // Include server timestamp
      lastUpdated: activeActivations.length > 0 
        ? activeActivations.sort((a: any, b: any) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0].updatedAt 
        : null
    });

  } catch (error) {
    next(error);
  }
});

// Manage activation codes (create/update) - SUPERADMIN only
router.post('/manage', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { code, status, activateAt } = activationUpdateSchema.parse(req.body);

    const activation = await prisma.activation.upsert({
      where: { code },
      update: { 
        status,
        activateAt,
        updatedAt: new Date()
      },
      create: {
        code,
        status,
        activateAt
      },
      select: {
        id: true,
        code: true,
        status: true,
        activateAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: `Activation code ${activation.code} ${status === 'ON' ? 'enabled' : 'disabled'}`,
      activation
    });

  } catch (error) {
    next(error);
  }
});

// Get all activation records - SUPERADMIN only
router.get('/', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const activations = await prisma.activation.findMany({
      select: {
        id: true,
        code: true,
        status: true,
        activateAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      activations
    });

  } catch (error) {
    next(error);
  }
});

// Delete activation record - SUPERADMIN only
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.activation.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Activation record deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Get server time for client validation (public endpoint)
router.get('/time', async (req, res, next) => {
  try {
    const serverTime = new Date();
    
    res.json({
      serverTime: serverTime.toISOString(),
      timestamp: serverTime.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    });

  } catch (error) {
    next(error);
  }
});

export default router;
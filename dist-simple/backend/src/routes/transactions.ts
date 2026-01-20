import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const transactionSchema = z.object({
  customerId: z.string().optional(),
  customer: z.object({
    name: z.string().min(1, 'Customer name is required'),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal(''))
  }).optional(),
  selectedTests: z.array(z.object({
    testId: z.string(),
    quantity: z.number().positive()
  })).min(1, 'At least one test is required'),
  paymentMethod: z.enum(['CASH', 'MOMO'])
});

// Generate reference number
const generateReferenceNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LAB${timestamp}${random}`;
};

// Get all transactions
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentMethod, search } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search as string } },
        { customer: { name: { contains: search as string } } }
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          customer: true,
          selectedTests: {
            include: {
              labTest: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        selectedTests: {
          include: {
            labTest: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

// Create new transaction
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('📝 Creating new transaction with data:', req.body);
    const data = transactionSchema.parse(req.body);
    console.log('✅ Transaction data validated:', data);

    // Calculate total cost
    const testIds = data.selectedTests.map(t => t.testId);
    const tests = await prisma.labTest.findMany({
      where: { id: { in: testIds }, isActive: true }
    });

    if (tests.length !== testIds.length) {
      return res.status(400).json({ error: 'Some tests are not available' });
    }

    const totalCost = data.selectedTests.reduce((total, selectedTest) => {
      const test = tests.find(t => t.id === selectedTest.testId);
      return total + (Number(test!.price) * selectedTest.quantity);
    }, 0);

    // Handle customer
    let customerId = data.customerId;
    if (!customerId && data.customer) {
      // Create new customer or find existing
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          name: data.customer.name,
          phone: data.customer.phone || null
        }
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            name: data.customer.name,
            phone: data.customer.phone || null,
            email: data.customer.email || null
          }
        });
        customerId = newCustomer.id;
      }
    }

    if (!customerId) {
      return res.status(400).json({ error: 'Customer information is required' });
    }

    // Create transaction
    console.log('💳 Creating transaction with total cost:', totalCost);
    const transaction = await prisma.transaction.create({
      data: {
        referenceNumber: generateReferenceNumber(),
        customerId,
        totalCost,
        paymentMethod: data.paymentMethod,
        status: 'COMPLETED',
        selectedTests: {
          create: data.selectedTests.map(test => ({
            labTestId: test.testId,
            quantity: test.quantity
          }))
        }
      },
      include: {
        customer: true,
        selectedTests: {
          include: {
            labTest: true
          }
        }
      }
    });

    console.log('✅ Transaction created in database:', transaction);
    res.status(201).json({ transaction });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    next(error);
  }
});

// Update transaction status
router.patch('/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED'])
    }).parse(req.body);

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        selectedTests: {
          include: {
            labTest: true
          }
        }
      }
    });

    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

// Delete transaction (Admin only)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin (this assumes auth middleware adds user to req)
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators can delete transactions' });
    }

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Delete transaction (cascade will handle related records)
    await prisma.transaction.delete({
      where: { id }
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

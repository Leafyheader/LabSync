import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal(''))
});

const updateCustomerSchema = customerSchema.partial();

// Get all customers
router.get('/', async (req, res, next) => {
  try {
    console.log('🔍 Getting customers with query:', req.query);
    const { search } = req.query;
    
    const where: any = {};

    if (search) {
      console.log('🔍 Searching for:', search);
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        _count: {
          select: { transactions: true }
        }
      }
    });

    console.log('✅ Found customers:', customers.length);
    res.json({ customers });
  } catch (error) {
    console.error('❌ Error getting customers:', error);
    next(error);
  }
});

// Get customer by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            selectedTests: {
              include: {
                labTest: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    next(error);
  }
});

// Create new customer
router.post('/', async (req, res, next) => {
  try {
    console.log('📝 Creating new customer with data:', req.body);
    const data = customerSchema.parse(req.body);
    console.log('✅ Customer data validated:', data);

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true
      }
    });

    console.log('✅ Customer created in database:', customer);
    res.status(201).json({ customer });
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    next(error);
  }
});

// Update customer
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ customer });
  } catch (error) {
    next(error);
  }
});

export default router;

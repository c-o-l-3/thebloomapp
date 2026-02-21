import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const workflowSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(255),
  workflowId: z.string().optional(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  trigger: z.record(z.any()),
  actions: z.array(z.record(z.any())).default([]),
  notes: z.record(z.any()).optional()
});

// GET /api/workflows
router.get('/', async (req, res, next) => {
  try {
    const { clientId, status, search } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    res.json(workflows);
  } catch (error) {
    next(error);
  }
});

// GET /api/workflows/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

// POST /api/workflows
router.post('/', async (req, res, next) => {
  try {
    const data = workflowSchema.parse(req.body);
    
    const workflow = await prisma.workflow.create({
      data
    });

    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
});

// PUT /api/workflows/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = workflowSchema.partial().parse(req.body);
    
    const workflow = await prisma.workflow.update({
      where: { id },
      data
    });

    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.workflow.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as workflowsRouter };
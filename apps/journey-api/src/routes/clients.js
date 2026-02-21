import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const clientSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  locationId: z.string().optional(),
  ghlLocationId: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'onboarding', 'archived']).default('active'),
  settings: z.record(z.any()).default({}),
  config: z.record(z.any()).default({})
});

// GET /api/clients
router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { journeys: true, templates: true }
        }
      }
    });

    res.json(clients);
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { slug },
      include: {
        journeys: {
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: { select: { touchpoints: true } }
          }
        },
        pipelines: true,
        templates: true,
        workflows: true
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients
router.post('/', async (req, res, next) => {
  try {
    const data = clientSchema.parse(req.body);
    
    const client = await prisma.client.create({
      data: {
        ...data,
        slug: data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = clientSchema.partial().parse(req.body);
    
    const client = await prisma.client.update({
      where: { id },
      data
    });

    res.json(client);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.client.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id/stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [
      journeyCount,
      touchpointCount,
      templateCount,
      workflowCount
    ] = await Promise.all([
      prisma.journey.count({ where: { clientId: id } }),
      prisma.touchpoint.count({ where: { journey: { clientId: id } } }),
      prisma.template.count({ where: { clientId: id } }),
      prisma.workflow.count({ where: { clientId: id } })
    ]);

    const journeyStatusCounts = await prisma.journey.groupBy({
      by: ['status'],
      where: { clientId: id },
      _count: { status: true }
    });

    res.json({
      journeys: {
        total: journeyCount,
        byStatus: journeyStatusCounts.reduce((acc, curr) => {
          acc[curr.status] = curr._count.status;
          return acc;
        }, {})
      },
      touchpoints: touchpointCount,
      templates: templateCount,
      workflows: workflowCount
    });
  } catch (error) {
    next(error);
  }
});

export { router as clientsRouter };
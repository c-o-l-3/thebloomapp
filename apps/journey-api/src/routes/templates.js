import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const templateSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  type: z.enum(['email', 'sms']),
  ghlTemplateId: z.string().optional(),
  content: z.record(z.any()),
  variables: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active', 'archived']).default('draft')
});

// GET /api/templates
router.get('/', async (req, res, next) => {
  try {
    const { clientId, type, status, search } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// GET /api/templates/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// POST /api/templates
router.post('/', async (req, res, next) => {
  try {
    const data = templateSchema.parse(req.body);
    
    const template = await prisma.template.create({
      data
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

// PUT /api/templates/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = templateSchema.partial().parse(req.body);
    
    const template = await prisma.template.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// POST /api/templates/:id/sync-to-ghl
router.post('/:id/sync-to-ghl', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Update sync status
    const template = await prisma.template.update({
      where: { id },
      data: {
        syncStatus: 'synced',
        lastSynced: new Date()
      }
    });

    // TODO: Implement actual GHL sync logic here
    // This would call the GHL API to create/update the template

    res.json({
      message: 'Template sync initiated',
      template
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.template.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as templatesRouter };
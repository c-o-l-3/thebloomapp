import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { touchpointPublisher } from '../services/touchpoint-publisher.js';

const router = Router();
const prisma = new PrismaClient();

const touchpointSchema = z.object({
  journeyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['email', 'sms', 'task', 'wait', 'condition', 'trigger', 'form', 'call', 'note']),
  orderIndex: z.number().int().default(0),
  content: z.record(z.any()).default({}),
  config: z.record(z.any()).default({}),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  ghlTemplateId: z.string().optional(),
  status: z.enum(['draft', 'approved', 'published']).default('draft'),
  nextTouchpointId: z.string().uuid().optional()
});

// GET /api/touchpoints
router.get('/', async (req, res, next) => {
  try {
    const { journeyId, type, status } = req.query;
    
    const where = {};
    if (journeyId) where.journeyId = journeyId;
    if (type) where.type = type;
    if (status) where.status = status;

    const touchpoints = await prisma.touchpoint.findMany({
      where,
      orderBy: [
        { journeyId: 'asc' },
        { orderIndex: 'asc' }
      ],
      include: {
        journey: {
          select: { id: true, name: true, clientId: true }
        }
      }
    });

    res.json(touchpoints);
  } catch (error) {
    next(error);
  }
});

// GET /api/touchpoints/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const touchpoint = await prisma.touchpoint.findUnique({
      where: { id },
      include: {
        journey: {
          include: {
            client: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      }
    });

    if (!touchpoint) {
      return res.status(404).json({ error: 'Touchpoint not found' });
    }

    res.json(touchpoint);
  } catch (error) {
    next(error);
  }
});

// POST /api/touchpoints
router.post('/', async (req, res, next) => {
  try {
    const data = touchpointSchema.parse(req.body);
    
    const touchpoint = await prisma.touchpoint.create({
      data
    });

    res.status(201).json(touchpoint);
  } catch (error) {
    next(error);
  }
});

// PUT /api/touchpoints/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = touchpointSchema.partial().parse(req.body);
    
    const touchpoint = await prisma.touchpoint.update({
      where: { id },
      data
    });

    res.json(touchpoint);
  } catch (error) {
    next(error);
  }
});

// PUT /api/touchpoints/reorder - Bulk reorder
router.put('/reorder', async (req, res, next) => {
  try {
    const { items } = z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        orderIndex: z.number().int()
      }))
    }).parse(req.body);

    await prisma.$transaction(
      items.map(({ id, orderIndex }) =>
        prisma.touchpoint.update({
          where: { id },
          data: { orderIndex }
        })
      )
    );

    res.json({ message: 'Touchpoints reordered successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/touchpoints/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.touchpoint.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/touchpoints/:id/publish - Publish touchpoint to GHL
router.post('/:id/publish', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Fetch touchpoint with journey and client info
    const touchpoint = await prisma.touchpoint.findUnique({
      where: { id },
      include: {
        journey: {
          include: {
            client: true
          }
        }
      }
    });

    if (!touchpoint) {
      return res.status(404).json({ error: 'Touchpoint not found' });
    }

    // Get GHL location ID from client or environment
    const locationId = touchpoint.journey?.client?.ghlLocationId || process.env.GHL_LOCATION_ID;
    
    if (!locationId) {
      return res.status(400).json({ 
        error: 'No GHL location ID configured',
        details: 'Client must have a ghlLocationId set or GHL_LOCATION_ID environment variable must be defined'
      });
    }

    // Check if touchpoint type is publishable
    const publishableTypes = ['email', 'sms'];
    if (!publishableTypes.includes(touchpoint.type?.toLowerCase())) {
      return res.status(400).json({
        error: `Touchpoint type '${touchpoint.type}' cannot be published`,
        details: 'Only email and SMS touchpoints can be published to GHL'
      });
    }

    // Publish to GHL
    const result = await touchpointPublisher.publishTouchpoint(touchpoint, locationId);

    if (!result.success) {
      return res.status(422).json({
        error: 'Publish failed',
        details: result.error,
        fullError: result.details
      });
    }

    // Update touchpoint with GHL template ID and status
    const updatedTouchpoint = await prisma.touchpoint.update({
      where: { id },
      data: {
        ghlTemplateId: result.ghlTemplateId,
        status: 'published'
      }
    });

    res.json({
      message: 'Touchpoint published successfully',
      touchpoint: updatedTouchpoint,
      publishResult: {
        ghlTemplateId: result.ghlTemplateId,
        action: result.action,
        type: touchpoint.type
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as touchpointsRouter };
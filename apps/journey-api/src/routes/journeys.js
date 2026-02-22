import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const journeySchema = z.object({
  clientId: z.string().uuid(),
  pipelineId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['wedding', 'corporate', 'event', 'inquiry', 'nurture', 'retention', 'reactivation']).optional(),
  status: z.enum(['draft', 'client_review', 'approved', 'published', 'rejected', 'archived']).default('draft'),
  triggerConfig: z.record(z.any()).optional(),
  goal: z.string().optional(),
  metadata: z.record(z.any()).default({})
});

// GET /api/journeys
router.get('/', async (req, res, next) => {
  try {
    const { clientId, status, category, search } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const journeys = await prisma.journey.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, slug: true }
        },
        pipeline: {
          select: { id: true, name: true }
        },
        _count: {
          select: { touchpoints: true }
        }
      }
    });

    res.json(journeys);
  } catch (error) {
    next(error);
  }
});

// GET /api/journeys/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const journey = await prisma.journey.findUnique({
      where: { id },
      include: {
        client: true,
        pipeline: true,
        touchpoints: {
          orderBy: { orderIndex: 'asc' }
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 5
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    res.json(journey);
  } catch (error) {
    next(error);
  }
});

// POST /api/journeys
router.post('/', async (req, res, next) => {
  try {
    const data = journeySchema.parse(req.body);
    
    const journey = await prisma.$transaction(async (tx) => {
      // Create journey with slug
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const newJourney = await tx.journey.create({
        data: {
          ...data,
          slug
        }
      });

      // Create initial version
      await tx.journeyVersion.create({
        data: {
          journeyId: newJourney.id,
          version: 1,
          snapshot: {},
          changeLog: 'Initial creation'
        }
      });

      return newJourney;
    });

    res.status(201).json(journey);
  } catch (error) {
    next(error);
  }
});

// PUT /api/journeys/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { version, ...updateData } = req.body;
    
    // Validate update data (excluding version)
    const data = journeySchema.partial().parse(updateData);
    
    // Fetch current journey to check version
    const currentJourney = await prisma.journey.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, slug: true }
        },
        pipeline: {
          select: { id: true, name: true }
        },
        touchpoints: {
          orderBy: { orderIndex: 'asc' }
        },
        _count: {
          select: { touchpoints: true }
        }
      }
    });

    if (!currentJourney) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Optimistic locking: check version match
    if (version !== undefined && currentJourney.version !== version) {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'The journey has been modified by another user',
        currentVersion: currentJourney.version,
        submittedVersion: version,
        journey: currentJourney
      });
    }

    // Increment version on successful update
    const journey = await prisma.journey.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 }
      },
      include: {
        client: {
          select: { id: true, name: true, slug: true }
        },
        pipeline: {
          select: { id: true, name: true }
        },
        _count: {
          select: { touchpoints: true }
        }
      }
    });

    res.json(journey);
  } catch (error) {
    next(error);
  }
});

// PUT /api/journeys/:id/status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['draft', 'client_review', 'approved', 'published', 'rejected', 'archived'])
    }).parse(req.body);

    const updateData = { status };
    
    if (status === 'published') {
      updateData.publishedAt = new Date();
    }
    if (status === 'approved') {
      updateData.approvedAt = new Date();
    }
    
    const journey = await prisma.journey.update({
      where: { id },
      data: updateData
    });

    res.json(journey);
  } catch (error) {
    next(error);
  }
});

// POST /api/journeys/:id/duplicate
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const sourceJourney = await prisma.journey.findUnique({
      where: { id },
      include: { touchpoints: true }
    });

    if (!sourceJourney) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const duplicated = await prisma.$transaction(async (tx) => {
      const newJourney = await tx.journey.create({
        data: {
          clientId: sourceJourney.clientId,
          pipelineId: sourceJourney.pipelineId,
          name: name || `${sourceJourney.name} (Copy)`,
          slug: `${sourceJourney.slug}-copy-${Date.now()}`,
          description: sourceJourney.description,
          category: sourceJourney.category,
          status: 'draft',
          triggerConfig: sourceJourney.triggerConfig,
          goal: sourceJourney.goal,
          metadata: sourceJourney.metadata
        }
      });

      // Duplicate touchpoints
      if (sourceJourney.touchpoints.length > 0) {
        await tx.touchpoint.createMany({
          data: sourceJourney.touchpoints.map((tp, index) => ({
            journeyId: newJourney.id,
            name: tp.name,
            type: tp.type,
            orderIndex: index,
            content: tp.content,
            config: tp.config,
            position: tp.position,
            ghlTemplateId: tp.ghlTemplateId,
            status: 'draft'
          }))
        });
      }

      return newJourney;
    });

    res.status(201).json(duplicated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/journeys/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.journey.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/journeys/:id/versions
router.get('/:id/versions', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const versions = await prisma.journeyVersion.findMany({
      where: { journeyId: id },
      orderBy: { version: 'desc' }
    });

    res.json(versions);
  } catch (error) {
    next(error);
  }
});

// POST /api/journeys/:id/versions
router.post('/:id/versions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { changeLog, createdBy } = req.body;
    
    const journey = await prisma.journey.findUnique({
      where: { id },
      include: { touchpoints: true }
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const version = await prisma.$transaction(async (tx) => {
      const newVersion = journey.version + 1;
      
      await tx.journeyVersion.create({
        data: {
          journeyId: id,
          version: newVersion,
          snapshot: {
            journey: {
              name: journey.name,
              description: journey.description,
              category: journey.category,
              triggerConfig: journey.triggerConfig,
              goal: journey.goal
            },
            touchpoints: journey.touchpoints
          },
          createdBy,
          changeLog
        }
      });

      await tx.journey.update({
        where: { id },
        data: { version: newVersion }
      });

      return newVersion;
    });

    res.status(201).json({ version });
  } catch (error) {
    next(error);
  }
});

export { router as journeysRouter };
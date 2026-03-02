/**
 * Workflow Triggers v2 API Routes
 * P1 Q2 2026 - Conditional Logic, Time-based Delays, Multi-trigger Support
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import triggerEngine, { 
  TriggerTypes, 
  ConditionOperators,
  TriggerTypeConfigs 
} from '../services/trigger-engine.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals', 'notEquals', 'contains', 'notContains',
    'startsWith', 'endsWith', 'greaterThan', 'lessThan',
    'greaterOrEqual', 'lessOrEqual', 'in', 'notIn',
    'exists', 'notExists', 'matchesRegex'
  ]),
  value: z.any().optional(),
  fieldType: z.enum(['string', 'number', 'boolean', 'date', 'array']).default('string')
});

const conditionGroupSchema = z.object({
  conditions: z.array(conditionSchema),
  logic: z.enum(['and', 'or']).default('and')
});

const scheduleWindowSchema = z.object({
  businessHoursStart: z.number().min(0).max(23).optional(),
  businessHoursEnd: z.number().min(0).max(23).optional(),
  businessDays: z.array(z.number().min(0).max(6)).optional(),
  timezone: z.string().optional()
});

const triggerSchema = z.object({
  workflowId: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum([
    'contactCreated', 'stageChanged', 'emailOpened', 
    'linkClicked', 'formSubmitted', 'appointmentBooked'
  ]),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  config: z.record(z.any()).default({}),
  conditions: z.array(conditionGroupSchema).optional(),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  timeDelay: z.number().min(0).optional(),
  timeDelayType: z.enum(['immediate', 'minutes', 'hours', 'days']).optional(),
  scheduleWindow: scheduleWindowSchema.optional(),
  maxExecutions: z.number().min(1).optional(),
  executionCooldown: z.number().min(1).optional(),
  dedupWindow: z.number().min(1).default(1440),
  dedupKey: z.string().optional()
});

// GET /api/workflow-triggers/types
// Get all available trigger types and their configurations
router.get('/types', async (req, res, next) => {
  try {
    res.json({
      types: TriggerTypeConfigs,
      operators: ConditionOperators
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/workflow-triggers
// Get all triggers for a client/workflow
router.get('/', async (req, res, next) => {
  try {
    const { clientId, workflowId, status, type } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (workflowId) where.workflowId = workflowId;
    if (status) where.status = status;
    if (type) where.type = type;

    const triggers = await prisma.workflowTriggerV2.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        workflow: {
          select: { id: true, name: true, status: true }
        },
        _count: {
          select: { executions: true }
        }
      }
    });

    res.json(triggers);
  } catch (error) {
    next(error);
  }
});

// GET /api/workflow-triggers/:id
// Get a single trigger by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const trigger = await prisma.workflowTriggerV2.findUnique({
      where: { id },
      include: {
        workflow: true,
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    res.json(trigger);
  } catch (error) {
    next(error);
  }
});

// POST /api/workflow-triggers
// Create a new trigger
router.post('/', async (req, res, next) => {
  try {
    const data = triggerSchema.parse(req.body);
    
    // Verify the workflow exists and belongs to the client
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: data.workflowId,
        clientId: data.clientId
      }
    });
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const trigger = await prisma.workflowTriggerV2.create({
      data
    });

    res.status(201).json(trigger);
  } catch (error) {
    next(error);
  }
});

// PUT /api/workflow-triggers/:id
// Update a trigger
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = triggerSchema.partial().parse(req.body);
    
    // If workflowId is being changed, verify it exists
    if (data.workflowId) {
      const clientId = data.clientId || (await prisma.workflowTriggerV2.findUnique({ where: { id } }))?.clientId;
      const workflow = await prisma.workflow.findFirst({
        where: {
          id: data.workflowId,
          clientId
        }
      });
      
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
    }
    
    const trigger = await prisma.workflowTriggerV2.update({
      where: { id },
      data
    });

    res.json(trigger);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workflow-triggers/:id
// Delete a trigger
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.workflowTriggerV2.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/workflow-triggers/:id/duplicate
// Duplicate a trigger
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const trigger = await prisma.workflowTriggerV2.findUnique({
      where: { id }
    });

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    const { id: oldId, createdAt, updatedAt, ...triggerData } = trigger;
    
    const newTrigger = await prisma.workflowTriggerV2.create({
      data: {
        ...triggerData,
        name: `${trigger.name} (Copy)`,
        status: 'paused' // Duplicated triggers start as paused
      }
    });

    res.status(201).json(newTrigger);
  } catch (error) {
    next(error);
  }
});

// POST /api/workflow-triggers/:id/toggle
// Toggle trigger status (active/paused)
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const trigger = await prisma.workflowTriggerV2.findUnique({
      where: { id }
    });

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    const newStatus = trigger.status === 'active' ? 'paused' : 'active';
    
    const updated = await prisma.workflowTriggerV2.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/workflow-triggers/:id/test
// Test a trigger with sample data
router.post('/:id/test', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { eventData } = req.body;
    
    const trigger = await prisma.workflowTriggerV2.findUnique({
      where: { id }
    });

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // Evaluate conditions without creating execution records
    const conditionResult = triggerEngine.evaluateConditions(
      trigger,
      eventData,
      null
    );

    // Check config match
    const configMatch = checkConfigMatch(trigger, eventData);

    res.json({
      triggerId: id,
      triggerName: trigger.name,
      triggerType: trigger.type,
      conditionResult,
      configMatch,
      wouldExecute: conditionResult.matched && configMatch,
      calculatedExecutionTime: triggerEngine.calculateExecutionTime(trigger)
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/workflow-triggers/:id/stats
// Get trigger statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { clientId } = req.query;
    
    const stats = await triggerEngine.getTriggerStats(clientId, id);
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// POST /api/workflow-triggers/webhook/:clientId
// Webhook endpoint to receive events from external systems (GHL, etc.)
router.post('/webhook/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { eventType, eventData } = req.body;
    
    if (!eventType || !eventData) {
      return res.status(400).json({ error: 'eventType and eventData are required' });
    }
    
    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Process the event through the trigger engine
    const results = await triggerEngine.processEvent(eventType, eventData, clientId);
    
    res.json({
      processed: true,
      results
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/workflow-triggers/:id/executions
// Get execution history for a trigger
router.get('/:id/executions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    
    const where = { triggerId: id };
    if (status) where.status = status;
    
    const [executions, total] = await Promise.all([
      prisma.triggerExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.triggerExecution.count({ where })
    ]);

    res.json({
      data: executions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to check if event data matches trigger config
function checkConfigMatch(trigger, eventData) {
  const config = trigger.config || {};
  const typeConfig = TriggerTypeConfigs[trigger.type];
  
  if (!typeConfig) return true;
  
  for (const field of typeConfig.configFields) {
    const configValue = config[field.name];
    if (configValue === undefined || configValue === null) continue;
    
    const eventValue = eventData[field.name];
    
    if (Array.isArray(configValue)) {
      if (!configValue.some(v => eventValue?.includes(v))) {
        return false;
      }
    } else if (String(eventValue) !== String(configValue)) {
      return false;
    }
  }
  
  return true;
}

export { router as workflowTriggersRouter };
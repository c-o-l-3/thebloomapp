/**
 * Workflow Trigger Engine v2
 * P1 Q2 2026 - Conditional Logic, Time-based Delays, Multi-trigger Support
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Supported trigger types
export const TriggerTypes = {
  CONTACT_CREATED: 'contactCreated',
  STAGE_CHANGED: 'stageChanged',
  EMAIL_OPENED: 'emailOpened',
  LINK_CLICKED: 'linkClicked',
  FORM_SUBMITTED: 'formSubmitted',
  APPOINTMENT_BOOKED: 'appointmentBooked'
};

// Condition operators
export const ConditionOperators = {
  EQUALS: 'equals',
  NOT_EQUALS: 'notEquals',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'notContains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  GREATER_THAN: 'greaterThan',
  LESS_THAN: 'lessThan',
  GREATER_OR_EQUAL: 'greaterOrEqual',
  LESS_OR_EQUAL: 'lessOrEqual',
  IN: 'in',
  NOT_IN: 'notIn',
  EXISTS: 'exists',
  NOT_EXISTS: 'notExists',
  MATCHES_REGEX: 'matchesRegex'
};

// Trigger type configurations
export const TriggerTypeConfigs = {
  [TriggerTypes.CONTACT_CREATED]: {
    label: 'Contact Created',
    description: 'Triggered when a new contact is created',
    configFields: [
      { name: 'source', type: 'string', label: 'Source', optional: true },
      { name: 'tags', type: 'array', label: 'Initial Tags', optional: true }
    ],
    eventDataSchema: ['contactId', 'email', 'firstName', 'lastName', 'source', 'tags']
  },
  [TriggerTypes.STAGE_CHANGED]: {
    label: 'Stage Changed',
    description: 'Triggered when an opportunity moves to a different stage',
    configFields: [
      { name: 'pipelineId', type: 'string', label: 'Pipeline', optional: true },
      { name: 'fromStage', type: 'string', label: 'From Stage', optional: true },
      { name: 'toStage', type: 'string', label: 'To Stage', optional: false }
    ],
    eventDataSchema: ['opportunityId', 'contactId', 'pipelineId', 'fromStage', 'toStage']
  },
  [TriggerTypes.EMAIL_OPENED]: {
    label: 'Email Opened',
    description: 'Triggered when a contact opens an email',
    configFields: [
      { name: 'templateId', type: 'string', label: 'Email Template', optional: true },
      { name: 'minOpens', type: 'number', label: 'Minimum Opens', optional: true, default: 1 }
    ],
    eventDataSchema: ['contactId', 'templateId', 'emailId', 'openCount', 'openTime']
  },
  [TriggerTypes.LINK_CLICKED]: {
    label: 'Link Clicked',
    description: 'Triggered when a contact clicks a link in an email',
    configFields: [
      { name: 'templateId', type: 'string', label: 'Email Template', optional: true },
      { name: 'linkUrl', type: 'string', label: 'Link URL Pattern', optional: true },
      { name: 'minClicks', type: 'number', label: 'Minimum Clicks', optional: true, default: 1 }
    ],
    eventDataSchema: ['contactId', 'templateId', 'emailId', 'linkUrl', 'clickCount']
  },
  [TriggerTypes.FORM_SUBMITTED]: {
    label: 'Form Submitted',
    description: 'Triggered when a contact submits a form',
    configFields: [
      { name: 'formId', type: 'string', label: 'Form ID', optional: false }
    ],
    eventDataSchema: ['contactId', 'formId', 'formData', 'submissionTime']
  },
  [TriggerTypes.APPOINTMENT_BOOKED]: {
    label: 'Appointment Booked',
    description: 'Triggered when an appointment is scheduled',
    configFields: [
      { name: 'calendarId', type: 'string', label: 'Calendar', optional: true },
      { name: 'appointmentType', type: 'string', label: 'Appointment Type', optional: true }
    ],
    eventDataSchema: ['contactId', 'appointmentId', 'calendarId', 'appointmentType', 'scheduledTime']
  }
};

/**
 * Evaluate a single condition against event data and contact data
 */
function evaluateCondition(condition, eventData, contactData) {
  const { field, operator, value, fieldType = 'string' } = condition;
  
  // Get the field value from event or contact data
  let fieldValue = eventData?.[field];
  if (fieldValue === undefined && contactData) {
    fieldValue = contactData[field];
  }
  
  // Handle nested fields (e.g., 'formData.email')
  if (field.includes('.') && eventData) {
    const parts = field.split('.');
    let current = eventData;
    for (const part of parts) {
      current = current?.[part];
      if (current === undefined) break;
    }
    fieldValue = current;
  }

  switch (operator) {
    case ConditionOperators.EQUALS:
      return String(fieldValue) === String(value);
      
    case ConditionOperators.NOT_EQUALS:
      return String(fieldValue) !== String(value);
      
    case ConditionOperators.CONTAINS:
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      
    case ConditionOperators.NOT_CONTAINS:
      return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      
    case ConditionOperators.STARTS_WITH:
      return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
      
    case ConditionOperators.ENDS_WITH:
      return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
      
    case ConditionOperators.GREATER_THAN:
      return Number(fieldValue) > Number(value);
      
    case ConditionOperators.LESS_THAN:
      return Number(fieldValue) < Number(value);
      
    case ConditionOperators.GREATER_OR_EQUAL:
      return Number(fieldValue) >= Number(value);
      
    case ConditionOperators.LESS_OR_EQUAL:
      return Number(fieldValue) <= Number(value);
      
    case ConditionOperators.IN:
      const inValues = Array.isArray(value) ? value : [value];
      return inValues.includes(String(fieldValue));
      
    case ConditionOperators.NOT_IN:
      const notInValues = Array.isArray(value) ? value : [value];
      return !notInValues.includes(String(fieldValue));
      
    case ConditionOperators.EXISTS:
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      
    case ConditionOperators.NOT_EXISTS:
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
      
    case ConditionOperators.MATCHES_REGEX:
      try {
        const regex = new RegExp(value);
        return regex.test(String(fieldValue));
      } catch {
        return false;
      }
      
    default:
      return false;
  }
}

/**
 * Evaluate a group of conditions with AND/OR logic
 */
function evaluateConditionGroup(group, eventData, contactData) {
  const { conditions, logic = 'and' } = group;
  
  if (!conditions || conditions.length === 0) {
    return true; // No conditions means always match
  }
  
  const results = conditions.map(condition => 
    evaluateCondition(condition, eventData, contactData)
  );
  
  if (logic === 'or') {
    return results.some(r => r);
  }
  
  return results.every(r => r);
}

/**
 * Evaluate all conditions for a trigger
 */
export function evaluateConditions(trigger, eventData, contactData) {
  const conditions = trigger.conditions || [];
  const logic = trigger.conditionLogic || 'and';
  
  if (!conditions || conditions.length === 0) {
    return { matched: true, matchedConditions: [] };
  }
  
  const matchedConditions = [];
  const results = conditions.map((group, index) => {
    const matched = evaluateConditionGroup(group, eventData, contactData);
    if (matched) {
      matchedConditions.push(index);
    }
    return matched;
  });
  
  const matched = logic === 'or' 
    ? results.some(r => r) 
    : results.every(r => r);
  
  return { matched, matchedConditions };
}

/**
 * Check if trigger type config matches the event
 */
function matchesTriggerConfig(trigger, eventData) {
  const config = trigger.config || {};
  const typeConfig = TriggerTypeConfigs[trigger.type];
  
  if (!typeConfig) return true;
  
  // Check each config field
  for (const field of typeConfig.configFields) {
    const configValue = config[field.name];
    if (configValue === undefined || configValue === null) continue;
    
    const eventValue = eventData[field.name];
    
    // Handle array values (tags, etc.)
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

/**
 * Generate deduplication hash
 */
function generateDedupHash(trigger, eventData) {
  const keyFields = trigger.dedupKey?.split(',') || ['contactId'];
  const values = keyFields.map(field => eventData[field]).filter(Boolean);
  
  if (values.length === 0) return null;
  
  const hashInput = `${trigger.id}:${values.join(':')}`;
  return crypto.createHash('md5').update(hashInput).digest('hex');
}

/**
 * Check for duplicate executions within the deduplication window
 */
async function checkDuplicate(trigger, dedupHash) {
  if (!dedupHash) return false;
  
  const windowStart = new Date(Date.now() - (trigger.dedupWindow || 1440) * 60 * 1000);
  
  const existing = await prisma.triggerExecution.findFirst({
    where: {
      triggerId: trigger.id,
      dedupHash,
      createdAt: { gte: windowStart }
    }
  });
  
  return existing !== null;
}

/**
 * Check execution limits for a contact
 */
async function checkExecutionLimits(trigger, contactId) {
  if (!trigger.maxExecutions) return { allowed: true };
  
  const executionCount = await prisma.triggerExecution.count({
    where: {
      triggerId: trigger.id,
      contactId
    }
  });
  
  if (executionCount >= trigger.maxExecutions) {
    return { 
      allowed: false, 
      reason: `Maximum executions (${trigger.maxExecutions}) reached for this contact` 
    };
  }
  
  // Check cooldown period
  if (trigger.executionCooldown && executionCount > 0) {
    const lastExecution = await prisma.triggerExecution.findFirst({
      where: { triggerId: trigger.id, contactId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (lastExecution) {
      const cooldownEnd = new Date(lastExecution.createdAt.getTime() + trigger.executionCooldown * 60 * 1000);
      if (cooldownEnd > new Date()) {
        return { 
          allowed: false, 
          reason: `Execution cooldown period active until ${cooldownEnd.toISOString()}` 
        };
      }
    }
  }
  
  return { allowed: true };
}

/**
 * Calculate the scheduled execution time based on delay and business hours
 */
export function calculateExecutionTime(trigger, baseTime = new Date()) {
  const timeDelay = trigger.timeDelay || 0;
  const timeDelayType = trigger.timeDelayType || 'immediate';
  
  let delayMinutes = 0;
  
  switch (timeDelayType) {
    case 'immediate':
      delayMinutes = 0;
      break;
    case 'minutes':
      delayMinutes = timeDelay;
      break;
    case 'hours':
      delayMinutes = timeDelay * 60;
      break;
    case 'days':
      delayMinutes = timeDelay * 24 * 60;
      break;
    default:
      delayMinutes = timeDelay;
  }
  
  let scheduledTime = new Date(baseTime.getTime() + delayMinutes * 60 * 1000);
  
  // Apply business hours constraints if configured
  const scheduleWindow = trigger.scheduleWindow;
  if (scheduleWindow) {
    scheduledTime = applyScheduleWindow(scheduledTime, scheduleWindow);
  }
  
  return scheduledTime;
}

/**
 * Apply business hours/days constraints to a scheduled time
 */
function applyScheduleWindow(date, window) {
  const { 
    businessHoursStart = 9, 
    businessHoursEnd = 17, 
    businessDays = [1, 2, 3, 4, 5], // Monday = 1, Sunday = 0
    timezone = 'America/New_York'
  } = window;
  
  // Convert to target timezone
  const options = { timeZone: timezone, hour12: false };
  const timeString = date.toLocaleString('en-US', options);
  let localDate = new Date(timeString);
  
  // Check if current day is a business day
  let dayOfWeek = localDate.getDay();
  let daysToAdd = 0;
  
  while (!businessDays.includes(dayOfWeek)) {
    daysToAdd++;
    dayOfWeek = (dayOfWeek + 1) % 7;
  }
  
  if (daysToAdd > 0) {
    localDate.setDate(localDate.getDate() + daysToAdd);
    localDate.setHours(businessHoursStart, 0, 0, 0);
  }
  
  // Check business hours
  const hour = localDate.getHours();
  if (hour < businessHoursStart) {
    localDate.setHours(businessHoursStart, 0, 0, 0);
  } else if (hour >= businessHoursEnd) {
    localDate.setDate(localDate.getDate() + 1);
    localDate.setHours(businessHoursStart, 0, 0, 0);
    
    // Check again for business day
    dayOfWeek = localDate.getDay();
    daysToAdd = 0;
    while (!businessDays.includes(dayOfWeek)) {
      daysToAdd++;
      dayOfWeek = (dayOfWeek + 1) % 7;
    }
    localDate.setDate(localDate.getDate() + daysToAdd);
  }
  
  // Convert back to UTC
  return new Date(localDate.toISOString());
}

/**
 * Process an incoming event and execute matching triggers
 */
export async function processEvent(eventType, eventData, clientId) {
  const results = [];
  
  try {
    // Find active triggers for this event type and client
    const triggers = await prisma.workflowTriggerV2.findMany({
      where: {
        clientId,
        type: eventType,
        status: 'active'
      },
      include: {
        workflow: true
      }
    });
    
    for (const trigger of triggers) {
      const result = await processTrigger(trigger, eventData);
      results.push(result);
    }
  } catch (error) {
    console.error('Error processing event:', error);
    results.push({ error: error.message });
  }
  
  return results;
}

/**
 * Process a single trigger against event data
 */
async function processTrigger(trigger, eventData) {
  const contactId = eventData.contactId || eventData.contact_id;
  
  try {
    // 1. Check if trigger config matches
    if (!matchesTriggerConfig(trigger, eventData)) {
      return {
        triggerId: trigger.id,
        status: 'suppressed',
        reason: 'Trigger config does not match'
      };
    }
    
    // 2. Evaluate conditions
    const conditionResult = evaluateConditions(trigger, eventData, null);
    if (!conditionResult.matched) {
      const execution = await prisma.triggerExecution.create({
        data: {
          triggerId: trigger.id,
          workflowId: trigger.workflowId,
          clientId: trigger.clientId,
          contactId,
          eventType: trigger.type,
          eventData,
          status: 'conditions_not_met',
          matchedConditions: conditionResult.matchedConditions
        }
      });
      
      return {
        triggerId: trigger.id,
        status: 'conditions_not_met',
        executionId: execution.id
      };
    }
    
    // 3. Check deduplication
    const dedupHash = generateDedupHash(trigger, eventData);
    if (await checkDuplicate(trigger, dedupHash)) {
      return {
        triggerId: trigger.id,
        status: 'suppressed',
        reason: 'Duplicate execution within deduplication window'
      };
    }
    
    // 4. Check execution limits
    if (contactId) {
      const limitCheck = await checkExecutionLimits(trigger, contactId);
      if (!limitCheck.allowed) {
        return {
          triggerId: trigger.id,
          status: 'suppressed',
          reason: limitCheck.reason
        };
      }
    }
    
    // 5. Calculate execution time
    const scheduledTime = calculateExecutionTime(trigger);
    const isImmediate = scheduledTime <= new Date();
    
    // 6. Create execution record
    const execution = await prisma.triggerExecution.create({
      data: {
        triggerId: trigger.id,
        workflowId: trigger.workflowId,
        clientId: trigger.clientId,
        contactId,
        eventType: trigger.type,
        eventData,
        status: 'triggered',
        matchedConditions: conditionResult.matchedConditions,
        dedupHash
      }
    });
    
    // 7. If immediate, start workflow execution
    if (isImmediate) {
      await executeWorkflow(trigger, eventData, execution.id);
    } else {
      // Schedule for later execution
      await scheduleWorkflowExecution(trigger, eventData, execution.id, scheduledTime);
    }
    
    return {
      triggerId: trigger.id,
      status: 'triggered',
      executionId: execution.id,
      scheduledTime: isImmediate ? null : scheduledTime
    };
    
  } catch (error) {
    console.error(`Error processing trigger ${trigger.id}:`, error);
    
    const execution = await prisma.triggerExecution.create({
      data: {
        triggerId: trigger.id,
        workflowId: trigger.workflowId,
        clientId: trigger.clientId,
        contactId,
        eventType: trigger.type,
        eventData,
        status: 'failed',
        dedupHash: generateDedupHash(trigger, eventData)
      }
    });
    
    return {
      triggerId: trigger.id,
      status: 'failed',
      executionId: execution.id,
      error: error.message
    };
  }
}

/**
 * Execute the workflow immediately
 */
async function executeWorkflow(trigger, eventData, triggerExecutionId) {
  try {
    const workflowExecution = await prisma.workflowExecution.create({
      data: {
        workflowId: trigger.workflowId,
        clientId: trigger.clientId,
        contactId: eventData.contactId || eventData.contact_id,
        triggerId: trigger.id,
        status: 'running',
        context: {
          triggerType: trigger.type,
          eventData,
          conditions: trigger.conditions
        }
      }
    });
    
    // Update trigger execution with workflow execution reference
    await prisma.triggerExecution.update({
      where: { id: triggerExecutionId },
      data: { executionId: workflowExecution.id }
    });
    
    // TODO: Execute workflow actions asynchronously
    // This would typically be handled by a job queue (Bull, etc.)
    
    return workflowExecution;
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}

/**
 * Schedule a workflow execution for later
 */
async function scheduleWorkflowExecution(trigger, eventData, triggerExecutionId, scheduledTime) {
  // TODO: Implement job queue scheduling
  // For now, we'll rely on a polling mechanism or external scheduler
  
  const workflowExecution = await prisma.workflowExecution.create({
    data: {
      workflowId: trigger.workflowId,
      clientId: trigger.clientId,
      contactId: eventData.contactId || eventData.contact_id,
      triggerId: trigger.id,
      status: 'pending',
      context: {
        triggerType: trigger.type,
        eventData,
        conditions: trigger.conditions,
        scheduledTime
      }
    }
  });
  
  await prisma.triggerExecution.update({
    where: { id: triggerExecutionId },
    data: { executionId: workflowExecution.id }
  });
  
  return workflowExecution;
}

/**
 * Get trigger statistics for a client
 */
export async function getTriggerStats(clientId, triggerId = null) {
  const where = { clientId };
  if (triggerId) where.triggerId = triggerId;
  
  const [
    totalExecutions,
    triggeredCount,
    suppressedCount,
    failedCount,
    conditionsNotMetCount
  ] = await Promise.all([
    prisma.triggerExecution.count({ where }),
    prisma.triggerExecution.count({ where: { ...where, status: 'triggered' } }),
    prisma.triggerExecution.count({ where: { ...where, status: 'suppressed' } }),
    prisma.triggerExecution.count({ where: { ...where, status: 'failed' } }),
    prisma.triggerExecution.count({ where: { ...where, status: 'conditions_not_met' } })
  ]);
  
  // Get daily stats for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyStats = await prisma.triggerExecution.groupBy({
    by: ['status'],
    where: {
      ...where,
      createdAt: { gte: thirtyDaysAgo }
    },
    _count: {
      status: true
    }
  });
  
  return {
    total: totalExecutions,
    triggered: triggeredCount,
    suppressed: suppressedCount,
    failed: failedCount,
    conditionsNotMet: conditionsNotMetCount,
    dailyStats
  };
}

export default {
  processEvent,
  evaluateConditions,
  calculateExecutionTime,
  getTriggerStats,
  TriggerTypes,
  ConditionOperators,
  TriggerTypeConfigs
};
/**
 * Webhook Service
 * P1 Q3 2026 - Real-time sync with GoHighLevel webhooks
 * 
 * Handles webhook signature verification, event processing,
 * and database synchronization for all GHL webhook events.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import triggerEngine from './trigger-engine.js';

const prisma = new PrismaClient();

// ============================================
// WEBHOOK EVENT TYPES
// ============================================

export const WebhookEventTypes = {
  // Contact events
  CONTACT_CREATE: 'ContactCreate',
  CONTACT_UPDATE: 'ContactUpdate',
  CONTACT_DELETE: 'ContactDelete',
  
  // Opportunity/Stage events
  OPPORTUNITY_CREATE: 'OpportunityCreate',
  OPPORTUNITY_UPDATE: 'OpportunityUpdate',
  OPPORTUNITY_DELETE: 'OpportunityDelete',
  OPPORTUNITY_STAGE_CHANGE: 'OpportunityStageChange',
  PIPELINE_STAGE_MOVEMENT: 'PipelineStageMovement',
  
  // Appointment events
  APPOINTMENT_CREATE: 'AppointmentCreate',
  APPOINTMENT_UPDATE: 'AppointmentUpdate',
  APPOINTMENT_CANCEL: 'AppointmentCancel',
  APPOINTMENT_DELETE: 'AppointmentDelete',
  
  // Form events
  FORM_SUBMIT: 'FormSubmit',
  
  // Email events
  EMAIL_DELIVERED: 'EmailDelivered',
  EMAIL_OPENED: 'EmailOpened',
  EMAIL_CLICKED: 'EmailClicked',
  EMAIL_BOUNCED: 'EmailBounced',
  EMAIL_COMPLAINED: 'EmailComplained',
  EMAIL_UNSUBSCRIBED: 'EmailUnsubscribed',
  
  // Task events
  TASK_CREATE: 'TaskCreate',
  TASK_UPDATE: 'TaskUpdate',
  TASK_COMPLETE: 'TaskComplete',
  TASK_DELETE: 'TaskDelete',
  
  // Note events
  NOTE_CREATE: 'NoteCreate',
  NOTE_UPDATE: 'NoteUpdate',
  NOTE_DELETE: 'NoteDelete'
};

// Event type categories for filtering
export const EventCategories = {
  CONTACT: ['ContactCreate', 'ContactUpdate', 'ContactDelete'],
  OPPORTUNITY: ['OpportunityCreate', 'OpportunityUpdate', 'OpportunityDelete', 'OpportunityStageChange', 'PipelineStageMovement'],
  APPOINTMENT: ['AppointmentCreate', 'AppointmentUpdate', 'AppointmentCancel', 'AppointmentDelete'],
  FORM: ['FormSubmit'],
  EMAIL: ['EmailDelivered', 'EmailOpened', 'EmailClicked', 'EmailBounced', 'EmailComplained', 'EmailUnsubscribed']
};

// ============================================
// SIGNATURE VERIFICATION
// ============================================

/**
 * Verify GoHighLevel webhook signature
 * GHL uses HMAC-SHA256 signature in the X-GHL-Signature header
 * 
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from X-GHL-Signature header
 * @param {string} secret - Webhook secret key
 * @returns {boolean} - Whether signature is valid
 */
export function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }
  
  try {
    // GHL format: "v1={hmac_sha256_hash}"
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Support both "v1={hash}" and plain hash formats
    const receivedHash = signature.startsWith('v1=') 
      ? signature.slice(3) 
      : signature;
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedHash, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Generate webhook signature for testing
 * 
 * @param {string} payload - Raw request body
 * @param {string} secret - Webhook secret key
 * @returns {string} - Generated signature
 */
export function generateWebhookSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

// ============================================
// WEBHOOK PROCESSING
// ============================================

/**
 * Process incoming webhook
 * 
 * @param {Object} params - Processing parameters
 * @param {string} params.clientId - Client ID
 * @param {string} params.eventType - Event type from GHL
 * @param {Object} params.payload - Webhook payload
 * @param {Object} params.headers - HTTP headers
 * @param {string} params.ipAddress - Client IP address
 * @param {string} params.rawBody - Raw request body for signature verification
 * @returns {Promise<Object>} - Processing result
 */
export async function processWebhook({
  clientId,
  eventType,
  payload,
  headers,
  ipAddress,
  rawBody
}) {
  const startTime = Date.now();
  
  try {
    // Get client and webhook config
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        webhookConfigs: {
          where: { status: 'active' }
        }
      }
    });
    
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }
    
    // Get the primary webhook config
    const config = client.webhookConfigs[0];
    if (!config) {
      throw new Error(`No active webhook config found for client: ${clientId}`);
    }
    
    // Verify signature if configured
    let signatureValid = null;
    const signature = headers['x-ghl-signature'] || headers['X-GHL-Signature'];
    
    if (config.secretKey && rawBody) {
      signatureValid = verifyWebhookSignature(rawBody, signature, config.secretKey);
    }
    
    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        configId: config.id,
        clientId,
        eventType,
        eventId: extractEventId(payload),
        payload,
        status: 'processing',
        signatureValid,
        signatureChecked: !!config.secretKey,
        headers: sanitizeHeaders(headers),
        ipAddress
      }
    });
    
    // Check if event type is subscribed
    const subscribedEvents = config.subscribedEvents || [];
    if (subscribedEvents.length > 0 && !subscribedEvents.includes(eventType)) {
      await updateDeliveryStatus(delivery.id, 'completed', {
        skipped: true,
        reason: 'Event type not subscribed'
      });
      
      return {
        success: true,
        deliveryId: delivery.id,
        skipped: true,
        reason: 'Event type not subscribed'
      };
    }
    
    // Process the event based on type
    const handlerResults = await processEventByType(eventType, payload, clientId);
    
    // Update config stats
    await prisma.webhookConfig.update({
      where: { id: config.id },
      data: {
        totalDeliveries: { increment: 1 },
        lastSuccessAt: new Date()
      }
    });
    
    // Update delivery status
    const processingTime = Date.now() - startTime;
    await updateDeliveryStatus(delivery.id, 'completed', {
      handlerResults,
      processingTimeMs: processingTime
    });
    
    return {
      success: true,
      deliveryId: delivery.id,
      eventType,
      handlerResults,
      processingTimeMs: processingTime
    };
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Update config failure stats if config exists
    try {
      const config = await prisma.webhookConfig.findFirst({
        where: { clientId, status: 'active' }
      });
      
      if (config) {
        await prisma.webhookConfig.update({
          where: { id: config.id },
          data: {
            failedDeliveries: { increment: 1 },
            lastFailureAt: new Date()
          }
        });
      }
    } catch (statsError) {
      console.error('Error updating webhook stats:', statsError);
    }
    
    throw error;
  }
}

/**
 * Process webhook event based on type
 * 
 * @param {string} eventType - Event type
 * @param {Object} payload - Event payload
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} - Handler results
 */
async function processEventByType(eventType, payload, clientId) {
  const results = {};
  
  switch (eventType) {
    // Contact events
    case WebhookEventTypes.CONTACT_CREATE:
    case WebhookEventTypes.CONTACT_UPDATE:
      results.contact = await handleContactEvent(payload, clientId, eventType);
      break;
      
    case WebhookEventTypes.CONTACT_DELETE:
      results.contact = await handleContactDelete(payload, clientId);
      break;
    
    // Opportunity/Stage events
    case WebhookEventTypes.OPPORTUNITY_CREATE:
    case WebhookEventTypes.OPPORTUNITY_UPDATE:
      results.opportunity = await handleOpportunityEvent(payload, clientId, eventType);
      break;
      
    case WebhookEventTypes.OPPORTUNITY_STAGE_CHANGE:
    case WebhookEventTypes.PIPELINE_STAGE_MOVEMENT:
      results.stageChange = await handleStageChangeEvent(payload, clientId);
      break;
    
    // Appointment events
    case WebhookEventTypes.APPOINTMENT_CREATE:
    case WebhookEventTypes.APPOINTMENT_UPDATE:
      results.appointment = await handleAppointmentEvent(payload, clientId, eventType);
      break;
      
    case WebhookEventTypes.APPOINTMENT_CANCEL:
    case WebhookEventTypes.APPOINTMENT_DELETE:
      results.appointment = await handleAppointmentCancel(payload, clientId, eventType);
      break;
    
    // Form events
    case WebhookEventTypes.FORM_SUBMIT:
      results.form = await handleFormSubmission(payload, clientId);
      break;
    
    // Email events
    case WebhookEventTypes.EMAIL_DELIVERED:
    case WebhookEventTypes.EMAIL_OPENED:
    case WebhookEventTypes.EMAIL_CLICKED:
    case WebhookEventTypes.EMAIL_BOUNCED:
    case WebhookEventTypes.EMAIL_COMPLAINED:
    case WebhookEventTypes.EMAIL_UNSUBSCRIBED:
      results.email = await handleEmailEvent(payload, clientId, eventType);
      break;
    
    default:
      results.ignored = { reason: 'Unsupported event type' };
  }
  
  // Trigger workflow engine for relevant events
  await triggerWorkflowEngine(eventType, payload, clientId, results);
  
  return results;
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle contact create/update events
 */
async function handleContactEvent(payload, clientId, eventType) {
  const contactData = payload.contact || payload;
  const ghlContactId = contactData.id;
  
  if (!ghlContactId) {
    throw new Error('Missing contact ID in payload');
  }
  
  // Extract contact fields
  const contactFields = {
    ghlContactId,
    email: contactData.email,
    phone: contactData.phone,
    firstName: contactData.firstName || contactData.first_name,
    lastName: contactData.lastName || contactData.last_name,
    name: contactData.name || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim(),
    tags: contactData.tags || [],
    customFields: contactData.customFields || contactData.custom_fields,
    address: contactData.address,
    source: contactData.source,
    lastEventType: eventType === WebhookEventTypes.CONTACT_CREATE ? 'created' : 'updated',
    lastSyncedAt: new Date(),
    rawData: contactData
  };
  
  // Upsert contact
  const contact = await prisma.syncedContact.upsert({
    where: { ghlContactId },
    update: contactFields,
    create: {
      ...contactFields,
      clientId
    }
  });
  
  return {
    action: eventType === WebhookEventTypes.CONTACT_CREATE ? 'created' : 'updated',
    contactId: contact.id,
    ghlContactId
  };
}

/**
 * Handle contact delete events
 */
async function handleContactDelete(payload, clientId) {
  const ghlContactId = payload.contactId || payload.id;
  
  if (!ghlContactId) {
    throw new Error('Missing contact ID in payload');
  }
  
  // Soft delete - mark as deleted
  const contact = await prisma.syncedContact.updateMany({
    where: { ghlContactId, clientId },
    data: {
      syncStatus: 'deleted',
      lastEventType: 'deleted',
      lastSyncedAt: new Date()
    }
  });
  
  return {
    action: 'deleted',
    ghlContactId,
    affected: contact.count
  };
}

/**
 * Handle opportunity create/update events
 */
async function handleOpportunityEvent(payload, clientId, eventType) {
  const oppData = payload.opportunity || payload;
  const ghlContactId = oppData.contactId || oppData.contact_id;
  
  // Update contact with opportunity data if contact exists
  if (ghlContactId) {
    const updateData = {
      pipelineId: oppData.pipelineId || oppData.pipeline_id,
      stageId: oppData.stageId || oppData.stage_id,
      stageName: oppData.stageName || oppData.stage_name,
      opportunityId: oppData.id,
      opportunityValue: oppData.value ? parseFloat(oppData.value) : null,
      lastSyncedAt: new Date(),
      rawData: { ...oppData, type: 'opportunity' }
    };
    
    await prisma.syncedContact.updateMany({
      where: { ghlContactId, clientId },
      data: updateData
    });
  }
  
  return {
    action: eventType === WebhookEventTypes.OPPORTUNITY_CREATE ? 'created' : 'updated',
    opportunityId: oppData.id,
    ghlContactId,
    stageName: oppData.stageName || oppData.stage_name
  };
}

/**
 * Handle stage change events
 */
async function handleStageChangeEvent(payload, clientId) {
  const data = payload.opportunity || payload.stage || payload;
  const ghlContactId = data.contactId || data.contact_id;
  const ghlOpportunityId = data.opportunityId || data.id || data.opportunity_id;
  
  // Create stage history record
  const stageHistory = await prisma.opportunityStageHistory.create({
    data: {
      clientId,
      ghlOpportunityId,
      contactId: ghlContactId,
      fromStageId: data.fromStageId || data.from_stage_id,
      fromStageName: data.fromStageName || data.from_stage_name,
      toStageId: data.toStageId || data.to_stage_id || data.stageId,
      toStageName: data.toStageName || data.to_stage_name || data.stageName,
      pipelineId: data.pipelineId || data.pipeline_id,
      pipelineName: data.pipelineName || data.pipeline_name,
      opportunityValue: data.value ? parseFloat(data.value) : null,
      status: data.status,
      changedAt: data.changedAt ? new Date(data.changedAt) : new Date(),
      changedBy: data.changedBy || data.changed_by,
      rawData: data
    }
  });
  
  // Update contact stage
  if (ghlContactId) {
    await prisma.syncedContact.updateMany({
      where: { ghlContactId: String(ghlContactId), clientId },
      data: {
        stageId: data.toStageId || data.to_stage_id || data.stageId,
        stageName: data.toStageName || data.to_stage_name || data.stageName,
        pipelineId: data.pipelineId || data.pipeline_id,
        lastSyncedAt: new Date()
      }
    });
  }
  
  return {
    action: 'stage_changed',
    stageHistoryId: stageHistory.id,
    ghlOpportunityId,
    fromStage: data.fromStageName || data.from_stage_name,
    toStage: data.toStageName || data.to_stage_name || data.stageName
  };
}

/**
 * Handle appointment create/update events
 */
async function handleAppointmentEvent(payload, clientId, eventType) {
  const aptData = payload.appointment || payload;
  const ghlAppointmentId = aptData.id;
  const ghlContactId = aptData.contactId || aptData.contact_id;
  
  if (!ghlAppointmentId) {
    throw new Error('Missing appointment ID in payload');
  }
  
  // Find linked contact if exists
  let contactId = null;
  if (ghlContactId) {
    const contact = await prisma.syncedContact.findUnique({
      where: { ghlContactId: String(ghlContactId) }
    });
    contactId = contact?.id;
  }
  
  const appointmentFields = {
    clientId,
    contactId,
    ghlAppointmentId,
    calendarId: aptData.calendarId || aptData.calendar_id,
    title: aptData.title,
    description: aptData.description,
    startTime: new Date(aptData.startTime || aptData.start_time),
    endTime: new Date(aptData.endTime || aptData.end_time),
    timezone: aptData.timezone || 'America/New_York',
    status: aptData.status || 'scheduled',
    appointmentType: aptData.appointmentType || aptData.type,
    contactEmail: aptData.email || aptData.contactEmail,
    contactPhone: aptData.phone || aptData.contactPhone,
    location: aptData.location,
    meetingLink: aptData.meetingLink || aptData.meeting_link,
    lastEventType: eventType === WebhookEventTypes.APPOINTMENT_CREATE ? 'created' : 'updated',
    lastSyncedAt: new Date(),
    rawData: aptData
  };
  
  const appointment = await prisma.syncedAppointment.upsert({
    where: { ghlAppointmentId },
    update: appointmentFields,
    create: appointmentFields
  });
  
  return {
    action: eventType === WebhookEventTypes.APPOINTMENT_CREATE ? 'created' : 'updated',
    appointmentId: appointment.id,
    ghlAppointmentId,
    contactId
  };
}

/**
 * Handle appointment cancel/delete events
 */
async function handleAppointmentCancel(payload, clientId, eventType) {
  const ghlAppointmentId = payload.appointmentId || payload.id;
  
  if (!ghlAppointmentId) {
    throw new Error('Missing appointment ID in payload');
  }
  
  const appointment = await prisma.syncedAppointment.updateMany({
    where: { ghlAppointmentId, clientId },
    data: {
      status: eventType === WebhookEventTypes.APPOINTMENT_CANCEL ? 'cancelled' : 'deleted',
      lastEventType: eventType === WebhookEventTypes.APPOINTMENT_CANCEL ? 'cancelled' : 'deleted',
      lastSyncedAt: new Date()
    }
  });
  
  return {
    action: eventType === WebhookEventTypes.APPOINTMENT_CANCEL ? 'cancelled' : 'deleted',
    ghlAppointmentId,
    affected: appointment.count
  };
}

/**
 * Handle form submission events
 */
async function handleFormSubmission(payload, clientId) {
  const formData = payload.submission || payload.form || payload;
  const ghlSubmissionId = formData.id || formData.submissionId;
  
  if (!ghlSubmissionId) {
    throw new Error('Missing submission ID in payload');
  }
  
  // Find linked contact
  let contactId = null;
  const ghlContactId = formData.contactId || formData.contact_id;
  
  if (ghlContactId) {
    const contact = await prisma.syncedContact.findUnique({
      where: { ghlContactId: String(ghlContactId) }
    });
    contactId = contact?.id;
  }
  
  const submissionFields = {
    clientId,
    contactId,
    ghlSubmissionId: String(ghlSubmissionId),
    formId: formData.formId || formData.form_id,
    formName: formData.formName || formData.form_name,
    submissionData: formData.data || formData.fields || formData.submissionData || {},
    pageUrl: formData.pageUrl || formData.page_url,
    contactEmail: formData.email || formData.contactEmail,
    contactName: formData.name || formData.contactName,
    contactPhone: formData.phone || formData.contactPhone,
    utmSource: formData.utmSource || formData.utm_source,
    utmMedium: formData.utmMedium || formData.utm_medium,
    utmCampaign: formData.utmCampaign || formData.utm_campaign,
    submittedAt: formData.submittedAt ? new Date(formData.submittedAt) : new Date(),
    rawData: formData
  };
  
  const submission = await prisma.formSubmission.upsert({
    where: { ghlSubmissionId: String(ghlSubmissionId) },
    update: submissionFields,
    create: submissionFields
  });
  
  return {
    action: 'submitted',
    submissionId: submission.id,
    ghlSubmissionId: String(ghlSubmissionId),
    formId: submissionFields.formId,
    contactId
  };
}

/**
 * Handle email events
 */
async function handleEmailEvent(payload, clientId, eventType) {
  const emailData = payload.email || payload;
  
  // Find linked contact by email
  let contactId = null;
  const recipientEmail = emailData.recipient || emailData.to || emailData.email;
  
  if (recipientEmail) {
    const contact = await prisma.syncedContact.findFirst({
      where: { 
        email: recipientEmail,
        clientId
      }
    });
    contactId = contact?.id;
  }
  
  const eventFields = {
    clientId,
    contactId,
    emailId: emailData.id || emailData.emailId,
    messageId: emailData.messageId || emailData.message_id,
    templateId: emailData.templateId || emailData.template_id,
    templateName: emailData.templateName || emailData.template_name,
    eventType: mapEmailEventType(eventType),
    eventTime: emailData.timestamp ? new Date(emailData.timestamp) : new Date(),
    recipientEmail,
    clickedLink: emailData.link || emailData.clickedLink || emailData.url,
    clickCount: emailData.clickCount || emailData.click_count || (eventType === WebhookEventTypes.EMAIL_CLICKED ? 1 : 0),
    openCount: emailData.openCount || emailData.open_count || (eventType === WebhookEventTypes.EMAIL_OPENED ? 1 : 0),
    ipAddress: emailData.ip || emailData.ipAddress,
    userAgent: emailData.userAgent || emailData.user_agent,
    bounceReason: emailData.bounceReason || emailData.reason,
    bounceType: emailData.bounceType || emailData.type,
    rawData: emailData
  };
  
  const event = await prisma.emailEvent.create({
    data: eventFields
  });
  
  return {
    action: mapEmailEventType(eventType),
    eventId: event.id,
    recipientEmail,
    contactId
  };
}

// ============================================
// WORKFLOW TRIGGER INTEGRATION
// ============================================

/**
 * Trigger workflow engine for relevant events
 */
async function triggerWorkflowEngine(eventType, payload, clientId, handlerResults) {
  try {
    // Map webhook events to trigger engine event types
    const triggerEventType = mapToTriggerEventType(eventType);
    
    if (!triggerEventType) {
      return; // No matching trigger type
    }
    
    // Prepare event data for trigger engine
    const eventData = prepareTriggerEventData(eventType, payload, handlerResults);
    
    // Process through trigger engine
    await triggerEngine.processEvent(triggerEventType, eventData, clientId);
    
  } catch (error) {
    console.error('Error triggering workflow engine:', error);
    // Don't throw - workflow triggers shouldn't fail the webhook processing
  }
}

/**
 * Map webhook event type to trigger engine event type
 */
function mapToTriggerEventType(webhookEventType) {
  const mapping = {
    [WebhookEventTypes.CONTACT_CREATE]: 'contactCreated',
    [WebhookEventTypes.CONTACT_UPDATE]: 'contactUpdated',
    [WebhookEventTypes.OPPORTUNITY_STAGE_CHANGE]: 'stageChanged',
    [WebhookEventTypes.PIPELINE_STAGE_MOVEMENT]: 'stageChanged',
    [WebhookEventTypes.EMAIL_OPENED]: 'emailOpened',
    [WebhookEventTypes.EMAIL_CLICKED]: 'linkClicked',
    [WebhookEventTypes.FORM_SUBMIT]: 'formSubmitted',
    [WebhookEventTypes.APPOINTMENT_CREATE]: 'appointmentBooked'
  };
  
  return mapping[webhookEventType];
}

/**
 * Prepare event data for trigger engine
 */
function prepareTriggerEventData(eventType, payload, handlerResults) {
  const data = {
    timestamp: new Date().toISOString(),
    source: 'webhook'
  };
  
  // Add contact data if available
  if (handlerResults.contact) {
    data.contactId = handlerResults.contact.contactId;
    data.ghlContactId = handlerResults.contact.ghlContactId;
  }
  
  // Add specific data based on event type
  switch (eventType) {
    case WebhookEventTypes.CONTACT_CREATE:
    case WebhookEventTypes.CONTACT_UPDATE:
      const contactData = payload.contact || payload;
      data.email = contactData.email;
      data.firstName = contactData.firstName;
      data.lastName = contactData.lastName;
      data.tags = contactData.tags;
      data.source = contactData.source;
      break;
      
    case WebhookEventTypes.OPPORTUNITY_STAGE_CHANGE:
    case WebhookEventTypes.PIPELINE_STAGE_MOVEMENT:
      const stageData = payload.opportunity || payload.stage || payload;
      data.fromStage = stageData.fromStageName || stageData.from_stage_name;
      data.toStage = stageData.toStageName || stageData.to_stage_name || stageData.stageName;
      data.pipelineId = stageData.pipelineId || stageData.pipeline_id;
      break;
      
    case WebhookEventTypes.EMAIL_OPENED:
    case WebhookEventTypes.EMAIL_CLICKED:
      const emailData = payload.email || payload;
      data.templateId = emailData.templateId || emailData.template_id;
      data.openCount = emailData.openCount;
      data.clickCount = emailData.clickCount;
      if (emailData.link || emailData.url) {
        data.linkUrl = emailData.link || emailData.url;
      }
      break;
      
    case WebhookEventTypes.FORM_SUBMIT:
      const formData = payload.submission || payload.form || payload;
      data.formId = formData.formId || formData.form_id;
      data.formData = formData.data || formData.fields || {};
      break;
      
    case WebhookEventTypes.APPOINTMENT_CREATE:
      const aptData = payload.appointment || payload;
      data.calendarId = aptData.calendarId || aptData.calendar_id;
      data.scheduledTime = aptData.startTime || aptData.start_time;
      data.appointmentType = aptData.appointmentType || aptData.type;
      break;
  }
  
  return data;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract event ID from payload for deduplication
 */
function extractEventId(payload) {
  return payload.id || payload.eventId || payload.event_id || null;
}

/**
 * Sanitize headers for storage (remove sensitive data)
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized['x-api-key'];
  delete sanitized.cookie;
  return sanitized;
}

/**
 * Update delivery status
 */
async function updateDeliveryStatus(deliveryId, status, data = {}) {
  return prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status,
      processedAt: new Date(),
      ...data
    }
  });
}

/**
 * Map email event type to standardized format
 */
function mapEmailEventType(eventType) {
  const mapping = {
    [WebhookEventTypes.EMAIL_DELIVERED]: 'delivered',
    [WebhookEventTypes.EMAIL_OPENED]: 'opened',
    [WebhookEventTypes.EMAIL_CLICKED]: 'clicked',
    [WebhookEventTypes.EMAIL_BOUNCED]: 'bounced',
    [WebhookEventTypes.EMAIL_COMPLAINED]: 'complained',
    [WebhookEventTypes.EMAIL_UNSUBSCRIBED]: 'unsubscribed'
  };
  
  return mapping[eventType] || eventType.toLowerCase();
}

// ============================================
// RETRY PROCESSING
// ============================================

/**
 * Process failed webhook deliveries that need retry
 */
export async function processRetryQueue() {
  const now = new Date();
  
  const failedDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ['failed', 'retrying'] },
      nextRetryAt: { lte: now },
      retryCount: { lt: 3 }
    },
    take: 100,
    orderBy: { createdAt: 'asc' }
  });
  
  const results = [];
  
  for (const delivery of failedDeliveries) {
    try {
      // Get config for retry
      const config = await prisma.webhookConfig.findUnique({
        where: { id: delivery.configId }
      });
      
      if (!config || config.status !== 'active') {
        continue;
      }
      
      // Retry processing
      const handlerResults = await processEventByType(
        delivery.eventType,
        delivery.payload,
        delivery.clientId
      );
      
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          handlerResults,
          errorMessage: null
        }
      });
      
      results.push({ deliveryId: delivery.id, status: 'success' });
      
    } catch (error) {
      // Schedule next retry
      const retryDelay = Math.pow(2, delivery.retryCount) * 5000; // Exponential backoff
      const nextRetryAt = new Date(Date.now() + retryDelay);
      
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: delivery.retryCount >= 2 ? 'failed' : 'retrying',
          retryCount: { increment: 1 },
          nextRetryAt,
          errorMessage: error.message
        }
      });
      
      results.push({ 
        deliveryId: delivery.id, 
        status: delivery.retryCount >= 2 ? 'failed' : 'retrying',
        error: error.message 
      });
    }
  }
  
  return results;
}

// ============================================
// STATS AND MONITORING
// ============================================

/**
 * Get webhook statistics for a client
 */
export async function getWebhookStats(clientId, period = '24h') {
  const periodMs = period === '24h' ? 24 * 60 * 60 * 1000 :
                   period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                   period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                   24 * 60 * 60 * 1000;
  
  const since = new Date(Date.now() - periodMs);
  
  const [
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    avgProcessingTime,
    eventTypeBreakdown
  ] = await Promise.all([
    prisma.webhookDelivery.count({
      where: { clientId, createdAt: { gte: since } }
    }),
    prisma.webhookDelivery.count({
      where: { clientId, status: 'completed', createdAt: { gte: since } }
    }),
    prisma.webhookDelivery.count({
      where: { clientId, status: 'failed', createdAt: { gte: since } }
    }),
    prisma.webhookDelivery.aggregate({
      where: { 
        clientId, 
        status: 'completed',
        processingTimeMs: { not: null },
        createdAt: { gte: since }
      },
      _avg: { processingTimeMs: true }
    }),
    prisma.webhookDelivery.groupBy({
      by: ['eventType'],
      where: { clientId, createdAt: { gte: since } },
      _count: { eventType: true }
    })
  ]);
  
  return {
    period,
    total: totalDeliveries,
    successful: successfulDeliveries,
    failed: failedDeliveries,
    successRate: totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0,
    avgProcessingTimeMs: avgProcessingTime._avg.processingTimeMs || 0,
    eventTypes: eventTypeBreakdown.reduce((acc, curr) => {
      acc[curr.eventType] = curr._count.eventType;
      return acc;
    }, {})
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  processWebhook,
  verifyWebhookSignature,
  generateWebhookSignature,
  processRetryQueue,
  getWebhookStats,
  WebhookEventTypes,
  EventCategories
};
// Journey Builder Stack Type Definitions

// Status types for approval workflow
export const JOURNEY_STATUS = {
  DRAFT: 'Draft',
  CLIENT_REVIEW: 'Client Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected'
};

// Touchpoint types for journey nodes
export const TOUCHPOINT_TYPE = {
  EMAIL: 'Email',
  SMS: 'SMS',
  TASK: 'Task',
  WAIT: 'Wait',
  CONDITION: 'Condition',
  TRIGGER: 'Trigger',
  FORM: 'Form',
  CALL: 'Call',
  NOTE: 'Note'
};

/**
 * @typedef {Object} Client
 * @property {string} id
 * @property {string} name
 * @property {string} locationId
 * @property {Array} pipelines
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Journey
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} clientId
 * @property {string} pipelineId
 * @property {string} status
 * @property {Array} touchpoints
 * @property {number} version
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} approvedAt
 * @property {string} approvedBy
 * @property {string} publishedAt
 */

/**
 * @typedef {Object} Touchpoint
 * @property {string} id
 * @property {string} journeyId
 * @property {string} type
 * @property {string} name
 * @property {Object} content
 * @property {string} [content.subject]
 * @property {string} [content.body]
 * @property {number} [content.duration]
 * @property {string} [content.condition]
 * @property {string} [content.triggerType]
 * @property {string} [content.assignee]
 * @property {Object} position
 * @property {number} position.x
 * @property {number} position.y
 * @property {number} order
 * @property {Object} metadata
 */

/**
 * @typedef {Object} Transition
 * @property {string} id
 * @property {string} sourceId
 * @property {string} targetId
 * @property {string} [condition]
 * @property {string} [label]
 */

/**
 * @typedef {Object} Approval
 * @property {string} id
 * @property {string} journeyId
 * @property {string} status
 * @property {string} comments
 * @property {string} requestedBy
 * @property {string} reviewedBy
 * @property {string} reviewedAt
 * @property {number} version
 */

/**
 * @typedef {Object} Version
 * @property {string} id
 * @property {string} journeyId
 * @property {number} version
 * @property {Object} snapshot
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} changeLog
 */

/**
 * @typedef {Object} FlowNode
 * @property {string} id
 * @property {string} type
 * @property {Object} position
 * @property {number} position.x
 * @property {number} position.y
 * @property {Object} data
 * @property {string} data.label
 * @property {string} data.touchpointType
 * @property {Object} data.content
 * @property {string} [data.status]
 */

/**
 * @typedef {Object} FlowEdge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {string} [label]
 * @property {boolean} [animated]
 * @property {Object} [style]
 * @property {Object} [markerEnd]
 */

// Export empty objects for type reference
export const Client = {};
export const Journey = {};
export const Touchpoint = {};
export const Transition = {};
export const Approval = {};
export const Version = {};
export const FlowNode = {};
export const FlowEdge = {};

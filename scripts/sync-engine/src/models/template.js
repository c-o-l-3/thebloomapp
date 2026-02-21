/**
 * Template Models
 * Represents GHL templates for email, SMS, and workflows
 */

export class EmailTemplate {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.subject = data.subject || '';
    this.body = data.body || '';
    this.category = data.category || 'General';
    this.locationId = data.locationId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toGHL() {
    return {
      name: this.name,
      subject: this.subject,
      body: this.body,
      category: this.category
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      subject: this.subject,
      body: this.body,
      category: this.category,
      locationId: this.locationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class SMSTemplate {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.body = data.body || '';
    this.category = data.category || 'General';
    this.locationId = data.locationId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toGHL() {
    return {
      name: this.name,
      body: this.body,
      category: this.category
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      body: this.body,
      category: this.category,
      locationId: this.locationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class WorkflowTemplate {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.description = data.description || '';
    this.status = data.status || 'active';
    this.locationId = data.locationId || null;
    this.steps = data.steps || [];
    this.settings = data.settings || {
      triggerType: 'manual',
      filter: {},
      priority: 'normal',
      trackMetrics: true
    };
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toGHL() {
    return {
      name: this.name,
      description: this.description,
      status: this.status,
      steps: this.steps.map((step, index) => ({
        ...step,
        order: index
      })),
      settings: this.settings
    };
  }

  addStep(step, position = null) {
    if (position === null) {
      this.steps.push(step);
    } else {
      this.steps.splice(position, 0, step);
    }
    return this;
  }

  removeStep(stepId) {
    this.steps = this.steps.filter(step => step.id !== stepId);
    return this;
  }

  getStepByOrder(order) {
    return this.steps.find(step => step.order === order);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      locationId: this.locationId,
      steps: this.steps,
      settings: this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default {
  EmailTemplate,
  SMSTemplate,
  WorkflowTemplate
};

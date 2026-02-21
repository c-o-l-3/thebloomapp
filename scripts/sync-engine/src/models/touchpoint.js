/**
 * Touchpoint Model
 * Represents a single step/action within a journey
 */

export const TouchpointType = {
  EMAIL: 'Email',
  SMS: 'SMS',
  TASK: 'Task',
  WAIT: 'Wait',
  CONDITION: 'Condition',
  TRIGGER: 'Trigger',
  NOTE: 'Note',
  CALL: 'Call'
};

export const StepType = {
  EMAIL: 'email',
  SMS: 'sms',
  TASK: 'task',
  WAIT: 'delay',
  CONDITION: 'conditional',
  TRIGGER: 'trigger',
  NOTE: 'note',
  CALL: 'call'
};

export class Touchpoint {
  constructor(data) {
    this.id = data.id;
    this.journeyId = data.journeyId || null;
    this.name = data.name || '';
    this.type = data.type || TouchpointType.EMAIL;
    this.order = data.order || 0;
    this.config = {
      delay: data.config?.delay || 0,
      delayUnit: data.config?.delayUnit || 'hours',
      content: data.config?.content || '',
      templateId: data.config?.templateId || '',
      condition: data.config?.condition || '',
      assignee: data.config?.assignee || '',
      dueIn: data.config?.dueIn || 24,
      priority: data.config?.priority || 'normal',
      status: data.config?.status || 'pending',
      ...data.config
    };
    this.nextTouchpointId = data.nextTouchpointId || null;
    this.branchCondition = data.branchCondition || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  get isEmail() {
    return this.type === TouchpointType.EMAIL;
  }

  get isSMS() {
    return this.type === TouchpointType.SMS;
  }

  get isTask() {
    return this.type === TouchpointType.TASK;
  }

  get isWait() {
    return this.type === TouchpointType.WAIT;
  }

  get isCondition() {
    return this.type === TouchpointType.CONDITION;
  }

  get stepType() {
    return StepType[this.type] || StepType.EMAIL;
  }

  getDelayInMinutes() {
    const multiplier = {
      minutes: 1,
      hours: 60,
      days: 1440,
      weeks: 10080
    };
    return (this.config.delay || 0) * (multiplier[this.config.delayUnit] || 1);
  }

  toGHLStep(index) {
    const stepType = this.stepType;
    const step = {
      order: index,
      type: stepType,
      name: this.name,
      data: {}
    };

    switch (stepType) {
      case 'email':
        step.data = {
          subject: this.config.subject || this.name,
          body: this.config.content,
          templateId: this.config.templateId
        };
        break;
      case 'sms':
        step.data = {
          body: this.config.content,
          templateId: this.config.templateId
        };
        break;
      case 'task':
        step.data = {
          title: this.name,
          description: this.config.content,
          assignee: this.config.assignee,
          dueIn: this.config.dueIn,
          priority: this.config.priority
        };
        break;
      case 'delay':
        step.data = {
          amount: this.config.delay,
          unit: this.config.delayUnit
        };
        break;
      case 'conditional':
        step.data = {
          condition: this.config.condition,
          ifTrue: this.config.ifTrue || {},
          ifFalse: this.config.ifFalse || {}
        };
        break;
      case 'trigger':
        step.data = {
          triggerType: this.config.triggerType,
          triggerData: this.config.triggerData
        };
        break;
      default:
        step.data = {
          content: this.config.content
        };
    }

    return step;
  }

  toJSON() {
    return {
      id: this.id,
      journeyId: this.journeyId,
      name: this.name,
      type: this.type,
      order: this.order,
      config: this.config,
      nextTouchpointId: this.nextTouchpointId,
      branchCondition: this.branchCondition,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromAirtable(record) {
    return new Touchpoint({
      id: record.id,
      journeyId: record.get('Journey')?.[0] || null,
      name: record.get('Name') || '',
      type: record.get('Type') || TouchpointType.EMAIL,
      order: record.get('Order') || 0,
      config: {
        delay: record.get('Delay') || 0,
        delayUnit: record.get('Delay Unit') || 'hours',
        content: record.get('Content') || '',
        templateId: record.get('Template ID') || '',
        condition: record.get('Condition') || '',
        assignee: record.get('Assignee') || '',
        dueIn: record.get('Due In') || 24,
        priority: record.get('Priority') || 'normal',
        subject: record.get('Subject') || ''
      },
      nextTouchpointId: record.get('Next Touchpoint')?.[0] || null
    });
  }
}

export default Touchpoint;

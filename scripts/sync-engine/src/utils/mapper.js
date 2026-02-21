/**
 * Data Mapper
 * Transforms Airtable data to GHL-compatible formats
 */

import { TouchpointType, StepType } from '../models/touchpoint.js';
import logger from './logger.js';

class Mapper {
  /**
   * Map journey to GHL workflow
   */
  journeyToGHLWorkflow(journey) {
    const workflow = {
      name: this.sanitizeWorkflowName(journey.name),
      description: journey.description || '',
      status: 'active',
      steps: [],
      settings: {
        triggerType: 'manual',
        filter: {},
        priority: 'normal',
        trackMetrics: true,
        journeyId: journey.id,
        journeyVersion: journey.version
      }
    };

    if (journey.touchpoints && journey.touchpoints.length > 0) {
      workflow.steps = this.touchpointsToGHLSequence(journey.touchpoints);
    }

    logger.debug('Mapped journey to GHL workflow', { 
      journeyId: journey.id, 
      stepCount: workflow.steps.length 
    });

    return workflow;
  }

  /**
   * Map touchpoints to GHL workflow steps
   */
  touchpointsToGHLSequence(touchpoints) {
    const sortedTouchpoints = [...touchpoints].sort((a, b) => a.order - b.order);
    const steps = [];

    for (let i = 0; i < sortedTouchpoints.length; i++) {
      const touchpoint = sortedTouchpoints[i];
      const step = this.touchpointToGHLStep(touchpoint, i);
      steps.push(step);
    }

    return steps;
  }

  /**
   * Map single touchpoint to GHL step
   */
  touchpointToGHLStep(touchpoint, index) {
    const stepType = this.mapTouchpointTypeToStepType(touchpoint.type);
    const step = {
      id: `step_${touchpoint.id}`,
      order: index,
      type: stepType,
      name: touchpoint.name,
      data: {}
    };

    switch (stepType) {
      case StepType.EMAIL:
        step.data = {
          subject: this.extractEmailSubject(touchpoint),
          body: touchpoint.config.content || '',
          templateId: touchpoint.config.templateId || null
        };
        break;

      case StepType.SMS:
        step.data = {
          body: touchpoint.config.content || '',
          templateId: touchpoint.config.templateId || null
        };
        break;

      case StepType.TASK:
        step.data = {
          title: touchpoint.name,
          description: touchpoint.config.content || '',
          assignee: touchpoint.config.assignee || '',
          dueIn: touchpoint.config.dueIn || 24,
          priority: touchpoint.config.priority || 'normal',
          status: 'pending'
        };
        break;

      case StepType.WAIT:
        step.data = {
          amount: touchpoint.config.delay || 1,
          unit: this.mapDelayUnit(touchpoint.config.delayUnit)
        };
        break;

      case StepType.CONDITION:
        step.data = {
          condition: touchpoint.config.condition || '',
          ifTrue: { action: 'continue' },
          ifFalse: { action: 'end' }
        };
        break;

      case StepType.TRIGGER:
        step.data = {
          triggerType: touchpoint.config.triggerType || 'manual',
          triggerData: touchpoint.config.triggerData || {}
        };
        break;

      case StepType.NOTE:
        step.data = {
          content: touchpoint.config.content || ''
        };
        break;

      case StepType.CALL:
        step.data = {
          title: touchpoint.name,
          description: touchpoint.config.content || '',
          assignee: touchpoint.config.assignee || '',
          duration: touchpoint.config.duration || 30
        };
        break;

      default:
        step.data = {
          content: touchpoint.config.content || ''
        };
    }

    return step;
  }

  /**
   * Map Airtable touchpoint type to GHL step type
   */
  mapTouchpointTypeToStepType(touchpointType) {
    const mapping = {
      [TouchpointType.EMAIL]: StepType.EMAIL,
      [TouchpointType.SMS]: StepType.SMS,
      [TouchpointType.TASK]: StepType.TASK,
      [TouchpointType.WAIT]: StepType.WAIT,
      [TouchpointType.CONDITION]: StepType.CONDITION,
      [TouchpointType.TRIGGER]: StepType.TRIGGER,
      [TouchpointType.NOTE]: StepType.NOTE,
      [TouchpointType.CALL]: StepType.CALL
    };

    return mapping[touchpointType] || StepType.EMAIL;
  }

  /**
   * Map delay unit to GHL format
   */
  mapDelayUnit(unit) {
    const mapping = {
      'minutes': 'minutes',
      'minute': 'minutes',
      'min': 'minutes',
      'hours': 'hours',
      'hour': 'hours',
      'hr': 'hours',
      'days': 'days',
      'day': 'days',
      'd': 'days',
      'weeks': 'weeks',
      'week': 'weeks',
      'w': 'weeks'
    };

    return mapping[unit?.toLowerCase()] || 'hours';
  }

  /**
   * Extract email subject from touchpoint config
   */
  extractEmailSubject(touchpoint) {
    if (touchpoint.config.subject) {
      return touchpoint.config.subject;
    }
    if (touchpoint.config.templateSubject) {
      return touchpoint.config.templateSubject;
    }
    return touchpoint.name;
  }

  /**
   * Sanitize workflow name for GHL
   */
  sanitizeWorkflowName(name) {
    return name
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .trim()
      .substring(0, 100);
  }

  /**
   * Map GHL workflow to journey (reverse mapping)
   */
  ghlWorkflowToJourney(workflow) {
    return {
      name: workflow.name,
      description: workflow.description || '',
      ghlWorkflowId: workflow.id,
      status: workflow.status === 'active' ? 'Published' : 'Draft',
      version: workflow.settings?.journeyVersion || 1,
      touchpoints: this.ghlStepsToTouchpoints(workflow.steps || [])
    };
  }

  /**
   * Map GHL steps to touchpoints (reverse mapping)
   */
  ghlStepsToTouchpoints(steps) {
    return steps.map((step, index) => ({
      id: step.id?.replace('step_', '') || `ghl_${index}`,
      order: step.order !== undefined ? step.order : index,
      name: step.name || `Step ${index + 1}`,
      type: this.mapStepTypeToTouchpointType(step.type),
      config: this.extractStepConfig(step)
    }));
  }

  /**
   * Map GHL step type to touchpoint type
   */
  mapStepTypeToTouchpointType(stepType) {
    const mapping = {
      [StepType.EMAIL]: TouchpointType.EMAIL,
      [StepType.SMS]: TouchpointType.SMS,
      [StepType.TASK]: TouchpointType.TASK,
      [StepType.WAIT]: TouchpointType.WAIT,
      [StepType.CONDITION]: TouchpointType.CONDITION,
      [StepType.TRIGGER]: TouchpointType.TRIGGER,
      [StepType.NOTE]: TouchpointType.NOTE,
      [StepType.CALL]: TouchpointType.CALL
    };

    return mapping[stepType] || TouchpointType.EMAIL;
  }

  /**
   * Extract step config from GHL step data
   */
  extractStepConfig(step) {
    const config = {
      content: '',
      delay: 1,
      delayUnit: 'hours'
    };

    if (step.data) {
      config.content = step.data.body || step.data.content || step.data.description || '';
      
      if (step.data.amount) {
        config.delay = step.data.amount;
        config.delayUnit = step.data.unit || 'hours';
      }

      if (step.data.condition) {
        config.condition = step.data.condition;
      }

      if (step.data.assignee) {
        config.assignee = step.data.assignee;
      }

      if (step.data.dueIn) {
        config.dueIn = step.data.dueIn;
      }

      if (step.data.priority) {
        config.priority = step.data.priority;
      }

      if (step.data.templateId) {
        config.templateId = step.data.templateId;
      }

      if (step.data.subject) {
        config.subject = step.data.subject;
      }
    }

    return config;
  }

  /**
   * Create email template from journey data
   */
  createEmailTemplateFromTouchpoint(touchpoint, journey) {
    return {
      name: `${journey.name} - ${touchpoint.name}`,
      subject: touchpoint.config.subject || touchpoint.name,
      body: touchpoint.config.content || '',
      category: journey.category || journey.client || 'General'
    };
  }

  /**
   * Create SMS template from journey data
   */
  createSMSTemplateFromTouchpoint(touchpoint, journey) {
    return {
      name: `${journey.name} - ${touchpoint.name}`,
      body: touchpoint.config.content || '',
      category: journey.category || journey.client || 'General'
    };
  }
}

export const mapper = new Mapper();
export default mapper;

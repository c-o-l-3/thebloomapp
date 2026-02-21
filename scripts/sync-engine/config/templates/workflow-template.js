/**
 * GHL Workflow Template
 * Pre-configured workflow templates for common journey patterns
 */

export const WorkflowTemplates = {
  // Welcome Series Template
  WELCOME_SERIES: {
    name: 'Welcome Series',
    description: 'Automated welcome sequence for new contacts',
    status: 'active',
    steps: [
      {
        id: 'step_1',
        order: 0,
        type: 'email',
        name: 'Welcome Email',
        data: {
          subject: 'Welcome to {{company_name}}!',
          body: 'Thank you for joining us...',
          templateId: null
        }
      },
      {
        id: 'step_2',
        order: 1,
        type: 'delay',
        name: 'Wait 24 Hours',
        data: {
          amount: 24,
          unit: 'hours'
        }
      },
      {
        id: 'step_3',
        order: 2,
        type: 'email',
        name: 'Getting Started Tips',
        data: {
          subject: 'Getting Started with {{company_name}}',
          body: 'Here are some tips to help you get started...',
          templateId: null
        }
      },
      {
        id: 'step_4',
        order: 3,
        type: 'delay',
        name: 'Wait 48 Hours',
        data: {
          amount: 48,
          unit: 'hours'
        }
      },
      {
        id: 'step_5',
        order: 4,
        type: 'sms',
        name: 'Check-in SMS',
        data: {
          body: 'Hi {{first_name}}! Just checking in. How are you enjoying {{company_name}}?',
          templateId: null
        }
      }
    ],
    settings: {
      triggerType: 'tag',
      filter: {
        tagAdded: 'new-contact'
      },
      priority: 'normal',
      trackMetrics: true
    }
  },

  // Nurture Sequence Template
  NURTURE_SEQUENCE: {
    name: 'Lead Nurture Sequence',
    description: 'Multi-touch lead nurturing campaign',
    status: 'active',
    steps: [
      {
        id: 'step_1',
        order: 0,
        type: 'email',
        name: 'Initial Value Email',
        data: {
          subject: '{{first_name}}, here\'s something valuable',
          body: 'I wanted to share this with you...',
          templateId: null
        }
      },
      {
        id: 'step_2',
        order: 1,
        type: 'delay',
        name: 'Wait 2 Days',
        data: {
          amount: 2,
          unit: 'days'
        }
      },
      {
        id: 'step_3',
        order: 2,
        type: 'email',
        name: 'Case Study',
        data: {
          subject: 'See how [Similar Company] achieved results',
          body: 'Here\'s a case study...',
          templateId: null
        }
      },
      {
        id: 'step_4',
        order: 3,
        type: 'conditional',
        name: 'Email Opened?',
        data: {
          condition: 'email_opened',
          ifTrue: { action: 'continue' },
          ifFalse: { action: 'continue' }
        }
      }
    ],
    settings: {
      triggerType: 'manual',
      filter: {},
      priority: 'normal',
      trackMetrics: true
    }
  },

  // Re-engagement Template
  REENGAGEMENT: {
    name: 'Re-engagement Campaign',
    description: 'Win back inactive contacts',
    status: 'active',
    steps: [
      {
        id: 'step_1',
        order: 0,
        type: 'email',
        name: 'We Miss You',
        data: {
          subject: 'We miss you, {{first_name}}!',
          body: 'It\'s been a while since we\'ve seen you...',
          templateId: null
        }
      },
      {
        id: 'step_2',
        order: 1,
        type: 'delay',
        name: 'Wait 4 Days',
        data: {
          amount: 4,
          unit: 'days'
        }
      },
      {
        id: 'step_3',
        order: 2,
        type: 'sms',
        name: 'Quick Check-in',
        data: {
          body: 'Hey {{first_name}}, just wanted to say hi!',
          templateId: null
        }
      },
      {
        id: 'step_4',
        order: 3,
        type: 'delay',
        name: 'Wait 7 Days',
        data: {
          amount: 7,
          unit: 'days'
        }
      },
      {
        id: 'step_5',
        order: 4,
        type: 'task',
        name: 'Personal Follow-up',
        data: {
          title: 'Personal outreach to {{first_name}}',
          description: 'Contact has been inactive. Schedule a personal call.',
          assignee: null,
          dueIn: 24,
          priority: 'high'
        }
      }
    ],
    settings: {
      triggerType: 'filter',
      filter: {
        lastActivityDaysAgo: 30
      },
      priority: 'low',
      trackMetrics: true
    }
  },

  // Appointment Reminder Template
  APPOINTMENT_REMINDER: {
    name: 'Appointment Reminders',
    description: 'Automated appointment reminder sequence',
    status: 'active',
    steps: [
      {
        id: 'step_1',
        order: 0,
        type: 'email',
        name: 'Appointment Confirmation',
        data: {
          subject: 'Your appointment is confirmed!',
          body: 'Your appointment details: {{appointment_details}}',
          templateId: null
        }
      },
      {
        id: 'step_2',
        order: 1,
        type: 'delay',
        name: 'Wait 24 Hours',
        data: {
          amount: 24,
          unit: 'hours'
        }
      },
      {
        id: 'step_3',
        order: 2,
        type: 'email',
        name: '24 Hour Reminder',
        data: {
          subject: 'Reminder: Your appointment tomorrow',
          body: 'Just a friendly reminder...',
          templateId: null
        }
      },
      {
        id: 'step_4',
        order: 3,
        type: 'delay',
        name: 'Wait 2 Hours',
        data: {
          amount: 2,
          unit: 'hours'
        }
      },
      {
        id: 'step_5',
        order: 4,
        type: 'sms',
        name: 'Final Reminder',
        data: {
          body: 'Reminder: Your appointment is in 2 hours!',
          templateId: null
        }
      }
    ],
    settings: {
      triggerType: 'appointment',
      filter: {},
      priority: 'high',
      trackMetrics: true
    }
  }
};

export default WorkflowTemplates;

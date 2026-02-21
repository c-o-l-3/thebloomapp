/**
 * GHL SMS Template
 * Pre-configured SMS templates for common use cases
 */

export const SMSTemplates = {
  // Appointment Reminder
  APPOINTMENT_REMINDER: {
    name: 'Appointment Reminder SMS',
    body: 'Hi {{first_name}}, this is a reminder for your appointment with {{staff_name}} on {{appointment_date}} at {{appointment_time}}. Reply CONFIRM to confirm or call us to reschedule.',
    category: 'Appointments'
  },

  // Quick Check-in
  QUICK_CHECKIN: {
    name: 'Quick Check-in SMS',
    body: 'Hi {{first_name}}! Just checking in. How are you doing? Let us know if we can help with anything.',
    category: 'Follow-up'
  },

  // Welcome SMS
  WELCOME_SMS: {
    name: 'Welcome SMS',
    body: 'Welcome to {{company_name}}, {{first_name}}! 🎉 We\'re excited to have you. Check your email for your welcome details!',
    category: 'Welcome'
  },

  // Promotional SMS
  PROMOTIONAL: {
    name: 'Promotional SMS',
    body: 'Hi {{first_name}}! 🎁 Special offer just for you: {{offer_description}} Use code {{offer_code}} at checkout. Valid until {{offer_expiry}}. Reply STOP to opt out.',
    category: 'Promotions'
  },

  // Appointment Confirmation
  APPOINTMENT_CONFIRMATION: {
    name: 'Appointment Confirmed SMS',
    body: 'Your appointment at {{company_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. See you then!',
    category: 'Appointments'
  },

  // Thank You
  THANK_YOU: {
    name: 'Thank You SMS',
    body: 'Thank you for visiting {{company_name}}, {{first_name}}! We appreciate your business. See you again soon!',
    category: 'Thank You'
  },

  // Task Reminder
  TASK_REMINDER: {
    name: 'Task Reminder SMS',
    body: 'Hi {{first_name}}, don\'t forget: {{task_description}}. Due: {{task_due_date}}. Let us know if you need help!',
    category: 'Reminders'
  },

  // Cart Abandonment
  CART_ABANDONMENT: {
    name: 'Cart Abandonment SMS',
    body: 'Hi {{first_name}}, you left some items in your cart at {{company_name}}. Complete your purchase here: {{cart_url}}',
    category: 'Sales'
  },

  // Feedback Request
  FEEDBACK_REQUEST: {
    name: 'Feedback Request SMS',
    body: 'Hi {{first_name}}, thanks for visiting {{company_name}}! We\'d love your feedback: {{feedback_url}}',
    category: 'Feedback'
  },

  // Event Reminder
  EVENT_REMINDER: {
    name: 'Event Reminder SMS',
    body: 'Reminder: {{event_name}} is coming up on {{event_date}} at {{event_time}}! Location: {{event_location}}. We hope to see you there!',
    category: 'Events'
  }
};

export default SMSTemplates;

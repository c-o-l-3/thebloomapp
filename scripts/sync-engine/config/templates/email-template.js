/**
 * GHL Email Template
 * Pre-configured email templates for common use cases
 */

export const EmailTemplates = {
  // Welcome Email
  WELCOME: {
    name: 'Welcome Email',
    subject: 'Welcome to {{company_name}}!',
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4A90D9; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background: #4A90D9; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{company_name}}!</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Thank you for joining us! We're thrilled to have you on board.</p>
      <p>Here's what you can expect from us:</p>
      <ul>
        <li>Exclusive content and updates</li>
        <li>Special offers just for members</li>
        <li>Tips and resources to help you succeed</li>
      </ul>
      <p style="text-align: center; margin-top: 30px;">
        <a href="{{company_website}}" class="button">Get Started</a>
      </p>
    </div>
    <div class="footer">
      <p>{{company_name}} - {{company_tagline}}</p>
      <p>{{company_address}}</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    category: 'Welcome'
  },

  // Appointment Confirmation
  APPOINTMENT_CONFIRMATION: {
    name: 'Appointment Confirmation',
    subject: 'Your Appointment is Confirmed - {{appointment_date}}',
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2ECC71; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Appointment Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Your appointment has been confirmed. Here are the details:</p>
      <div class="details">
        <p><strong>Date:</strong> {{appointment_date}}</p>
        <p><strong>Time:</strong> {{appointment_time}}</p>
        <p><strong>Location:</strong> {{appointment_location}}</p>
        <p><strong>With:</strong> {{staff_name}}</p>
      </div>
      <p>Please arrive 10 minutes early. If you need to reschedule, click the button below.</p>
      <p style="text-align: center;">
        <a href="{{reschedule_url}}" style="display: inline-block; padding: 12px 24px; background: #2ECC71; color: white; text-decoration: none; border-radius: 4px;">Reschedule</a>
      </p>
    </div>
    <div class="footer">
      <p>{{company_name}}</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    category: 'Appointments'
  },

  // Follow-up Email
  FOLLOW_UP: {
    name: 'Follow-up Email',
    subject: 'Following up on our conversation - {{first_name}}',
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Thank you for taking the time to meet with us today.</p>
      <p>As discussed, here are the next steps:</p>
      <ul>
        {{next_steps}}
      </ul>
      <p>Please don't hesitate to reach out if you have any questions.</p>
      <p>Best regards,</p>
      <p>{{staff_name}}<br>{{company_name}}</p>
    </div>
    <div class="footer">
      <p>{{company_name}} - {{company_tagline}}</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    category: 'Follow-up'
  },

  // Newsletter
  NEWSLETTER: {
    name: 'Monthly Newsletter',
    subject: '{{newsletter_title}} - {{company_name}}',
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #333; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .article { margin-bottom: 30px; }
    .article h3 { color: #4A90D9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
      <p>{{newsletter_title}}</p>
      <p>{{current_date}}</p>
    </div>
    <div class="content">
      {{newsletter_content}}
    </div>
    <div class="footer">
      <p>{{company_name}} - {{company_tagline}}</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Update Preferences</a></p>
    </div>
  </div>
</body>
</html>
    `,
    category: 'Newsletter'
  },

  // Promotional
  PROMOTIONAL: {
    name: 'Special Offer',
    subject: 'Exclusive Offer for You - {{first_name}}',
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #E74C3C; color: white; padding: 30px; text-align: center; }
    .offer-box { background: #FFF5F5; border: 2px dashed #E74C3C; padding: 20px; text-align: center; margin: 20px 0; }
    .offer-code { font-size: 24px; font-weight: bold; color: #E74C3C; }
    .content { padding: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Special Offer Just for You!</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>{{offer_description}}</p>
      <div class="offer-box">
        <p>Use code:</p>
        <p class="offer-code">{{offer_code}}</p>
        <p>{{offer_details}}</p>
      </div>
      <p style="text-align: center;">
        <a href="{{offer_url}}" style="display: inline-block; padding: 15px 30px; background: #E74C3C; color: white; text-decoration: none; border-radius: 4px;">Claim Offer</a>
      </p>
      <p style="color: #999; font-size: 12px;">Offer expires {{offer_expiry}}</p>
    </div>
    <div class="footer">
      <p>{{company_name}}</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `,
    category: 'Promotions'
  }
};

export default EmailTemplates;

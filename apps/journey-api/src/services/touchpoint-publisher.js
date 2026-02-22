/**
 * Touchpoint Publisher Service
 * Publishes touchpoints to GoHighLevel as email or SMS templates
 */

import axios from 'axios';

/**
 * Publish result structure
 * @typedef {Object} PublishResult
 * @property {boolean} success - Whether publish was successful
 * @property {string} [ghlTemplateId] - GHL template ID if created/updated
 * @property {string} [error] - Error message if failed
 * @property {string} [details] - Additional error details
 */

class TouchpointPublisher {
  constructor() {
    this.apiKey = process.env.GHL_API_KEY;
    this.baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
  }

  /**
   * Get axios config with auth headers
   */
  getRequestConfig() {
    return {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    };
  }

  /**
   * Main publish method - publishes a touchpoint to GHL
   * @param {Object} touchpoint - Touchpoint data from database
   * @param {string} locationId - GHL location ID
   * @returns {Promise<PublishResult>} Publish result
   */
  async publishTouchpoint(touchpoint, locationId) {
    try {
      console.log('Publishing touchpoint to GHL', { 
        touchpointId: touchpoint.id, 
        type: touchpoint.type,
        locationId 
      });

      // Validate touchpoint type
      if (!this.isPublishableType(touchpoint.type)) {
        return {
          success: false,
          error: `Touchpoint type '${touchpoint.type}' cannot be published to GHL`,
          details: 'Only email and SMS touchpoints can be published as GHL templates'
        };
      }

      // Route to appropriate publish method based on type
      let result;
      switch (touchpoint.type.toLowerCase()) {
        case 'email':
          result = await this.publishEmailTemplate(touchpoint, locationId);
          break;
        case 'sms':
          result = await this.publishSMSTemplate(touchpoint, locationId);
          break;
        default:
          return {
            success: false,
            error: `Unsupported touchpoint type: ${touchpoint.type}`
          };
      }

      if (result.success) {
        console.log('Touchpoint published to GHL', {
          touchpointId: touchpoint.id,
          ghlTemplateId: result.ghlTemplateId,
          type: touchpoint.type
        });
      } else {
        console.error('Failed to publish touchpoint', {
          touchpointId: touchpoint.id,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      console.error('Exception publishing touchpoint', {
        touchpointId: touchpoint.id,
        error: error.message
      });

      return {
        success: false,
        error: 'Internal error during publish',
        details: error.message
      };
    }
  }

  /**
   * Check if touchpoint type can be published
   * @param {string} type - Touchpoint type
   * @returns {boolean}
   */
  isPublishableType(type) {
    const publishableTypes = ['email', 'sms'];
    return publishableTypes.includes(type?.toLowerCase());
  }

  /**
   * Publish email touchpoint as GHL email template
   * @param {Object} touchpoint - Email touchpoint
   * @param {string} locationId - GHL location ID
   * @returns {Promise<PublishResult>} Publish result
   */
  async publishEmailTemplate(touchpoint, locationId) {
    try {
      const content = touchpoint.content || {};
      const config = touchpoint.config || {};

      // Extract email data
      const templateData = {
        name: touchpoint.name,
        subject: content.subject || config.subject || 'No Subject',
        body: content.body || config.content || content.html || '<p>No content</p>',
        locationId: locationId
      };

      // Validate required fields
      if (!templateData.name) {
        return {
          success: false,
          error: 'Touchpoint name is required'
        };
      }

      let response;

      // Check if already has a GHL template ID (update vs create)
      if (touchpoint.ghlTemplateId) {
        console.log('Updating existing GHL email template', {
          touchpointId: touchpoint.id,
          ghlTemplateId: touchpoint.ghlTemplateId
        });

        response = await axios.put(
          `${this.baseUrl}/emails/builder/${touchpoint.ghlTemplateId}`,
          templateData,
          this.getRequestConfig()
        );
      } else {
        console.log('Creating new GHL email template', {
          touchpointId: touchpoint.id
        });

        response = await axios.post(
          `${this.baseUrl}/emails/builder`,
          templateData,
          this.getRequestConfig()
        );
      }

      return {
        success: true,
        ghlTemplateId: response.data.id || response.data.templateId,
        action: touchpoint.ghlTemplateId ? 'updated' : 'created',
        ghlResponse: response.data
      };
    } catch (error) {
      const errorMessage = this.parseGhlError(error);
      return {
        success: false,
        error: `Failed to publish email template: ${errorMessage}`,
        details: error.message
      };
    }
  }

  /**
   * Publish SMS touchpoint as GHL SMS template
   * @param {Object} touchpoint - SMS touchpoint
   * @param {string} locationId - GHL location ID
   * @returns {Promise<PublishResult>} Publish result
   */
  async publishSMSTemplate(touchpoint, locationId) {
    try {
      const content = touchpoint.content || {};
      const config = touchpoint.config || {};

      // Extract SMS body from various possible field locations
      const smsBody = content.body || config.content || config.body || content.message || '';

      if (!smsBody) {
        return {
          success: false,
          error: 'SMS body/content is required'
        };
      }

      const templateData = {
        name: touchpoint.name,
        body: smsBody,
        locationId: locationId
      };

      // Validate required fields
      if (!templateData.name) {
        return {
          success: false,
          error: 'Touchpoint name is required'
        };
      }

      let response;

      // Check if already has a GHL template ID (update vs create)
      if (touchpoint.ghlTemplateId) {
        console.log('Updating existing GHL SMS template', {
          touchpointId: touchpoint.id,
          ghlTemplateId: touchpoint.ghlTemplateId
        });

        response = await axios.put(
          `${this.baseUrl}/locations/${locationId}/templates/${touchpoint.ghlTemplateId}`,
          templateData,
          this.getRequestConfig()
        );
      } else {
        console.log('Creating new GHL SMS template', {
          touchpointId: touchpoint.id
        });

        response = await axios.post(
          `${this.baseUrl}/locations/${locationId}/templates`,
          templateData,
          this.getRequestConfig()
        );
      }

      return {
        success: true,
        ghlTemplateId: response.data.id || response.data.templateId,
        action: touchpoint.ghlTemplateId ? 'updated' : 'created',
        ghlResponse: response.data
      };
    } catch (error) {
      const errorMessage = this.parseGhlError(error);
      return {
        success: false,
        error: `Failed to publish SMS template: ${errorMessage}`,
        details: error.message
      };
    }
  }

  /**
   * Parse GHL API error into user-friendly message
   * @param {Error} error - API error
   * @returns {string} User-friendly error message
   */
  parseGhlError(error) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.status === 401) {
      return 'Authentication failed - check GHL API key';
    }
    if (error.response?.status === 403) {
      return 'Permission denied - check GHL location access';
    }
    if (error.response?.status === 429) {
      return 'Rate limit exceeded - please try again later';
    }
    return error.message || 'Unknown error';
  }

  /**
   * Get publish status for a touchpoint
   * @param {Object} touchpoint - Touchpoint data
   * @returns {Object} Status info
   */
  getPublishStatus(touchpoint) {
    if (touchpoint.ghlTemplateId) {
      return {
        status: 'published',
        label: 'Published',
        ghlTemplateId: touchpoint.ghlTemplateId,
        canPublish: true
      };
    }

    if (this.isPublishableType(touchpoint.type)) {
      return {
        status: 'draft',
        label: 'Draft',
        canPublish: true
      };
    }

    return {
      status: 'not_publishable',
      label: 'Not Publishable',
      canPublish: false
    };
  }

  /**
   * Test GHL connection for a location
   * @param {string} locationId - GHL location ID
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(locationId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/locations/${locationId}`,
        this.getRequestConfig()
      );
      return {
        success: true,
        message: 'Connection successful',
        location: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Export singleton instance
export const touchpointPublisher = new TouchpointPublisher();
export default touchpointPublisher;

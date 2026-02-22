/**
 * Touchpoint Publisher Service
 * Publishes touchpoints to GoHighLevel as email or SMS templates
 */

import { ghlService } from './ghl.js';
import logger from '../utils/logger.js';

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
    this.ghl = ghlService;
  }

  /**
   * Main publish method - publishes a touchpoint to GHL
   * @param {Object} touchpoint - Touchpoint data from database
   * @param {string} locationId - GHL location ID
   * @returns {Promise<PublishResult>} Publish result
   */
  async publishTouchpoint(touchpoint, locationId) {
    try {
      logger.info('Publishing touchpoint to GHL', { 
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

      // Set location ID for GHL service
      this.ghl.locationId = locationId;

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
        logger.success('Touchpoint published to GHL', {
          touchpointId: touchpoint.id,
          ghlTemplateId: result.ghlTemplateId,
          type: touchpoint.type
        });
      } else {
        logger.error('Failed to publish touchpoint', {
          touchpointId: touchpoint.id,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      logger.error('Exception publishing touchpoint', {
        touchpointId: touchpoint.id,
        error: error.message,
        stack: error.stack
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
        body: content.body || config.content || content.html || '<p>No content</p>'
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
        logger.info('Updating existing GHL email template', {
          touchpointId: touchpoint.id,
          ghlTemplateId: touchpoint.ghlTemplateId
        });

        response = await this.ghl.updateEmailTemplate(
          touchpoint.ghlTemplateId,
          templateData
        );
      } else {
        logger.info('Creating new GHL email template', {
          touchpointId: touchpoint.id
        });

        response = await this.ghl.createEmailTemplate(templateData);
      }

      return {
        success: true,
        ghlTemplateId: response.id || response.templateId,
        action: touchpoint.ghlTemplateId ? 'updated' : 'created',
        ghlResponse: response
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
        body: smsBody
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
        logger.info('Updating existing GHL SMS template', {
          touchpointId: touchpoint.id,
          ghlTemplateId: touchpoint.ghlTemplateId
        });

        response = await this.ghl.updateSMSTemplate(
          touchpoint.ghlTemplateId,
          templateData
        );
      } else {
        logger.info('Creating new GHL SMS template', {
          touchpointId: touchpoint.id
        });

        response = await this.ghl.createSMSTemplate(templateData);
      }

      return {
        success: true,
        ghlTemplateId: response.id || response.templateId,
        action: touchpoint.ghlTemplateId ? 'updated' : 'created',
        ghlResponse: response
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
      this.ghl.locationId = locationId;
      const result = await this.ghl.testConnection();
      return result;
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

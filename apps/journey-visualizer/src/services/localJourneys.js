/**
 * Local Journey Service
 * Reads journey data directly from local JSON files
 * Alternative to Airtable for standalone deployments
 */

import { JOURNEY_STATUS } from '../types';

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'airtable';
const DEFAULT_CLIENT_SLUG = import.meta.env.VITE_CLIENT_SLUG || 'promise-farm';

// Vite glob patterns - must be at module level to be analyzed at build time
// Path from apps/journey-visualizer/src/services/ to project root:
// services/ -> src/ -> journey-visualizer/ -> apps/ -> root/ (4 levels up)
const indexFiles = import.meta.glob('../../../../clients/*/journeys/generated-journeys.json', { eager: true });
const journeyFiles = import.meta.glob('../../../../clients/*/journeys/journey_*.json', { eager: true });

/**
 * Check if local mode is enabled
 */
export function isLocalMode() {
  return DATA_SOURCE === 'local';
}

/**
 * Transform local journey format to visualizer format
 */
function transformJourney(localJourney) {
  return {
    id: localJourney.id,
    name: localJourney.name,
    description: localJourney.description || '',
    status: localJourney.status || JOURNEY_STATUS.DRAFT,
    clientId: localJourney.client,
    client: localJourney.client,
    category: localJourney.category || 'nurture',
    version: localJourney.version || 1,
    trigger: localJourney.trigger || null,
    goal: localJourney.goal || '',
    pipelineId: localJourney.pipelineId || null,
    touchpoints: (localJourney.touchpoints || []).map((tp, index) => transformTouchpoint(tp, index, localJourney.id))
  };
}

/**
 * Transform local touchpoint to visualizer format
 */
function transformTouchpoint(localTouchpoint, index, journeyId) {
  const content = typeof localTouchpoint.content === 'object'
    ? localTouchpoint.content
    : { body: localTouchpoint.content, subject: '', greeting: '', cta: null, templateType: '' };

  const type = (localTouchpoint.type || 'email').charAt(0).toUpperCase() + (localTouchpoint.type || 'email').slice(1);

  return {
    id: localTouchpoint.id || `tp-${journeyId}-${index}`,
    name: localTouchpoint.name,
    type: type,
    order: localTouchpoint.order || index + 1,
    journeyId: journeyId,
    content: {
      subject: content.subject || '',
      greeting: content.greeting || '',
      body: content.body || '',
      cta: content.cta || null,
      templateType: content.templateType || localTouchpoint.templateId || ''
    },
    config: {
      delay: localTouchpoint.delay || 0,
      delayUnit: localTouchpoint.delayUnit || 'hours',
      condition: localTouchpoint.condition || '',
      assignee: localTouchpoint.assignee || '',
      dueIn: localTouchpoint.dueIn || 24
    },
    nextTouchpointId: localTouchpoint.nextTouchpointId || null
  };
}

/**
 * Get all available clients from the local clients directory
 * In production, this would be a static JSON file or API endpoint
 */
export async function getLocalClients() {
  try {
    // For local mode, we'll use a static list of clients that exist in the file system
    // In a real deployment, this could be fetched from a static JSON endpoint
    const clients = [
      {
        id: 'promise-farm',
        name: 'Promise Farm',
        slug: 'promise-farm',
        pipelines: 3,
        workflows: 24,
        industry: 'wedding-venue'
      },
      {
        id: 'maison-albion',
        name: 'Maison Albion',
        slug: 'maison-albion',
        pipelines: 4,
        workflows: 48,
        industry: 'wedding-venue'
      },
      {
        id: 'cameron-estate',
        name: 'Cameron Estate',
        slug: 'cameron-estate',
        pipelines: 3,
        workflows: 32,
        industry: 'wedding-venue'
      },
      {
        id: 'maravilla-gardens',
        name: 'Maravilla Gardens',
        slug: 'maravilla-gardens',
        pipelines: 3,
        workflows: 36,
        industry: 'wedding-venue'
      },
      {
        id: 'maui-pineapple-chapel',
        name: 'Maui Pineapple Chapel',
        slug: 'maui-pineapple-chapel',
        pipelines: 2,
        workflows: 24,
        industry: 'wedding-venue'
      }
    ];
    
    return clients;
  } catch (error) {
    console.error('Error loading local clients:', error);
    return [];
  }
}

/**
 * Load journeys from local JSON files
 * Uses Vite's dynamic import to load from the clients directory
 */
export async function getLocalJourneys(clientSlug = DEFAULT_CLIENT_SLUG) {
  try {
    // Debug: Log what the glob patterns found
    console.log('[DEBUG] indexFiles keys:', Object.keys(indexFiles));
    console.log('[DEBUG] journeyFiles keys:', Object.keys(journeyFiles));
    
    // Try to load the generated-journeys.json which contains the index
    let journeyList = [];
    // Use relative path matching (without leading slash) since glob returns relative paths
    const indexPath = Object.keys(indexFiles).find(path => path.includes(`clients/${clientSlug}/journeys/generated-journeys.json`));
    console.log('[DEBUG] Looking for client:', clientSlug, 'Found indexPath:', indexPath);
    console.log('[DEBUG] Available index paths:', Object.keys(indexFiles));
    
    if (indexPath) {
      const indexModule = indexFiles[indexPath];
      // Handle both ES module default and direct JSON structure
      const indexData = indexModule.default || indexModule;
      journeyList = indexData.journeys || [];
    } else {
      console.warn(`No generated-journeys.json found for ${clientSlug}, scanning for journey files...`);
    }

    const journeys = [];
    
    // Process discovered journey files
    // Use relative path matching (without leading slash) since glob returns relative paths
    for (const [path, module] of Object.entries(journeyFiles)) {
      if (path.includes(`clients/${clientSlug}/journeys/`)) {
        const journey = module.default || module;
        if (journey) {
          journeys.push(transformJourney(journey));
        } else {
          console.warn(`[LocalJourneys] No journey data found in ${path}`);
        }
      }
    }
    
    // If no journey files found, try loading from the index
    if (journeys.length === 0 && journeyList.length > 0) {
      for (const journeyRef of journeyList) {
        try {
          // Use correct relative path (4 levels up to reach project root)
          const journeyModule = await import(`../../../../clients/${clientSlug}/journeys/${journeyRef.id}.json`);
          const journeyData = journeyModule.default || journeyModule;
          if (journeyData) {
            journeys.push(transformJourney(journeyData));
          }
        } catch (journeyError) {
          console.warn(`Could not load journey ${journeyRef.id}:`, journeyError);
        }
      }
    }
    
    console.log(`[LocalJourneys] Loaded ${journeys.length} journeys for ${clientSlug}`);
    return journeys;
  } catch (error) {
    console.error('Error loading local journeys:', error);
    
    // Fallback: Return mock data for development
    console.warn('[LocalJourneys] Falling back to mock data');
    return getMockJourneys();
  }
}

/**
 * Get a single journey by ID
 */
export async function getLocalJourney(journeyId, clientSlug = DEFAULT_CLIENT_SLUG) {
  try {
    // Try to find the specific journey file
    // Use relative path matching (without leading slash) since glob returns relative paths
    for (const [path, module] of Object.entries(journeyFiles)) {
      if (path.includes(`clients/${clientSlug}/journeys/${journeyId}.json`)) {
        const journey = module.default || module;
        return journey ? transformJourney(journey) : null;
      }
    }
    
    // If not found as a file, search in loaded journeys
    const journeys = await getLocalJourneys(clientSlug);
    return journeys.find(j => j.id === journeyId) || null;
  } catch (error) {
    console.error(`Error loading journey ${journeyId}:`, error);
    return null;
  }
}

/**
 * Create a new journey (local mode - stores in memory)
 */
export async function createLocalJourney(journeyData, clientSlug = DEFAULT_CLIENT_SLUG) {
  const newJourney = {
    id: `journey-${Date.now()}`,
    ...journeyData,
    client: clientSlug,
    status: JOURNEY_STATUS.DRAFT,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    touchpoints: []
  };
  
  return transformJourney(newJourney);
}

/**
 * Update an existing journey (local mode - stores in memory)
 */
export async function updateLocalJourney(journeyId, journeyData, clientSlug = DEFAULT_CLIENT_SLUG) {
  const journey = await getLocalJourney(journeyId, clientSlug);
  if (!journey) {
    throw new Error(`Journey ${journeyId} not found`);
  }
  
  return {
    ...journey,
    ...journeyData,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Delete a journey (local mode)
 */
export async function deleteLocalJourney(journeyId, clientSlug = DEFAULT_CLIENT_SLUG) {
  // In local file mode, we can't actually delete files
  // This would require a backend API
  console.warn(`[LocalJourneys] Delete operation not supported in local file mode for ${journeyId}`);
  return true;
}

/**
 * Check if local file mode is available
 */
export async function isLocalModeAvailable() {
  return isLocalMode();
}

/**
 * Mock data for development/testing without Airtable
 */
function getMockJourneys() {
  return [
    {
      id: 'journey_new-leads-to-tour',
      name: 'New Leads → Book a Tour',
      description: '7-touchpoint nurture sequence to convert new leads into booked tours',
      status: JOURNEY_STATUS.DRAFT,
      clientId: 'promise-farm',
      client: 'promise-farm',
      category: 'nurture',
      version: 1,
      trigger: { type: 'form_submission', form: 'website_inquiry' },
      goal: 'Book a venue tour',
      touchpoints: [
        {
          id: 'tp_welcome',
          name: 'Welcome - Immediate',
          type: 'Email',
          order: 1,
          journeyId: 'journey_new-leads-to-tour',
          content: {
            subject: 'Welcome to Promise Farm! 🌿',
            greeting: '',
            body: 'Welcome to Promise Farm!',
            cta: null,
            templateType: 'welcome'
          },
          config: {
            delay: 0,
            delayUnit: 'hours',
            condition: '',
            assignee: '',
            dueIn: 24
          }
        }
      ]
    },
    {
      id: 'journey_tour-reminders',
      name: 'Booked Tours → Tour Reminders',
      description: '4-touchpoint reminder sequence for booked tours',
      status: JOURNEY_STATUS.DRAFT,
      clientId: 'promise-farm',
      client: 'promise-farm',
      category: 'confirmation',
      version: 1,
      trigger: { type: 'calendar_booking', event: 'tour_scheduled' },
      goal: 'Ensure tour attendance',
      touchpoints: []
    }
  ];
}

export default {
  isLocalMode,
  isAvailable: isLocalModeAvailable,
  getClients: getLocalClients,
  getJourneys: getLocalJourneys,
  getJourney: getLocalJourney,
  createJourney: createLocalJourney,
  updateJourney: updateLocalJourney,
  deleteJourney: deleteLocalJourney
};

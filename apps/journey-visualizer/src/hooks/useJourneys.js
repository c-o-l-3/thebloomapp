/**
 * useJourneys Hook
 * Manages journey data fetching and state
 * Supports both Airtable and local file modes
 */

import { useState, useEffect, useCallback } from 'react';
import { JOURNEY_STATUS } from '../types';
import { 
  isLocalMode, 
  getLocalJourneys, 
  createLocalJourney, 
  updateLocalJourney, 
  deleteLocalJourney 
} from '../services/localJourneys';
import { ConflictError } from '../services/apiClient';

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'airtable';

/**
 * Custom hook for managing journey data
 * @param {Object} airtableClient - Airtable client instance (optional in local mode)
 * @param {string} clientId - Optional client ID to filter journeys
 */
export function useJourneys(airtableClient, clientId = null) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Conflict resolution state
  const [conflict, setConflict] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);

  const usingLocalMode = isLocalMode();

  const fetchJourneys = useCallback(async () => {
    // Local file mode
    if (usingLocalMode) {
      try {
        setLoading(true);
        setError(null);
        const localJourneys = await getLocalJourneys(clientId);
        setJourneys(localJourneys);
      } catch (err) {
        console.error('Error loading local journeys:', err);
        setError(err.message);
        // Fall back to mock data on error
        setJourneys(getMockJourneys());
      } finally {
        setLoading(false);
      }
      return;
    }

    // Airtable mode
    if (!airtableClient) {
      // Use mock data if no client provided
      setJourneys(getMockJourneys());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const records = await airtableClient.getJourneys(clientId);
      const formattedJourneys = records.map(formatJourneyRecord);
      setJourneys(formattedJourneys);
    } catch (err) {
      setError(err.message);
      // Fall back to mock data on error
      setJourneys(getMockJourneys());
    } finally {
      setLoading(false);
    }
  }, [airtableClient, clientId, usingLocalMode]);

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  const createJourney = async (journeyData) => {
    // Local file mode
    if (usingLocalMode) {
      try {
        const newJourney = await createLocalJourney(journeyData, clientId);
        setJourneys(prev => [...prev, newJourney]);
        return newJourney;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    }

    // Airtable mode
    if (!airtableClient) {
      const newJourney = {
        id: `journey-${Date.now()}`,
        ...journeyData,
        status: JOURNEY_STATUS.DRAFT,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setJourneys(prev => [...prev, newJourney]);
      return newJourney;
    }

    try {
      const record = await airtableClient.createJourney(journeyData);
      const formattedJourney = formatJourneyRecord(record);
      setJourneys(prev => [...prev, formattedJourney]);
      return formattedJourney;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateJourney = async (journeyId, journeyData) => {
    // Local file mode
    if (usingLocalMode) {
      try {
        const updatedJourney = await updateLocalJourney(journeyId, journeyData, clientId);
        setJourneys(prev => prev.map(j => 
          j.id === journeyId ? { ...updatedJourney, ...journeyData, updatedAt: new Date().toISOString() } : j
        ));
        return updatedJourney;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    }

    // Airtable mode
    if (!airtableClient) {
      setJourneys(prev => prev.map(j => 
        j.id === journeyId ? { ...j, ...journeyData, updatedAt: new Date().toISOString() } : j
      ));
      return;
    }

    try {
      // Include version for optimistic locking if available
      const currentJourney = journeys.find(j => j.id === journeyId);
      const dataWithVersion = {
        ...journeyData,
        version: journeyData.version ?? currentJourney?.version ?? 1
      };
      
      const result = await airtableClient.updateJourney(journeyId, dataWithVersion);
      setJourneys(prev => prev.map(j => 
        j.id === journeyId ? { ...j, ...result, updatedAt: new Date().toISOString() } : j
      ));
      // Clear any previous conflict
      setConflict(null);
      setPendingChanges(null);
      return result;
    } catch (err) {
      // Handle conflict error
      if (err instanceof ConflictError) {
        setConflict({
          journeyId,
          serverData: err.serverData,
          currentVersion: err.currentVersion,
          submittedVersion: err.submittedVersion
        });
        setPendingChanges(journeyData);
        setError(null); // Don't set generic error for conflicts
        throw err;
      }
      setError(err.message);
      throw err;
    }
  };

  /**
   * Retry update with fresh server data (merge strategy)
   * @param {Object} mergedData - User's merged changes
   */
  const retryUpdateWithMerge = async (mergedData) => {
    if (!conflict) return;
    
    const { journeyId, serverData } = conflict;
    
    try {
      const dataWithVersion = {
        ...mergedData,
        version: serverData.version
      };
      
      const result = await airtableClient.updateJourney(journeyId, dataWithVersion);
      setJourneys(prev => prev.map(j => 
        j.id === journeyId ? { ...j, ...result, updatedAt: new Date().toISOString() } : j
      ));
      setConflict(null);
      setPendingChanges(null);
      return result;
    } catch (err) {
      if (err instanceof ConflictError) {
        // Another conflict occurred, update state
        setConflict({
          journeyId,
          serverData: err.serverData,
          currentVersion: err.currentVersion,
          submittedVersion: err.submittedVersion
        });
        setPendingChanges(mergedData);
        throw err;
      }
      setError(err.message);
      throw err;
    }
  };

  /**
   * Force overwrite server data with user's changes
   */
  const forceOverwrite = async () => {
    if (!conflict || !pendingChanges) return;
    
    const { journeyId, serverData } = conflict;
    
    try {
      // Use current server version to force update
      const dataWithVersion = {
        ...pendingChanges,
        version: serverData.version
      };
      
      const result = await airtableClient.updateJourney(journeyId, dataWithVersion);
      setJourneys(prev => prev.map(j => 
        j.id === journeyId ? { ...j, ...result, updatedAt: new Date().toISOString() } : j
      ));
      setConflict(null);
      setPendingChanges(null);
      return result;
    } catch (err) {
      if (err instanceof ConflictError) {
        setConflict({
          journeyId,
          serverData: err.serverData,
          currentVersion: err.currentVersion,
          submittedVersion: err.submittedVersion
        });
        throw err;
      }
      setError(err.message);
      throw err;
    }
  };

  /**
   * Cancel conflict resolution and discard changes
   */
  const cancelConflict = () => {
    setConflict(null);
    setPendingChanges(null);
    setError(null);
  };

  /**
   * Refresh journey data from server and clear conflict
   */
  const refreshAndAcceptServerVersion = async () => {
    if (!conflict) return;
    
    const { journeyId, serverData } = conflict;
    
    // Update local state with server data
    setJourneys(prev => prev.map(j => 
      j.id === journeyId ? { ...j, ...serverData } : j
    ));
    setConflict(null);
    setPendingChanges(null);
  };

  const deleteJourney = async (journeyId) => {
    // Local file mode
    if (usingLocalMode) {
      try {
        await deleteLocalJourney(journeyId, clientId);
        setJourneys(prev => prev.filter(j => j.id !== journeyId));
      } catch (err) {
        setError(err.message);
        throw err;
      }
      return;
    }

    // Airtable mode
    if (!airtableClient) {
      setJourneys(prev => prev.filter(j => j.id !== journeyId));
      return;
    }

    try {
      await airtableClient.deleteRecord('Journeys', journeyId);
      setJourneys(prev => prev.filter(j => j.id !== journeyId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    journeys,
    loading,
    error,
    refetch: fetchJourneys,
    createJourney,
    updateJourney,
    deleteJourney,
    isLocalMode: usingLocalMode,
    // Conflict resolution
    conflict,
    pendingChanges,
    retryUpdateWithMerge,
    forceOverwrite,
    cancelConflict,
    refreshAndAcceptServerVersion
  };
}

/**
 * Format Airtable record to Journey object
 */
function formatJourneyRecord(record) {
  return {
    id: record.id,
    name: record.fields.Name,
    description: record.fields.Description || '',
    clientId: record.fields.Client?.[0] || null,
    pipelineId: record.fields.Pipeline?.[0] || null,
    status: record.fields.Status || JOURNEY_STATUS.DRAFT,
    version: record.fields.Version || 1,
    createdAt: record.createdTime,
    updatedAt: record.fields.Updated || record.createdTime
  };
}

/**
 * Get mock journey data for development/demo
 */
export function getMockJourneys() {
  return [
    {
      id: 'journey-1',
      name: 'Welcome Series',
      description: 'New customer onboarding sequence',
      clientId: 'maison-albion',
      pipelineId: 'pipeline-1',
      status: JOURNEY_STATUS.APPROVED,
      version: 3,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    },
    {
      id: 'journey-2',
      name: 'Lead Nurture',
      description: 'Prospect engagement workflow',
      clientId: 'maison-albion',
      pipelineId: 'pipeline-2',
      status: JOURNEY_STATUS.CLIENT_REVIEW,
      version: 2,
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-18T11:00:00Z'
    },
    {
      id: 'journey-3',
      name: 'Win-back Campaign',
      description: 'Re-engage inactive customers',
      clientId: 'maison-albion',
      pipelineId: 'pipeline-3',
      status: JOURNEY_STATUS.DRAFT,
      version: 1,
      createdAt: '2024-01-22T16:00:00Z',
      updatedAt: '2024-01-22T16:00:00Z'
    },
    {
      id: 'journey-4',
      name: 'Appointment Reminder',
      description: 'Pre and post appointment touchpoints',
      clientId: 'maison-albion',
      pipelineId: 'pipeline-4',
      status: JOURNEY_STATUS.PUBLISHED,
      version: 5,
      createdAt: '2024-01-05T08:00:00Z',
      updatedAt: '2024-01-12T10:00:00Z'
    }
  ];
}

export default useJourneys;

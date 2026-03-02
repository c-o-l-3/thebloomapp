/**
 * useJourneys Hook
 * Manages journey data fetching and state
 * Uses PostgreSQL API exclusively (Airtable migration completed - P0 Q3 2026)
 */

import { useState, useEffect, useCallback } from 'react';
import { JOURNEY_STATUS } from '../types';
import { getDataService } from '../services/dataService';
import { ConflictError } from '../services/apiClient';

/**
 * Custom hook for managing journey data
 * @param {string} clientId - Optional client ID to filter journeys
 */
export function useJourneys(clientId = null) {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Conflict resolution state
  const [conflict, setConflict] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);

  const dataService = getDataService();

  const fetchJourneys = useCallback(async () => {
    console.log('[useJourneys] Fetching journeys, clientId:', clientId, 'Type:', typeof clientId);
    try {
      setLoading(true);
      setError(null);
      console.log('[useJourneys] Calling dataService.getJourneys with clientId:', clientId);
      const journeys = await dataService.getJourneys({ clientId });
      console.log('[useJourneys] Received journeys:', journeys?.length, journeys);
      setJourneys(journeys);
    } catch (err) {
      console.error('Error loading journeys:', err);
      setError(err.message);
      // Fall back to mock data on error
      setJourneys(getMockJourneys());
    } finally {
      setLoading(false);
    }
  }, [dataService, clientId]);

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  const createJourney = async (journeyData) => {
    try {
      const newJourney = await dataService.createJourney({
        ...journeyData,
        clientId
      });
      setJourneys(prev => [...prev, newJourney]);
      return newJourney;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateJourney = async (journeyId, journeyData) => {
    try {
      // Include version for optimistic locking if available
      const currentJourney = journeys.find(j => j.id === journeyId);
      const dataWithVersion = {
        ...journeyData,
        version: journeyData.version ?? currentJourney?.version ?? 1
      };
      
      const result = await dataService.updateJourney(journeyId, dataWithVersion);
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
      
      const result = await dataService.updateJourney(journeyId, dataWithVersion);
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
      
      const result = await dataService.updateJourney(journeyId, dataWithVersion);
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
    try {
      await dataService.deleteJourney(journeyId);
      setJourneys(prev => prev.filter(j => j.id !== journeyId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const duplicateJourney = async (journeyId, newName) => {
    try {
      const duplicated = await dataService.duplicateJourney(journeyId, newName);
      setJourneys(prev => [...prev, duplicated]);
      return duplicated;
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
    duplicateJourney,
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

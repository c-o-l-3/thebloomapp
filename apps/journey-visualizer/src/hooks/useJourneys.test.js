/**
 * Tests for useJourneys Hook - Conflict Resolution
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJourneys } from './useJourneys';
import { ConflictError } from '../services/apiClient';

// Mock localJourneys module
vi.mock('../services/localJourneys', () => ({
  isLocalMode: vi.fn(() => false),
  getLocalJourneys: vi.fn(),
  createLocalJourney: vi.fn(),
  updateLocalJourney: vi.fn(),
  deleteLocalJourney: vi.fn()
}));

describe('useJourneys - Conflict Resolution', () => {
  let mockAirtableClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAirtableClient = {
      getJourneys: vi.fn(),
      updateJourney: vi.fn()
    };
  });

  describe('Conflict State Management', () => {
    it('should initialize with no conflict', () => {
      const { result } = renderHook(() => useJourneys(mockAirtableClient));

      expect(result.current.conflict).toBeNull();
      expect(result.current.pendingChanges).toBeNull();
    });

    it('should set conflict state on 409 error', async () => {
      const serverJourney = {
        id: 'journey-123',
        name: 'Server Version',
        version: 5
      };

      const conflictError = new ConflictError(
        'Conflict detected',
        serverJourney,
        5,
        3
      );

      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Original', version: 3 }
      ]);
      mockAirtableClient.updateJourney.mockRejectedValue(conflictError);

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      // Wait for initial fetch
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Attempt update that will conflict
      const userChanges = { name: 'My Update', version: 3 };
      
      await act(async () => {
        try {
          await result.current.updateJourney('journey-123', userChanges);
        } catch (e) {
          // Expected to throw
        }
      });

      // Verify conflict state
      expect(result.current.conflict).not.toBeNull();
      expect(result.current.conflict.journeyId).toBe('journey-123');
      expect(result.current.conflict.serverData).toEqual(serverJourney);
      expect(result.current.conflict.currentVersion).toBe(5);
      expect(result.current.conflict.submittedVersion).toBe(3);
      expect(result.current.pendingChanges).toEqual(userChanges);
    });

    it('should clear conflict on cancelConflict', async () => {
      const serverJourney = { id: 'journey-123', name: 'Server Version', version: 5 };
      const conflictError = new ConflictError('Conflict', serverJourney, 5, 3);

      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Original', version: 3 }
      ]);
      mockAirtableClient.updateJourney.mockRejectedValue(conflictError);

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Trigger conflict
      await act(async () => {
        try {
          await result.current.updateJourney('journey-123', { name: 'Update', version: 3 });
        } catch (e) {}
      });

      expect(result.current.conflict).not.toBeNull();

      // Cancel conflict
      act(() => {
        result.current.cancelConflict();
      });

      expect(result.current.conflict).toBeNull();
      expect(result.current.pendingChanges).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Conflict Resolution Actions', () => {
    it('should retry update with merged data', async () => {
      const serverJourney = { id: 'journey-123', name: 'Server Name', version: 5 };
      const conflictError = new ConflictError('Conflict', serverJourney, 5, 3);

      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Original', version: 3 }
      ]);

      // First call conflicts, second succeeds
      mockAirtableClient.updateJourney
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({ id: 'journey-123', name: 'Merged Name', version: 6 });

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Trigger conflict
      await act(async () => {
        try {
          await result.current.updateJourney('journey-123', { name: 'My Name', version: 3 });
        } catch (e) {}
      });

      // Retry with merged data
      const mergedData = { name: 'Merged Name', description: 'Added description' };
      
      await act(async () => {
        await result.current.retryUpdateWithMerge(mergedData);
      });

      // Verify the retry uses server version
      expect(mockAirtableClient.updateJourney).toHaveBeenLastCalledWith(
        'journey-123',
        { ...mergedData, version: 5 }
      );

      // Conflict should be cleared
      expect(result.current.conflict).toBeNull();
    });

    it('should force overwrite server data', async () => {
      const serverJourney = { id: 'journey-123', name: 'Server Name', version: 5 };
      const conflictError = new ConflictError('Conflict', serverJourney, 5, 3);

      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Original', version: 3 }
      ]);

      mockAirtableClient.updateJourney
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({ id: 'journey-123', name: 'Forced Update', version: 6 });

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Trigger conflict with pending changes
      const pendingChanges = { name: 'My Update', description: 'My Desc', version: 3 };
      
      await act(async () => {
        try {
          await result.current.updateJourney('journey-123', pendingChanges);
        } catch (e) {}
      });

      // Force overwrite
      await act(async () => {
        await result.current.forceOverwrite();
      });

      // Verify force overwrite uses pending changes with server version
      expect(mockAirtableClient.updateJourney).toHaveBeenLastCalledWith(
        'journey-123',
        { ...pendingChanges, version: 5 }
      );

      expect(result.current.conflict).toBeNull();
    });

    it('should accept server version and refresh', async () => {
      const serverJourney = { 
        id: 'journey-123', 
        name: 'Server Name', 
        description: 'Server Desc',
        version: 5 
      };
      const conflictError = new ConflictError('Conflict', serverJourney, 5, 3);

      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Original', version: 3 }
      ]);
      mockAirtableClient.updateJourney.mockRejectedValue(conflictError);

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Trigger conflict
      await act(async () => {
        try {
          await result.current.updateJourney('journey-123', { name: 'My Name', version: 3 });
        } catch (e) {}
      });

      // Accept server version
      act(() => {
        result.current.refreshAndAcceptServerVersion();
      });

      // Local journeys should be updated with server data
      const updatedJourney = result.current.journeys.find(j => j.id === 'journey-123');
      expect(updatedJourney.name).toBe('Server Name');
      expect(updatedJourney.description).toBe('Server Desc');
      expect(updatedJourney.version).toBe(5);

      expect(result.current.conflict).toBeNull();
    });
  });

  describe('Version Handling', () => {
    it('should include current version in update requests', async () => {
      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Test', version: 5 }
      ]);
      mockAirtableClient.updateJourney.mockResolvedValue({
        id: 'journey-123',
        name: 'Updated',
        version: 6
      });

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateJourney('journey-123', { name: 'Updated' });
      });

      // Should include version from local state
      expect(mockAirtableClient.updateJourney).toHaveBeenCalledWith(
        'journey-123',
        { name: 'Updated', version: 5 }
      );
    });

    it('should use version from journeyData if provided', async () => {
      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Test', version: 5 }
      ]);
      mockAirtableClient.updateJourney.mockResolvedValue({
        id: 'journey-123',
        name: 'Updated',
        version: 10
      });

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateJourney('journey-123', { name: 'Updated', version: 10 });
      });

      // Should use provided version
      expect(mockAirtableClient.updateJourney).toHaveBeenCalledWith(
        'journey-123',
        { name: 'Updated', version: 10 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should not set generic error for conflicts', async () => {
      const serverJourney = { id: 'journey-123', name: 'Server', version: 5 };
      const conflictError = new ConflictError('Conflict', serverJourney, 5, 3);

      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Original', version: 3 }
      ]);
      mockAirtableClient.updateJourney.mockRejectedValue(conflictError);

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try {
          await result.current.updateJourney('journey-123', { name: 'Update', version: 3 });
        } catch (e) {}
      });

      // Error should be null for conflicts (conflict state is separate)
      expect(result.current.error).toBeNull();
      expect(result.current.conflict).not.toBeNull();
    });

    it('should set error for non-conflict errors', async () => {
      mockAirtableClient.getJourneys.mockResolvedValue([
        { id: 'journey-123', name: 'Original', version: 3 }
      ]);
      mockAirtableClient.updateJourney.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useJourneys(mockAirtableClient, 'client-1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try {
          await result.current.updateJourney('journey-123', { name: 'Update' });
        } catch (e) {}
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.conflict).toBeNull();
    });
  });
});

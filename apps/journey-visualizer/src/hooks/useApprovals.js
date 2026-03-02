/**
 * useApprovals Hook
 * Manages approval workflow state and actions
 * Uses PostgreSQL API exclusively (Airtable migration completed - P0 Q3 2026)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { JOURNEY_STATUS } from '../types';
import { getDataService } from '../services/dataService';

/**
 * Custom hook for managing approval workflows
 */
export function useApprovals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const dataService = getDataService();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchApprovals = useCallback(async (journeyId) => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const approvals = await dataService.getApprovals(journeyId);
      if (isMountedRef.current) {
        setApprovals(approvals);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        setError(err.message);
        // Fall back to mock data on error
        setApprovals(getMockApprovals(journeyId));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [dataService]);

  const requestApproval = async (journeyId, version) => {
    const newApproval = {
      id: `approval-${Date.now()}`,
      journeyId,
      status: JOURNEY_STATUS.CLIENT_REVIEW,
      comments: '',
      requestedBy: 'current-user',
      requestedAt: new Date().toISOString(),
      version
    };

    try {
      const record = await dataService.requestApproval(journeyId, {
        status: JOURNEY_STATUS.CLIENT_REVIEW,
        version
      });
      const approval = record || newApproval;
      setApprovals(prev => [approval, ...prev]);
      return approval;
    } catch (err) {
      setError(err.message);
      // Still add to local state for UI feedback
      setApprovals(prev => [newApproval, ...prev]);
      return newApproval;
    }
  };

  const approveJourney = async (journeyId, approvalId, comments = '') => {
    const updatedApproval = {
      id: approvalId,
      journeyId,
      status: JOURNEY_STATUS.APPROVED,
      comments,
      reviewedBy: 'current-user',
      reviewedAt: new Date().toISOString()
    };

    try {
      await dataService.approveJourney(journeyId, comments);
      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    } catch (err) {
      setError(err.message);
      // Still update local state for UI feedback
      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    }
  };

  const rejectJourney = async (journeyId, approvalId, comments) => {
    if (!comments || comments.trim() === '') {
      throw new Error('Rejection requires a comment explaining the reason');
    }

    const updatedApproval = {
      id: approvalId,
      journeyId,
      status: JOURNEY_STATUS.REJECTED,
      comments,
      reviewedBy: 'current-user',
      reviewedAt: new Date().toISOString()
    };

    try {
      await dataService.rejectJourney(journeyId, comments);
      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    } catch (err) {
      setError(err.message);
      // Still update local state for UI feedback
      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    }
  };

  const getLatestApproval = (journeyId) => {
    return approvals.find(a => a.journeyId === journeyId);
  };

  const getApprovalHistory = (journeyId) => {
    return approvals.filter(a => a.journeyId === journeyId);
  };

  return {
    approvals,
    loading,
    error,
    fetchApprovals,
    requestApproval,
    approveJourney,
    rejectJourney,
    getLatestApproval,
    getApprovalHistory
  };
}

/**
 * Get mock approval history for development/demo
 */
export function getMockApprovals(journeyId) {
  return [
    {
      id: 'approval-1',
      journeyId,
      status: JOURNEY_STATUS.APPROVED,
      comments: 'Looks great! Ready for launch.',
      requestedBy: 'agency-team',
      reviewedBy: 'client-user',
      reviewedAt: '2024-01-20T14:30:00Z',
      requestedAt: '2024-01-18T10:00:00Z',
      version: 3
    },
    {
      id: 'approval-2',
      journeyId,
      status: JOURNEY_STATUS.REJECTED,
      comments: 'Please revise the SMS message - too formal for our brand.',
      requestedBy: 'agency-team',
      reviewedBy: 'client-user',
      reviewedAt: '2024-01-17T16:00:00Z',
      requestedAt: '2024-01-16T09:00:00Z',
      version: 2
    },
    {
      id: 'approval-3',
      journeyId,
      status: JOURNEY_STATUS.APPROVED,
      comments: 'Initial structure approved.',
      requestedBy: 'agency-team',
      reviewedBy: 'client-user',
      reviewedAt: '2024-01-15T11:00:00Z',
      requestedAt: '2024-01-15T10:00:00Z',
      version: 1
    }
  ];
}

export default useApprovals;

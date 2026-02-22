/**
 * useApprovals Hook
 * Manages approval workflow state and actions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { JOURNEY_STATUS } from '../types';
import { format } from 'date-fns';

/**
 * Custom hook for managing approval workflows
 * @param {Object} airtableClient - Airtable client instance
 */
export function useApprovals(airtableClient) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

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

    if (!airtableClient) {
      if (isMountedRef.current) {
        setApprovals(getMockApprovals(journeyId));
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const records = await airtableClient.getApprovals(journeyId, abortControllerRef.current.signal);
      if (isMountedRef.current) {
        const formattedApprovals = records.map(formatApprovalRecord);
        setApprovals(formattedApprovals);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [airtableClient]);

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

    if (!airtableClient) {
      setApprovals(prev => [newApproval, ...prev]);
      return newApproval;
    }

    try {
      const record = await airtableClient.createApproval({
        journeyId,
        status: JOURNEY_STATUS.CLIENT_REVIEW,
        version
      });
      const formattedApproval = formatApprovalRecord(record);
      setApprovals(prev => [formattedApproval, ...prev]);
      return formattedApproval;
    } catch (err) {
      setError(err.message);
      throw err;
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

    if (!airtableClient) {
      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    }

    try {
      // Update approval record
      await airtableClient.updateRecord('Approvals', approvalId, {
        Status: JOURNEY_STATUS.APPROVED,
        Comments: comments,
        'Reviewed By': 'current-user',
        'Reviewed At': new Date().toISOString()
      });

      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    } catch (err) {
      setError(err.message);
      throw err;
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

    if (!airtableClient) {
      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    }

    try {
      // Update approval record
      await airtableClient.updateRecord('Approvals', approvalId, {
        Status: JOURNEY_STATUS.REJECTED,
        Comments: comments,
        'Reviewed By': 'current-user',
        'Reviewed At': new Date().toISOString()
      });

      setApprovals(prev => prev.map(a => 
        a.id === approvalId ? { ...a, ...updatedApproval } : a
      ));
      return updatedApproval;
    } catch (err) {
      setError(err.message);
      throw err;
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
 * Format Airtable record to Approval object
 */
function formatApprovalRecord(record) {
  return {
    id: record.id,
    journeyId: record.fields.Journey?.[0] || null,
    status: record.fields.Status || JOURNEY_STATUS.DRAFT,
    comments: record.fields.Comments || '',
    requestedBy: record.fields['Requested By'] || null,
    reviewedBy: record.fields['Reviewed By'] || null,
    reviewedAt: record.fields['Reviewed At'] || null,
    requestedAt: record.createdTime,
    version: record.fields.Version || 1
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

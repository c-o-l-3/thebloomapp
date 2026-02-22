/**
 * Tests for API Client - Conflict Detection
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ConflictError } from './apiClient';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }))
  }
}));

describe('ConflictError', () => {
  it('should create a ConflictError with correct properties', () => {
    const serverData = { id: 'journey-123', name: 'Server Version', version: 5 };
    const error = new ConflictError(
      'Conflict detected',
      serverData,
      5,
      3
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Conflict detected');
    expect(error.serverData).toBe(serverData);
    expect(error.currentVersion).toBe(5);
    expect(error.submittedVersion).toBe(3);
    expect(error.statusCode).toBe(409);
  });

  it('should be throwable and catchable', () => {
    const serverData = { id: 'journey-123', version: 5 };
    
    expect(() => {
      throw new ConflictError('Test conflict', serverData, 5, 3);
    }).toThrow(ConflictError);

    try {
      throw new ConflictError('Test conflict', serverData, 5, 3);
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect(err.currentVersion).toBe(5);
    }
  });
});

describe('ApiClient Conflict Handling', () => {
  let client;
  let mockAxiosInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ApiClient();
    // Access the mocked axios instance
    mockAxiosInstance = client.client;
  });

  describe('updateJourney', () => {
    it('should throw ConflictError on 409 response', async () => {
      const serverJourney = {
        id: 'journey-123',
        name: 'Server Version',
        version: 5
      };

      const axiosError = {
        response: {
          status: 409,
          data: {
            error: 'Conflict detected',
            message: 'The journey has been modified',
            currentVersion: 5,
            submittedVersion: 3,
            journey: serverJourney
          }
        }
      };

      mockAxiosInstance.put.mockRejectedValue(axiosError);

      await expect(
        client.updateJourney('journey-123', { name: 'My Update', version: 3 })
      ).rejects.toThrow(ConflictError);

      try {
        await client.updateJourney('journey-123', { name: 'My Update', version: 3 });
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect(err.serverData).toEqual(serverJourney);
        expect(err.currentVersion).toBe(5);
        expect(err.submittedVersion).toBe(3);
      }
    });

    it('should return data on successful update', async () => {
      const responseData = {
        id: 'journey-123',
        name: 'Updated Name',
        version: 4
      };

      mockAxiosInstance.put.mockResolvedValue({ data: responseData });

      const result = await client.updateJourney('journey-123', {
        name: 'Updated Name',
        version: 3
      });

      expect(result).toEqual(responseData);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/journeys/journey-123',
        { name: 'Updated Name', version: 3 }
      );
    });

    it('should throw non-409 errors as-is', async () => {
      const axiosError = new Error('Network error');
      axiosError.response = { status: 500 };

      mockAxiosInstance.put.mockRejectedValue(axiosError);

      await expect(
        client.updateJourney('journey-123', { name: 'Update' })
      ).rejects.toThrow('Network error');
    });

    it('should include server journey data in conflict error', async () => {
      const serverJourney = {
        id: 'journey-123',
        name: 'Server Name',
        description: 'Server Description',
        version: 5,
        status: 'draft',
        touchpoints: []
      };

      const axiosError = {
        response: {
          status: 409,
          data: {
            error: 'Conflict detected',
            currentVersion: 5,
            submittedVersion: 3,
            journey: serverJourney
          }
        }
      };

      mockAxiosInstance.put.mockRejectedValue(axiosError);

      try {
        await client.updateJourney('journey-123', { name: 'Client Name', version: 3 });
      } catch (err) {
        expect(err.serverData).toEqual(serverJourney);
        expect(err.serverData.name).toBe('Server Name');
        expect(err.serverData.description).toBe('Server Description');
      }
    });
  });
});

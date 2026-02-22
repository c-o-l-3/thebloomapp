/**
 * Integration Tests for Journey Concurrent Edit Scenarios
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let dbAvailable = false;

describe('Journey Concurrent Edit Integration', () => {
  let testClient;
  let testJourney;

  beforeAll(async () => {
    // Check if database is available
    try {
      await prisma.$connect();
      dbAvailable = true;
      
      // Create test client
      testClient = await prisma.client.create({
        data: {
          slug: 'test-concurrent-client',
          name: 'Test Concurrent Client',
          status: 'active'
        }
      });
    } catch (error) {
      console.log('Database not available, skipping integration tests');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    
    // Cleanup
    await prisma.journey.deleteMany({
      where: { clientId: testClient.id }
    });
    await prisma.client.delete({
      where: { id: testClient.id }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Create a fresh test journey before each test
    await prisma.journey.deleteMany({
      where: { clientId: testClient.id }
    });

    testJourney = await prisma.journey.create({
      data: {
        clientId: testClient.id,
        name: 'Test Journey',
        description: 'Original Description',
        status: 'draft',
        version: 1
      }
    });
  });

  describe('Simultaneous Edit Scenarios', () => {
    it('should detect conflict when two users edit same version', async () => {
      if (!dbAvailable) {
        console.log('Skipping: Database not available');
        return;
      }

      // User A and User B both load version 1
      const userAVersion = testJourney.version;
      const userBVersion = testJourney.version;

      expect(userAVersion).toBe(1);
      expect(userBVersion).toBe(1);

      // User A saves first
      const userAUpdate = await prisma.journey.update({
        where: { 
          id: testJourney.id,
          version: userAVersion // Optimistic lock check
        },
        data: {
          name: 'User A Updated Name',
          version: { increment: 1 }
        }
      });

      expect(userAUpdate.version).toBe(2);
      expect(userAUpdate.name).toBe('User A Updated Name');

      // User B tries to save with stale version
      // This should fail due to version mismatch
      let conflictDetected = false;
      try {
        await prisma.journey.update({
          where: { 
            id: testJourney.id,
            version: userBVersion // Still 1, should fail
          },
          data: {
            name: 'User B Updated Name',
            version: { increment: 1 }
          }
        });
      } catch (error) {
        // Prisma will throw if where clause doesn't match
        conflictDetected = true;
      }

      expect(conflictDetected).toBe(true);

      // Verify server still has User A's data
      const finalJourney = await prisma.journey.findUnique({
        where: { id: testJourney.id }
      });

      expect(finalJourney.version).toBe(2);
      expect(finalJourney.name).toBe('User A Updated Name');
    });

    it('should allow sequential edits from same user', async () => {
      if (!dbAvailable) return;

      // First edit
      const update1 = await prisma.journey.update({
        where: { id: testJourney.id },
        data: {
          name: 'First Edit',
          version: { increment: 1 }
        }
      });

      expect(update1.version).toBe(2);
      expect(update1.name).toBe('First Edit');

      // Second edit (sequential, using updated version)
      const update2 = await prisma.journey.update({
        where: { id: testJourney.id },
        data: {
          name: 'Second Edit',
          version: { increment: 1 }
        }
      });

      expect(update2.version).toBe(3);
      expect(update2.name).toBe('Second Edit');
    });

    it('should increment version on each save', async () => {
      if (!dbAvailable) return;

      const versions = [];

      for (let i = 0; i < 5; i++) {
        const updated = await prisma.journey.update({
          where: { id: testJourney.id },
          data: {
            name: `Edit ${i + 1}`,
            version: { increment: 1 }
          }
        });
        versions.push(updated.version);
        testJourney = updated; // Update reference for next iteration
      }

      expect(versions).toEqual([2, 3, 4, 5, 6]);
    });
  });

  describe('Version Consistency', () => {
    it('should maintain version consistency across fields', async () => {
      if (!dbAvailable) return;

      // Update multiple fields at once
      const updated = await prisma.journey.update({
        where: { id: testJourney.id },
        data: {
          name: 'Updated Name',
          description: 'Updated Description',
          status: 'client_review',
          version: { increment: 1 }
        }
      });

      expect(updated.version).toBe(2);
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated Description');
      expect(updated.status).toBe('client_review');
    });

    it('should preserve version after multiple reads', async () => {
      if (!dbAvailable) return;

      // Read multiple times
      const read1 = await prisma.journey.findUnique({
        where: { id: testJourney.id }
      });
      const read2 = await prisma.journey.findUnique({
        where: { id: testJourney.id }
      });
      const read3 = await prisma.journey.findUnique({
        where: { id: testJourney.id }
      });

      expect(read1.version).toBe(1);
      expect(read2.version).toBe(1);
      expect(read3.version).toBe(1);
    });
  });

  describe('Conflict Recovery', () => {
    it('should allow retry after fetching latest version', async () => {
      if (!dbAvailable) return;

      // User A makes an update
      await prisma.journey.update({
        where: { id: testJourney.id },
        data: {
          name: 'User A Update',
          version: { increment: 1 }
        }
      });

      // User B fetches latest (simulating refresh)
      const latestVersion = await prisma.journey.findUnique({
        where: { id: testJourney.id }
      });

      expect(latestVersion.version).toBe(2);

      // User B can now update with correct version
      const userBUpdate = await prisma.journey.update({
        where: { id: testJourney.id },
        data: {
          name: 'User B Update (After Refresh)',
          description: 'User B Description',
          version: { increment: 1 }
        }
      });

      expect(userBUpdate.version).toBe(3);
      expect(userBUpdate.name).toBe('User B Update (After Refresh)');
    });
  });

  describe('JourneyVersion History', () => {
    it('should create version snapshots independently of optimistic lock', async () => {
      if (!dbAvailable) return;

      // Create a version snapshot
      await prisma.journeyVersion.create({
        data: {
          journeyId: testJourney.id,
          version: testJourney.version,
          snapshot: {
            name: testJourney.name,
            description: testJourney.description
          },
          changeLog: 'Initial version'
        }
      });

      // Update journey (increments version)
      const updated = await prisma.journey.update({
        where: { id: testJourney.id },
        data: {
          name: 'Updated Name',
          version: { increment: 1 }
        }
      });

      expect(updated.version).toBe(2);

      // Verify version history is preserved
      const versionHistory = await prisma.journeyVersion.findMany({
        where: { journeyId: testJourney.id },
        orderBy: { version: 'asc' }
      });

      expect(versionHistory).toHaveLength(1);
      expect(versionHistory[0].version).toBe(1);
      expect(versionHistory[0].snapshot.name).toBe('Test Journey');
    });
  });
});

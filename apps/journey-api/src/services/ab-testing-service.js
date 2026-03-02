/**
 * A/B Testing Service
 * P1 Q3 2026 - Comprehensive A/B Testing Framework
 * 
 * Features:
 * - Traffic splitting with weighted allocation
 * - Statistical significance calculation (Z-test for proportions)
 * - Confidence interval calculation
 * - Automatic winner selection
 * - Sample size estimation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Statistical constants
const Z_SCORE_95 = 1.96; // 95% confidence level
const Z_SCORE_99 = 2.576; // 99% confidence level
const Z_SCORE_90 = 1.645; // 90% confidence level

/**
 * Calculate Z-score for given confidence level
 */
function getZScore(confidenceLevel) {
  if (confidenceLevel >= 0.99) return Z_SCORE_99;
  if (confidenceLevel >= 0.95) return Z_SCORE_95;
  return Z_SCORE_90;
}

/**
 * Calculate standard error for proportion
 */
function calculateStandardError(p, n) {
  if (n === 0) return 0;
  return Math.sqrt((p * (1 - p)) / n);
}

/**
 * Calculate pooled standard error for two proportions
 */
function calculatePooledStandardError(p1, n1, p2, n2) {
  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  return Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
}

/**
 * Calculate Z-statistic for two-proportion Z-test
 */
function calculateZStatistic(p1, n1, p2, n2) {
  if (n1 === 0 || n2 === 0) return 0;
  const se = calculatePooledStandardError(p1, n1, p2, n2);
  if (se === 0) return 0;
  return (p1 - p2) / se;
}

/**
 * Calculate p-value from Z-statistic (two-tailed)
 */
function calculatePValue(z) {
  // Approximation of standard normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 2 * (0.5 - 0.5 * sign * y);
}

/**
 * Calculate confidence interval for proportion
 */
function calculateConfidenceInterval(p, n, confidenceLevel = 0.95) {
  if (n === 0) return { lower: 0, upper: 0 };
  const z = getZScore(confidenceLevel);
  const se = calculateStandardError(p, n);
  const margin = z * se;
  return {
    lower: Math.max(0, p - margin),
    upper: Math.min(1, p + margin)
  };
}

/**
 * Calculate required sample size for A/B test
 * Using formula: n = (Z^2 * p * (1-p)) / (margin^2)
 */
function calculateRequiredSampleSize(
  baselineRate = 0.1,
  minimumDetectableEffect = 0.2,
  confidenceLevel = 0.95,
  power = 0.8
) {
  const zAlpha = getZScore(confidenceLevel);
  const zBeta = 0.84; // Approximate for 80% power
  
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffect);
  const pAvg = (p1 + p2) / 2;
  
  const n = (
    (Math.pow(zAlpha + zBeta, 2) * 2 * pAvg * (1 - pAvg)) /
    Math.pow(p2 - p1, 2)
  );
  
  return Math.ceil(n);
}

/**
 * Assign participant to variant using weighted random allocation
 */
function assignVariant(variants, contactId) {
  // Use contactId for consistent hashing if provided
  let random;
  if (contactId) {
    // Simple hash function for deterministic assignment
    let hash = 0;
    for (let i = 0; i < contactId.length; i++) {
      const char = contactId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    random = (Math.abs(hash) % 10000) / 10000;
  } else {
    random = Math.random();
  }

  let cumulativeWeight = 0;
  for (const variant of variants) {
    cumulativeWeight += variant.trafficPercentage / 100;
    if (random <= cumulativeWeight) {
      return variant;
    }
  }

  // Fallback to last variant
  return variants[variants.length - 1];
}

/**
 * Calculate statistical significance between two variants
 */
function calculateVariantSignificance(control, treatment) {
  const p1 = control.conversions / control.participants;
  const p2 = treatment.conversions / treatment.participants;
  const n1 = control.participants;
  const n2 = treatment.participants;

  const z = calculateZStatistic(p1, n1, p2, n2);
  const pValue = calculatePValue(z);
  const confidenceLevel = 1 - pValue;

  // Calculate improvement percentage
  const improvement = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  // Calculate confidence intervals
  const ci1 = calculateConfidenceInterval(p1, n1);
  const ci2 = calculateConfidenceInterval(p2, n2);

  return {
    controlRate: p1,
    treatmentRate: p2,
    absoluteDifference: p2 - p1,
    relativeImprovement: improvement,
    zScore: z,
    pValue,
    confidenceLevel,
    isSignificant: confidenceLevel >= 0.95,
    controlCI: ci1,
    treatmentCI: ci2
  };
}

/**
 * A/B Testing Service
 */
export class ABTestingService {
  /**
   * Create a new A/B test
   */
  async createTest(data) {
    const {
      clientId,
      journeyId,
      name,
      description,
      hypothesis,
      testType = 'journey',
      targetMetric = 'conversion',
      minConfidenceLevel = 0.95,
      minSampleSize = 100,
      autoWinnerSelection = false,
      scheduledStart,
      variants,
      createdBy
    } = data;

    // Validate traffic allocation sums to 100%
    const totalTraffic = variants.reduce((sum, v) => sum + (v.trafficPercentage || 0), 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error(`Traffic allocation must sum to 100%, got ${totalTraffic}%`);
    }

    // Ensure exactly one control variant
    const controlVariants = variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Exactly one variant must be marked as control');
    }

    return await prisma.$transaction(async (tx) => {
      // Create the test
      const test = await tx.journeyABTest.create({
        data: {
          clientId,
          journeyId,
          name,
          description,
          hypothesis,
          testType,
          targetMetric,
          minConfidenceLevel,
          minSampleSize,
          autoWinnerSelection,
          scheduledStart,
          status: scheduledStart ? 'draft' : 'draft',
          createdBy
        }
      });

      // Create variants
      const variantRecords = await Promise.all(
        variants.map((variant, index) =>
          tx.journeyABTestVariant.create({
            data: {
              testId: test.id,
              clientId,
              journeyId,
              name: variant.name,
              description: variant.description,
              trafficPercentage: variant.trafficPercentage,
              journeySnapshot: variant.journeySnapshot,
              touchpointChanges: variant.touchpointChanges,
              isControl: variant.isControl,
              status: 'active'
            }
          })
        )
      );

      return {
        ...test,
        variants: variantRecords
      };
    });
  }

  /**
   * Start an A/B test
   */
  async startTest(testId) {
    const test = await prisma.journeyABTest.findUnique({
      where: { id: testId },
      include: { variants: true }
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'draft' && test.status !== 'paused') {
      throw new Error(`Cannot start test with status: ${test.status}`);
    }

    const now = new Date();

    return await prisma.journeyABTest.update({
      where: { id: testId },
      data: {
        status: 'running',
        startDate: now,
        updatedAt: now
      },
      include: { variants: true }
    });
  }

  /**
   * Pause a running A/B test
   */
  async pauseTest(testId) {
    const test = await prisma.journeyABTest.findUnique({
      where: { id: testId }
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'running') {
      throw new Error(`Cannot pause test with status: ${test.status}`);
    }

    return await prisma.journeyABTest.update({
      where: { id: testId },
      data: {
        status: 'paused',
        updatedAt: new Date()
      },
      include: { variants: true }
    });
  }

  /**
   * Stop an A/B test and optionally select a winner
   */
  async stopTest(testId, winnerVariantId = null) {
    const test = await prisma.journeyABTest.findUnique({
      where: { id: testId },
      include: { variants: true }
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'running' && test.status !== 'paused') {
      throw new Error(`Cannot stop test with status: ${test.status}`);
    }

    const now = new Date();

    return await prisma.$transaction(async (tx) => {
      // Update test status
      const updatedTest = await tx.journeyABTest.update({
        where: { id: testId },
        data: {
          status: 'completed',
          endDate: now,
          winnerVariantId,
          winnerSelectedAt: winnerVariantId ? now : null,
          updatedAt: now
        },
        include: { variants: true }
      });

      // If winner selected, update variant statuses
      if (winnerVariantId) {
        await tx.journeyABTestVariant.updateMany({
          where: { testId },
          data: { status: 'loser' }
        });

        await tx.journeyABTestVariant.update({
          where: { id: winnerVariantId },
          data: { status: 'winner' }
        });
      }

      return updatedTest;
    });
  }

  /**
   * Assign a participant to a variant
   */
  async assignParticipant(testId, contactId, sessionId = null, metadata = {}) {
    const test = await prisma.journeyABTest.findUnique({
      where: { id: testId },
      include: { variants: true }
    });

    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if participant already assigned
    const existingParticipant = await prisma.aBTestParticipant.findUnique({
      where: {
        testId_contactId: {
          testId,
          contactId
        }
      }
    });

    if (existingParticipant) {
      return existingParticipant;
    }

    // Assign to variant
    const activeVariants = test.variants.filter(v => v.status === 'active');
    const assignedVariant = assignVariant(activeVariants, contactId);

    if (!assignedVariant) {
      return null;
    }

    // Create participant record
    const participant = await prisma.aBTestParticipant.create({
      data: {
        testId,
        variantId: assignedVariant.id,
        clientId: test.clientId,
        contactId,
        sessionId,
        journeyId: test.journeyId,
        deviceType: metadata.deviceType,
        utmSource: metadata.utmSource,
        utmMedium: metadata.utmMedium,
        utmCampaign: metadata.utmCampaign,
        metadata
      }
    });

    // Update variant participant count
    await prisma.journeyABTestVariant.update({
      where: { id: assignedVariant.id },
      data: {
        participantsCount: { increment: 1 }
      }
    });

    return participant;
  }

  /**
   * Record a conversion for a participant
   */
  async recordConversion(testId, contactId, eventData = {}) {
    const participant = await prisma.aBTestParticipant.findUnique({
      where: {
        testId_contactId: {
          testId,
          contactId
        }
      }
    });

    if (!participant || participant.convertedAt) {
      return null;
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Update participant
      await tx.aBTestParticipant.update({
        where: { id: participant.id },
        data: {
          convertedAt: now,
          conversionValue: eventData.value || 0,
          conversionEvent: eventData.event || 'conversion',
          timeInJourneyMinutes: eventData.timeInJourneyMinutes || null
        }
      });

      // Update variant conversion count
      await tx.journeyABTestVariant.update({
        where: { id: participant.variantId },
        data: {
          conversionsCount: { increment: 1 }
        }
      });

      // Record event
      await tx.aBTestEvent.create({
        data: {
          testId,
          variantId: participant.variantId,
          participantId: participant.id,
          clientId: participant.clientId,
          eventType: 'conversion',
          eventData,
          timestamp: now
        }
      });
    });

    return participant;
  }

  /**
   * Record an event for a participant
   */
  async recordEvent(testId, contactId, eventType, eventData = {}) {
    const participant = await prisma.aBTestParticipant.findUnique({
      where: {
        testId_contactId: {
          testId,
          contactId
        }
      }
    });

    if (!participant) {
      return null;
    }

    return await prisma.aBTestEvent.create({
      data: {
        testId,
        variantId: participant.variantId,
        participantId: participant.id,
        clientId: participant.clientId,
        eventType,
        eventData,
        touchpointId: eventData.touchpointId
      }
    });
  }

  /**
   * Calculate test results and statistics
   */
  async calculateResults(testId) {
    const test = await prisma.journeyABTest.findUnique({
      where: { id: testId },
      include: {
        variants: {
          orderBy: { isControl: 'desc' }
        }
      }
    });

    if (!test) {
      throw new Error('Test not found');
    }

    const control = test.variants.find(v => v.isControl);
    const treatments = test.variants.filter(v => !v.isControl);

    // Calculate statistics for each variant vs control
    const variantResults = treatments.map(treatment => {
      const stats = calculateVariantSignificance(control, treatment);
      return {
        variantId: treatment.id,
        variantName: treatment.name,
        ...stats
      };
    });

    // Find best performing variant
    const bestVariant = variantResults.reduce((best, current) => {
      return current.treatmentRate > best.treatmentRate ? current : best;
    }, variantResults[0]);

    // Check if we have enough sample size
    const totalParticipants = test.variants.reduce((sum, v) => sum + v.participantsCount, 0);
    const hasEnoughSample = control.participantsCount >= test.minSampleSize &&
      treatments.every(t => t.participantsCount >= test.minSampleSize);

    // Check if any variant is statistically significant
    const hasSignificantResult = variantResults.some(r => r.isSignificant && r.relativeImprovement > 0);

    // Calculate estimated time to reach significance
    const requiredSample = test.minSampleSize;
    const dailyParticipants = await this.getAverageDailyParticipants(testId);
    const daysToSignificance = dailyParticipants > 0
      ? Math.ceil((requiredSample - control.participantsCount) / dailyParticipants)
      : null;

    return {
      test: {
        id: test.id,
        name: test.name,
        status: test.status,
        targetMetric: test.targetMetric,
        startDate: test.startDate,
        endDate: test.endDate
      },
      summary: {
        totalParticipants,
        hasEnoughSample,
        hasSignificantResult,
        daysToSignificance,
        dailyParticipants
      },
      control: {
        id: control.id,
        name: control.name,
        participants: control.participantsCount,
        conversions: control.conversionsCount,
        rate: control.participantsCount > 0
          ? control.conversionsCount / control.participantsCount
          : 0
      },
      variants: test.variants.map(v => ({
        id: v.id,
        name: v.name,
        isControl: v.isControl,
        trafficPercentage: v.trafficPercentage,
        participants: v.participantsCount,
        conversions: v.conversionsCount,
        rate: v.participantsCount > 0
          ? v.conversionsCount / v.participantsCount
          : 0,
        status: v.status
      })),
      statistics: variantResults,
      recommendation: this.generateRecommendation(test, variantResults, hasEnoughSample, hasSignificantResult)
    };
  }

  /**
   * Get average daily participants for a test
   */
  async getAverageDailyParticipants(testId) {
    const stats = await prisma.aBTestDailyStats.findMany({
      where: { testId },
      orderBy: { date: 'desc' },
      take: 7
    });

    if (stats.length === 0) return 0;

    const avg = stats.reduce((sum, s) => sum + s.participantsNew, 0) / stats.length;
    return Math.round(avg);
  }

  /**
   * Generate recommendation based on test results
   */
  generateRecommendation(test, statistics, hasEnoughSample, hasSignificantResult) {
    if (!hasEnoughSample) {
      return {
        action: 'continue',
        message: 'Continue the test to reach the minimum required sample size.',
        confidence: 'low'
      };
    }

    if (!hasSignificantResult) {
      return {
        action: 'continue_or_stop',
        message: 'No statistically significant difference detected yet. You may continue testing or stop if the improvement is not meaningful.',
        confidence: 'medium'
      };
    }

    const winner = statistics.find(s => s.isSignificant && s.relativeImprovement > 0);
    if (winner) {
      return {
        action: 'declare_winner',
        message: `${winner.variantName} shows a ${winner.relativeImprovement.toFixed(1)}% improvement with ${(winner.confidenceLevel * 100).toFixed(1)}% confidence.`,
        confidence: 'high',
        winnerVariantId: winner.variantId,
        winnerName: winner.variantName
      };
    }

    return {
      action: 'keep_control',
      message: 'The control variant performs better than or equal to all test variants.',
      confidence: 'high'
    };
  }

  /**
   * Automatically check and select winner if conditions are met
   */
  async autoCheckAndSelectWinner(testId) {
    const test = await prisma.journeyABTest.findUnique({
      where: { id: testId },
      include: { variants: true }
    });

    if (!test || !test.autoWinnerSelection || test.status !== 'running') {
      return null;
    }

    const results = await this.calculateResults(testId);

    // Check if we have enough sample and a significant winner
    if (results.summary.hasEnoughSample && results.summary.hasSignificantResult) {
      const winner = results.statistics.find(s => s.isSignificant && s.relativeImprovement > 0);
      if (winner) {
        return await this.stopTest(testId, winner.variantId);
      }
    }

    return null;
  }

  /**
   * Get all tests for a client
   */
  async getTests(clientId, options = {}) {
    const { status, journeyId, limit = 50, offset = 0 } = options;

    const where = { clientId };
    if (status) where.status = status;
    if (journeyId) where.journeyId = journeyId;

    const [tests, total] = await Promise.all([
      prisma.journeyABTest.findMany({
        where,
        include: {
          variants: {
            select: {
              id: true,
              name: true,
              isControl: true,
              trafficPercentage: true,
              participantsCount: true,
              conversionsCount: true,
              status: true
            }
          },
          journey: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.journeyABTest.count({ where })
    ]);

    return {
      tests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      }
    };
  }

  /**
   * Get a single test with full details
   */
  async getTest(testId) {
    return await prisma.journeyABTest.findUnique({
      where: { id: testId },
      include: {
        variants: true,
        journey: {
          select: {
            id: true,
            name: true,
            status: true,
            touchpoints: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        _count: {
          select: {
            participants: true,
            events: true
          }
        }
      }
    });
  }

  /**
   * Update daily statistics for a test
   */
  async updateDailyStats(testId, date = new Date()) {
    const test = await prisma.journeyABTest.findUnique({
      where: { id: testId },
      include: { variants: true }
    });

    if (!test) return;

    const dateStr = date.toISOString().split('T')[0];

    for (const variant of test.variants) {
      // Count participants for today
      const participantsNew = await prisma.aBTestParticipant.count({
        where: {
          variantId: variant.id,
          assignedAt: {
            gte: new Date(dateStr),
            lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      // Count conversions for today
      const conversionsNew = await prisma.aBTestParticipant.count({
        where: {
          variantId: variant.id,
          convertedAt: {
            gte: new Date(dateStr),
            lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      // Count email events for today
      const emailOpens = await prisma.aBTestEvent.count({
        where: {
          variantId: variant.id,
          eventType: 'email_opened',
          timestamp: {
            gte: new Date(dateStr),
            lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      const emailClicks = await prisma.aBTestEvent.count({
        where: {
          variantId: variant.id,
          eventType: 'email_clicked',
          timestamp: {
            gte: new Date(dateStr),
            lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      // Get total counts
      const participantsTotal = variant.participantsCount;
      const conversionsTotal = variant.conversionsCount;

      // Calculate rates
      const conversionRate = participantsTotal > 0 ? conversionsTotal / participantsTotal : 0;
      const openRate = participantsTotal > 0 ? emailOpens / participantsTotal : 0;
      const clickRate = participantsTotal > 0 ? emailClicks / participantsTotal : 0;

      // Upsert daily stats
      await prisma.aBTestDailyStats.upsert({
        where: {
          testId_variantId_date: {
            testId,
            variantId: variant.id,
            date: new Date(dateStr)
          }
        },
        update: {
          participantsNew,
          participantsTotal,
          conversionsNew,
          conversionsTotal,
          conversionRate,
          emailOpens,
          emailClicks,
          openRate,
          clickRate
        },
        create: {
          testId,
          variantId: variant.id,
          clientId: test.clientId,
          date: new Date(dateStr),
          participantsNew,
          participantsTotal,
          conversionsNew,
          conversionsTotal,
          conversionRate,
          emailOpens,
          emailClicks,
          openRate,
          clickRate
        }
      });
    }
  }

  /**
   * Delete a test and all associated data
   */
  async deleteTest(testId) {
    return await prisma.journeyABTest.delete({
      where: { id: testId }
    });
  }

  /**
   * Get sample size calculator data
   */
  getSampleSizeCalculator(baselineRate, minimumDetectableEffect, confidenceLevel = 0.95, power = 0.8) {
    const required = calculateRequiredSampleSize(baselineRate, minimumDetectableEffect, confidenceLevel, power);
    
    // Generate sample size table for different MDEs
    const table = [];
    for (const mde of [0.1, 0.15, 0.2, 0.25, 0.3, 0.5]) {
      table.push({
        mde: `${(mde * 100).toFixed(0)}%`,
        sampleSize: calculateRequiredSampleSize(baselineRate, mde, confidenceLevel, power)
      });
    }

    return {
      baselineRate,
      minimumDetectableEffect,
      confidenceLevel,
      power,
      requiredSampleSize: required,
      perVariant: required,
      totalRequired: required * 2, // Assuming 2 variants
      table
    };
  }
}

// Export singleton instance
export const abTestingService = new ABTestingService();

// Export utility functions for testing
export {
  calculateZStatistic,
  calculatePValue,
  calculateConfidenceInterval,
  calculateRequiredSampleSize,
  assignVariant
};

export default abTestingService;

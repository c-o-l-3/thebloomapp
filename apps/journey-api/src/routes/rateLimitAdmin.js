/**
 * Rate Limit Admin Routes
 * Provides admin UI and API for managing rate limits
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { rateLimitService } from '../services/rate-limit-service.js';

const router = Router();
const prisma = new PrismaClient();

// Authentication middleware placeholder - should be replaced with actual auth
function requireAdmin(req, res, next) {
  // In production, check for admin role
  // For now, check for a secret admin token
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================
// TIER MANAGEMENT
// ============================================

// GET /admin/rate-limits/tiers - List all tiers
router.get('/tiers', requireAdmin, async (req, res) => {
  try {
    const tiers = await prisma.rateLimitTier.findMany({
      orderBy: { requestsPerMinute: 'asc' }
    });

    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// POST /admin/rate-limits/tiers - Create new tier
router.post('/tiers', requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(50),
      displayName: z.string().min(1).max(100),
      description: z.string().optional(),
      requestsPerMinute: z.number().int().min(1),
      requestsPerHour: z.number().int().min(1),
      requestsPerDay: z.number().int().min(1),
      burstCapacity: z.number().int().min(1),
      endpointLimits: z.object({}).passthrough().optional(),
      windowStrategy: z.enum(['fixed_window', 'sliding_window', 'token_bucket']),
      headersEnabled: z.boolean().optional(),
      retryAfterEnabled: z.boolean().optional()
    });

    const data = schema.parse(req.body);

    const tier = await prisma.rateLimitTier.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        requestsPerMinute: data.requestsPerMinute,
        requestsPerHour: data.requestsPerHour,
        requestsPerDay: data.requestsPerDay,
        burstCapacity: data.burstCapacity,
        endpointLimits: data.endpointLimits || {},
        windowStrategy: data.windowStrategy,
        headersEnabled: data.headersEnabled ?? true,
        retryAfterEnabled: data.retryAfterEnabled ?? true
      }
    });

    res.status(201).json({
      success: true,
      data: tier
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating tier:', error);
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// PUT /admin/rate-limits/tiers/:id - Update tier
router.put('/tiers/:id', requireAdmin, async (req, res) => {
  try {
    const tierId = parseInt(req.params.id);
    
    const schema = z.object({
      displayName: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      requestsPerMinute: z.number().int().min(1).optional(),
      requestsPerHour: z.number().int().min(1).optional(),
      requestsPerDay: z.number().int().min(1).optional(),
      burstCapacity: z.number().int().min(1).optional(),
      endpointLimits: z.object({}).passthrough().optional(),
      windowStrategy: z.enum(['fixed_window', 'sliding_window', 'token_bucket']).optional(),
      headersEnabled: z.boolean().optional(),
      retryAfterEnabled: z.boolean().optional(),
      isActive: z.boolean().optional()
    });

    const data = schema.parse(req.body);

    const tier = await prisma.rateLimitTier.update({
      where: { id: tierId },
      data
    });

    // Clear cache
    rateLimitService.tierCache.delete(tierId);

    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error updating tier:', error);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// ============================================
// API KEY MANAGEMENT
// ============================================

// GET /admin/rate-limits/api-keys - List API keys
router.get('/api-keys', requireAdmin, async (req, res) => {
  try {
    const { clientId, status, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [apiKeys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        include: {
          tier: true,
          client: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true, name: true } }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.apiKey.count({ where })
    ]);

    res.json({
      success: true,
      data: apiKeys,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /admin/rate-limits/api-keys - Create API key
router.post('/api-keys', requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100),
      clientId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      tierId: z.number().int().optional(),
      scopes: z.array(z.enum(['read', 'write', 'admin', 'webhook'])).optional(),
      allowedIps: z.array(z.string()).optional(),
      allowedRoutes: z.array(z.string()).optional(),
      expiresAt: z.string().datetime().optional()
    });

    const data = schema.parse(req.body);

    const { apiKey, key } = await rateLimitService.generateApiKey(
      data.name,
      data.clientId,
      data.userId,
      data.tierId,
      data.scopes || ['read'],
      data.expiresAt ? new Date(data.expiresAt) : null,
      req.user?.id // Admin user ID
    );

    res.status(201).json({
      success: true,
      data: {
        ...apiKey,
        key // Only shown once on creation
      },
      message: 'API key created. Save the key value - it will not be shown again.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// POST /admin/rate-limits/api-keys/:id/revoke - Revoke API key
router.post('/api-keys/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await rateLimitService.revokeApiKey(id, req.user?.id);

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ============================================
// EXEMPTIONS MANAGEMENT
// ============================================

// GET /admin/rate-limits/exemptions - List exemptions
router.get('/exemptions', requireAdmin, async (req, res) => {
  try {
    const exemptions = await prisma.rateLimitExemption.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: exemptions
    });
  } catch (error) {
    console.error('Error fetching exemptions:', error);
    res.status(500).json({ error: 'Failed to fetch exemptions' });
  }
});

// POST /admin/rate-limits/exemptions - Create exemption
router.post('/exemptions', requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      identifier: z.string().min(1),
      identifierType: z.enum(['ip', 'api_key', 'user_id', 'client_id']),
      reason: z.string().min(1),
      expiresAt: z.string().datetime().optional(),
      overrideTierId: z.number().int().optional()
    });

    const data = schema.parse(req.body);

    const exemption = await prisma.rateLimitExemption.create({
      data: {
        identifier: data.identifier,
        identifierType: data.identifierType,
        reason: data.reason,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        overrideTierId: data.overrideTierId,
        createdBy: req.user?.id
      }
    });

    res.status(201).json({
      success: true,
      data: exemption
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating exemption:', error);
    res.status(500).json({ error: 'Failed to create exemption' });
  }
});

// DELETE /admin/rate-limits/exemptions/:id - Remove exemption
router.delete('/exemptions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.rateLimitExemption.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Exemption removed successfully'
    });
  } catch (error) {
    console.error('Error removing exemption:', error);
    res.status(500).json({ error: 'Failed to remove exemption' });
  }
});

// ============================================
// VIOLATIONS & STATISTICS
// ============================================

// GET /admin/rate-limits/violations - List violations
router.get('/violations', requireAdmin, async (req, res) => {
  try {
    const { identifier, tierId, limit = 50, hours = 24 } = req.query;
    
    const where = {
      createdAt: {
        gte: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000)
      }
    };
    
    if (identifier) where.identifier = identifier;
    if (tierId) where.tierId = parseInt(tierId);

    const violations = await prisma.rateLimitViolation.findMany({
      where,
      include: {
        tier: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Get summary statistics
    const summary = await prisma.rateLimitViolation.groupBy({
      by: ['limitType'],
      where,
      _count: { id: true }
    });

    res.json({
      success: true,
      data: violations,
      summary: summary.reduce((acc, item) => {
        acc[item.limitType] = item._count.id;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// GET /admin/rate-limits/stats - Get overall statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    const [
      totalViolations,
      violationsByTier,
      topOffenders,
      totalApiKeys,
      activeApiKeys,
      serviceHealth
    ] = await Promise.all([
      prisma.rateLimitViolation.count({
        where: { createdAt: { gte: since } }
      }),
      prisma.rateLimitViolation.groupBy({
        by: ['tierId'],
        where: { createdAt: { gte: since } },
        _count: { id: true }
      }),
      prisma.rateLimitViolation.groupBy({
        by: ['identifier', 'identifierType'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.apiKey.count(),
      prisma.apiKey.count({ where: { status: 'active' } }),
      Promise.resolve(rateLimitService.getHealth())
    ]);

    // Get tier names
    const tierIds = violationsByTier.map(v => v.tierId).filter(Boolean);
    const tiers = tierIds.length > 0 
      ? await prisma.rateLimitTier.findMany({
          where: { id: { in: tierIds } },
          select: { id: true, name: true }
        })
      : [];
    
    const tierMap = new Map(tiers.map(t => [t.id, t.name]));

    res.json({
      success: true,
      data: {
        violations: {
          total: totalViolations,
          byTier: violationsByTier.map(v => ({
            tier: tierMap.get(v.tierId) || 'unknown',
            count: v._count.id
          })),
          topOffenders: topOffenders.map(o => ({
            identifier: o.identifier,
            type: o.identifierType,
            violations: o._count.id
          }))
        },
        apiKeys: {
          total: totalApiKeys,
          active: activeApiKeys
        },
        health: serviceHealth,
        period: `${hours} hours`
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================
// CLIENT TIER ASSIGNMENT
// ============================================

// GET /admin/rate-limits/clients - List clients with tiers
router.get('/clients', requireAdmin, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        rateLimitTierId: true,
        rateLimitTier: true,
        _count: {
          select: { apiKeys: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// PUT /admin/rate-limits/clients/:id/tier - Assign tier to client
router.put('/clients/:id/tier', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tierId } = req.body;

    if (!tierId || typeof tierId !== 'number') {
      return res.status(400).json({ error: 'Invalid tierId' });
    }

    const client = await prisma.client.update({
      where: { id },
      data: { rateLimitTierId: tierId },
      include: { rateLimitTier: true }
    });

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error updating client tier:', error);
    res.status(500).json({ error: 'Failed to update client tier' });
  }
});

// ============================================
// ADMIN UI HTML PAGE
// ============================================

// GET /admin/rate-limits/ui - Admin UI
router.get('/ui', requireAdmin, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rate Limit Admin | Bloom</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        header h1 { font-size: 2rem; margin-bottom: 10px; }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #ddd;
        }
        .tab {
            padding: 12px 24px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            color: #666;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
        }
        .tab.active {
            color: #667eea;
            border-bottom-color: #667eea;
        }
        .panel { display: none; }
        .panel.active { display: block; }
        .card {
            background: white;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card h2 {
            font-size: 1.25rem;
            margin-bottom: 16px;
            color: #444;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        th {
            font-weight: 600;
            color: #666;
            font-size: 0.875rem;
            text-transform: uppercase;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .badge-free { background: #e3f2fd; color: #1976d2; }
        .badge-basic { background: #f3e5f5; color: #7b1fa2; }
        .badge-premium { background: #fff3e0; color: #ef6c00; }
        .badge-enterprise { background: #e8f5e9; color: #2e7d32; }
        .badge-active { background: #e8f5e9; color: #2e7d32; }
        .badge-revoked { background: #ffebee; color: #c62828; }
        button {
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover { background: #5568d3; }
        .btn-danger {
            background: #ef5350;
            color: white;
        }
        .btn-danger:hover { background: #e53935; }
        .btn-secondary {
            background: #f5f5f5;
            color: #333;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            margin-top: 8px;
        }
        .form-group {
            margin-bottom: 16px;
        }
        label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            color: #555;
        }
        input, select, textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal.active { display: flex; }
        .modal-content {
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        pre {
            background: #f5f5f5;
            padding: 16px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.875rem;
        }
        .health-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.875rem;
        }
        .health-good { background: #e8f5e9; color: #2e7d32; }
        .health-warning { background: #fff3e0; color: #ef6c00; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔐 Rate Limit Admin</h1>
            <p>Manage API rate limits, tiers, and API keys</p>
        </header>

        <div class="grid" id="stats-grid">
            <!-- Stats loaded dynamically -->
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showPanel('tiers')">Tiers</button>
            <button class="tab" onclick="showPanel('api-keys')">API Keys</button>
            <button class="tab" onclick="showPanel('exemptions')">Exemptions</button>
            <button class="tab" onclick="showPanel('violations')">Violations</button>
            <button class="tab" onclick="showPanel('clients')">Clients</button>
        </div>

        <div id="tiers" class="panel active">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2>Rate Limit Tiers</h2>
                    <button class="btn-primary" onclick="showCreateTierModal()">+ Create Tier</button>
                </div>
                <table id="tiers-table">
                    <thead>
                        <tr>
                            <th>Tier</th>
                            <th>Requests/Min</th>
                            <th>Requests/Hour</th>
                            <th>Requests/Day</th>
                            <th>Strategy</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <div id="api-keys" class="panel">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2>API Keys</h2>
                    <button class="btn-primary" onclick="showCreateKeyModal()">+ Create API Key</button>
                </div>
                <table id="api-keys-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Prefix</th>
                            <th>Tier</th>
                            <th>Scopes</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <div id="exemptions" class="panel">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2>Rate Limit Exemptions</h2>
                    <button class="btn-primary" onclick="showCreateExemptionModal()">+ Add Exemption</button>
                </div>
                <table id="exemptions-table">
                    <thead>
                        <tr>
                            <th>Identifier</th>
                            <th>Type</th>
                            <th>Reason</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <div id="violations" class="panel">
            <div class="card">
                <h2>Recent Violations (24h)</h2>
                <table id="violations-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Identifier</th>
                            <th>Route</th>
                            <th>Limit Type</th>
                            <th>Retry After</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <div id="clients" class="panel">
            <div class="card">
                <h2>Client Tier Assignments</h2>
                <table id="clients-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Slug</th>
                            <th>Current Tier</th>
                            <th>API Keys</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Create Tier Modal -->
    <div id="create-tier-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create Rate Limit Tier</h2>
                <button class="modal-close" onclick="closeModals()">&times;</button>
            </div>
            <form id="create-tier-form">
                <div class="form-group">
                    <label>Name (unique identifier)</label>
                    <input type="text" name="name" required pattern="[a-z_]+" placeholder="e.g., premium_plus">
                </div>
                <div class="form-group">
                    <label>Display Name</label>
                    <input type="text" name="displayName" required placeholder="e.g., Premium Plus">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Requests per Minute</label>
                    <input type="number" name="requestsPerMinute" required min="1" value="100">
                </div>
                <div class="form-group">
                    <label>Requests per Hour</label>
                    <input type="number" name="requestsPerHour" required min="1" value="5000">
                </div>
                <div class="form-group">
                    <label>Requests per Day</label>
                    <input type="number" name="requestsPerDay" required min="1" value="50000">
                </div>
                <div class="form-group">
                    <label>Burst Capacity (token bucket)</label>
                    <input type="number" name="burstCapacity" required min="1" value="15">
                </div>
                <div class="form-group">
                    <label>Window Strategy</label>
                    <select name="windowStrategy" required>
                        <option value="sliding_window">Sliding Window</option>
                        <option value="fixed_window">Fixed Window</option>
                        <option value="token_bucket">Token Bucket</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary" style="width: 100%;">Create Tier</button>
            </form>
        </div>
    </div>

    <!-- Create API Key Modal -->
    <div id="create-key-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create API Key</h2>
                <button class="modal-close" onclick="closeModals()">&times;</button>
            </div>
            <form id="create-key-form">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="name" required placeholder="Production API Key">
                </div>
                <div class="form-group">
                    <label>Tier</label>
                    <select name="tierId" id="key-tier-select"></select>
                </div>
                <div class="form-group">
                    <label>Scopes (comma-separated)</label>
                    <input type="text" name="scopes" value="read,write" placeholder="read,write,admin">
                </div>
                <div class="form-group">
                    <label>Expires At (optional)</label>
                    <input type="datetime-local" name="expiresAt">
                </div>
                <button type="submit" class="btn-primary" style="width: 100%;">Generate API Key</button>
            </form>
        </div>
    </div>

    <!-- Create Exemption Modal -->
    <div id="create-exemption-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Rate Limit Exemption</h2>
                <button class="modal-close" onclick="closeModals()">&times;</button>
            </div>
            <form id="create-exemption-form">
                <div class="form-group">
                    <label>Identifier</label>
                    <input type="text" name="identifier" required placeholder="IP address, API key, or user ID">
                </div>
                <div class="form-group">
                    <label>Identifier Type</label>
                    <select name="identifierType" required>
                        <option value="ip">IP Address</option>
                        <option value="api_key">API Key</option>
                        <option value="user_id">User ID</option>
                        <option value="client_id">Client ID</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Reason</label>
                    <textarea name="reason" required rows="3" placeholder="Why is this exemption needed?"></textarea>
                </div>
                <div class="form-group">
                    <label>Expires At (optional)</label>
                    <input type="datetime-local" name="expiresAt">
                </div>
                <button type="submit" class="btn-primary" style="width: 100%;">Add Exemption</button>
            </form>
        </div>
    </div>

    <!-- API Key Display Modal -->
    <div id="key-display-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>🔑 API Key Created</h2>
                <button class="modal-close" onclick="closeModals()">&times;</button>
            </div>
            <p style="margin-bottom: 16px; color: #c62828; font-weight: 500;">
                Copy this key now! It will not be shown again.
            </p>
            <pre id="key-display-value"></pre>
            <button class="btn-primary" style="width: 100%; margin-top: 16px;" onclick="copyKey()">Copy to Clipboard</button>
        </div>
    </div>

    <script>
        // Global state
        let currentKey = '';
        const adminToken = localStorage.getItem('adminToken') || prompt('Enter admin token:');
        if (adminToken) localStorage.setItem('adminToken', adminToken);

        // Tab switching
        function showPanel(panelId) {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById(panelId).classList.add('active');
            event.target.classList.add('active');
            loadPanelData(panelId);
        }

        // Modal management
        function showCreateTierModal() {
            document.getElementById('create-tier-modal').classList.add('active');
        }

        function showCreateKeyModal() {
            loadTiersForSelect();
            document.getElementById('create-key-modal').classList.add('active');
        }

        function showCreateExemptionModal() {
            document.getElementById('create-exemption-modal').classList.add('active');
        }

        function closeModals() {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        }

        function copyKey() {
            navigator.clipboard.writeText(currentKey);
            alert('Key copied to clipboard!');
        }

        // Data loading
        async function loadPanelData(panelId) {
            try {
                switch(panelId) {
                    case 'tiers':
                        await loadTiers();
                        break;
                    case 'api-keys':
                        await loadApiKeys();
                        break;
                    case 'exemptions':
                        await loadExemptions();
                        break;
                    case 'violations':
                        await loadViolations();
                        break;
                    case 'clients':
                        await loadClients();
                        break;
                }
            } catch (error) {
                console.error('Error loading panel:', error);
            }
        }

        async function loadStats() {
            const res = await fetch('/admin/rate-limits/stats', {
                headers: { 'X-Admin-Token': adminToken }
            });
            const { data } = await res.json();
            
            document.getElementById('stats-grid').innerHTML = \`
                <div class="stat-card">
                    <div class="stat-value">\${data.violations.total}</div>
                    <div class="stat-label">Violations (24h)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">\${data.apiKeys.active}</div>
                    <div class="stat-label">Active API Keys</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">\${data.apiKeys.total}</div>
                    <div class="stat-label">Total API Keys</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">
                        <span class="health-status \${data.health.redisConnected ? 'health-good' : 'health-warning'}">
                            \${data.health.redisConnected ? '✅ Redis' : '⚠️ Memory'}
                        </span>
                    </div>
                    <div class="stat-label">Storage Backend</div>
                </div>
            \`;
        }

        async function loadTiers() {
            const res = await fetch('/admin/rate-limits/tiers', {
                headers: { 'X-Admin-Token': adminToken }
            });
            const { data } = await res.json();
            
            const tbody = document.querySelector('#tiers-table tbody');
            tbody.innerHTML = data.map(tier => \`
                <tr>
                    <td>
                        <strong>\${tier.displayName}</strong>
                        <br><small class="badge badge-\${tier.name}">\${tier.name}</small>
                    </td>
                    <td>\${tier.requestsPerMinute}</td>
                    <td>\${tier.requestsPerHour.toLocaleString()}</td>
                    <td>\${tier.requestsPerDay.toLocaleString()}</td>
                    <td>\${tier.windowStrategy.replace('_', ' ')}</td>
                    <td><span class="badge badge-\${tier.isActive ? 'active' : 'revoked'}">\${tier.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-secondary" onclick="editTier(\${tier.id})">Edit</button>
                    </td>
                </tr>
            \`).join('');
        }

        async function loadTiersForSelect() {
            const res = await fetch('/admin/rate-limits/tiers', {
                headers: { 'X-Admin-Token': adminToken }
            });
            const { data } = await res.json();
            
            const select = document.getElementById('key-tier-select');
            select.innerHTML = data.filter(t => t.isActive).map(tier => 
                \`<option value="\${tier.id}">\${tier.displayName}</option>\`
            ).join('');
        }

        async function loadApiKeys() {
            const res = await fetch('/admin/rate-limits/api-keys', {
                headers: { 'X-Admin-Token': adminToken }
            });
            const { data } = await res.json();
            
            const tbody = document.querySelector('#api-keys-table tbody');
            tbody.innerHTML = data.map(key => \`
                <tr>
                    <td>\${key.name}</td>
                    <td><code>\${key.keyPrefix}...</code></td>
                    <td><span class="badge badge-\${key.tier?.name || 'basic'}">\${key.tier?.name || 'basic'}</span></td>
                    <td>\${(key.scopes || []).join(', ')}</td>
                    <td><span class="badge badge-\${key.status}">\${key.status}</span></td>
                    <td>\${new Date(key.createdAt).toLocaleDateString()}</td>
                    <td>
                        \${key.status === 'active' 
                            ? \`<button class="btn-danger" onclick="revokeKey('\${key.id}')">Revoke</button>\`
                            : '<em>Revoked</em>'
                        }
                    </td>
                </tr>
            \`).join('');
        }

        async function loadExemptions() {
            const res = await fetch('/admin/rate-limits/exemptions', {
                headers: { 'X-Admin-Token': adminToken }
            });
            const { data } = await res.json();
            
            const tbody = document.querySelector('#exemptions-table tbody');
            tbody.innerHTML = data.map(ex => \`
                <tr>
                    <td><code>\${ex.identifier}</code></td>
                    <td>\${ex.identifierType}</td>
                    <td>\${ex.reason}</td>
                    <td>\${ex.expiresAt ? new Date(ex.expiresAt).toLocaleDateString() : 'Never'}</td>
                    <td>
                        <button class="btn-danger" onclick="removeExemption(\${ex.id})">Remove</button>
                    </td>
                </tr>
            \`).join('');
        }

        async function loadViolations() {
            const res = await fetch('/admin/rate-limits/violations', {
                headers: { 'X-Admin-Token': adminToken }
            });
            const { data } = await res.json();
            
            const tbody = document.querySelector('#violations-table tbody');
            tbody.innerHTML = data.map(v => \`
                <tr>
                    <td>\${new Date(v.createdAt).toLocaleString()}</td>
                    <td><code>\${v.identifier}</code><br><small>\${v.identifierType}</small></td>
                    <td>\${v.method} \${v.route}</td>
                    <td>\${v.limitType}</td>
                    <td>\${v.retryAfter ? v.retryAfter + 's' : '-'}</td>
                </tr>
            \`).join('');
        }

        async function loadClients() {
            const res = await fetch('/admin/rate-limits/clients', {
                headers: { 'X-Admin-Token': adminToken }
            });
            const { data } = await res.json();
            
            const tbody = document.querySelector('#clients-table tbody');
            tbody.innerHTML = data.map(c => \`
                <tr>
                    <td>\${c.name}</td>
                    <td><code>\${c.slug}</code></td>
                    <td><span class="badge badge-\${c.rateLimitTier?.name || 'basic'}">\${c.rateLimitTier?.displayName || 'Basic'}</span></td>
                    <td>\${c._count.apiKeys}</td>
                    <td>
                        <button class="btn-secondary" onclick="changeClientTier('\${c.id}', '\${c.name}')">Change Tier</button>
                    </td>
                </tr>
            \`).join('');
        }

        // Actions
        async function revokeKey(keyId) {
            if (!confirm('Are you sure you want to revoke this API key?')) return;
            
            await fetch(\`/admin/rate-limits/api-keys/\${keyId}/revoke\`, {
                method: 'POST',
                headers: { 'X-Admin-Token': adminToken }
            });
            
            loadApiKeys();
        }

        async function removeExemption(id) {
            if (!confirm('Remove this exemption?')) return;
            
            await fetch(\`/admin/rate-limits/exemptions/\${id}\`, {
                method: 'DELETE',
                headers: { 'X-Admin-Token': adminToken }
            });
            
            loadExemptions();
        }

        async function changeClientTier(clientId, clientName) {
            const tierId = prompt(\`Enter new tier ID for "\${clientName}":\`);
            if (!tierId) return;
            
            await fetch(\`/admin/rate-limits/clients/\${clientId}/tier\`, {
                method: 'PUT',
                headers: { 
                    'X-Admin-Token': adminToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tierId: parseInt(tierId) })
            });
            
            loadClients();
        }

        // Form submissions
        document.getElementById('create-tier-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            data.requestsPerMinute = parseInt(data.requestsPerMinute);
            data.requestsPerHour = parseInt(data.requestsPerHour);
            data.requestsPerDay = parseInt(data.requestsPerDay);
            data.burstCapacity = parseInt(data.burstCapacity);
            
            await fetch('/admin/rate-limits/tiers', {
                method: 'POST',
                headers: { 
                    'X-Admin-Token': adminToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            closeModals();
            e.target.reset();
            loadTiers();
        });

        document.getElementById('create-key-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            data.tierId = parseInt(data.tierId);
            data.scopes = data.scopes.split(',').map(s => s.trim());
            if (data.expiresAt) data.expiresAt = new Date(data.expiresAt).toISOString();
            
            const res = await fetch('/admin/rate-limits/api-keys', {
                method: 'POST',
                headers: { 
                    'X-Admin-Token': adminToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            closeModals();
            e.target.reset();
            
            if (result.data?.key) {
                currentKey = result.data.key;
                document.getElementById('key-display-value').textContent = currentKey;
                document.getElementById('key-display-modal').classList.add('active');
            }
            
            loadApiKeys();
        });

        document.getElementById('create-exemption-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.expiresAt) data.expiresAt = new Date(data.expiresAt).toISOString();
            
            await fetch('/admin/rate-limits/exemptions', {
                method: 'POST',
                headers: { 
                    'X-Admin-Token': adminToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            closeModals();
            e.target.reset();
            loadExemptions();
        });

        // Initialize
        loadStats();
        loadTiers();
    </script>
</body>
</html>
  `);
});

export { router as rateLimitAdminRouter };
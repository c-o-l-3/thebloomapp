/**
 * Comment System Service
 * Manages comments for journey touchpoints with thread support
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

/**
 * Comment System Service
 * Handles comment CRUD operations, threading, and notifications
 */
export class CommentSystem {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.commentsDir = path.join(this.clientDir, 'comments');
    this.indexFile = path.join(this.commentsDir, 'index.json');
  }

  /**
   * Initialize the comments directory structure
   */
  async initialize() {
    try {
      await fs.mkdir(this.commentsDir, { recursive: true });
      
      // Create index file if it doesn't exist
      try {
        await fs.access(this.indexFile);
      } catch {
        await this._writeIndex({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          comments: [],
          threads: [],
          stats: {
            totalComments: 0,
            openComments: 0,
            resolvedComments: 0
          }
        });
        logger.info(`Initialized comment system for ${this.clientSlug}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize comment system', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if comment system is initialized
   */
  async isInitialized() {
    try {
      await fs.access(this.indexFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add a new comment
   * @param {Object} commentData - Comment data
   * @param {string} commentData.touchpointId - Associated touchpoint ID
   * @param {string} commentData.user - User name/email
   * @param {string} commentData.userId - User ID
   * @param {string} commentData.text - Comment text
   * @param {Object} commentData.position - Optional position data (for inline comments)
   * @param {string} commentData.journeyId - Associated journey ID
   * @param {string} commentData.parentId - Parent comment ID (for replies)
   * @returns {Object} Created comment
   */
  async addComment(commentData) {
    await this._ensureInitialized();

    const comment = {
      id: `comment-${uuidv4().split('-')[0]}`,
      touchpointId: commentData.touchpointId,
      journeyId: commentData.journeyId,
      user: commentData.user,
      userId: commentData.userId,
      text: commentData.text,
      position: commentData.position || null,
      parentId: commentData.parentId || null,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      replies: [],
      metadata: {
        userAgent: commentData.userAgent || null,
        ip: commentData.ip || null
      }
    };

    const index = await this._readIndex();
    
    // If this is a reply, add to parent's replies array
    if (comment.parentId) {
      const parent = this._findComment(index.comments, comment.parentId);
      if (!parent) {
        throw new Error(`Parent comment not found: ${comment.parentId}`);
      }
      parent.replies.push(comment.id);
    }

    index.comments.push(comment);
    index.lastUpdated = new Date().toISOString();
    index.stats = this._calculateStats(index.comments);

    await this._writeIndex(index);

    // Send notification (placeholder)
    await this._sendNotification('new_comment', comment);

    logger.info(`Added comment ${comment.id} for touchpoint ${comment.touchpointId}`);
    return comment;
  }

  /**
   * Reply to an existing comment
   * @param {string} parentId - Parent comment ID
   * @param {Object} replyData - Reply data
   * @returns {Object} Created reply
   */
  async replyToComment(parentId, replyData) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    const parent = this._findComment(index.comments, parentId);
    
    if (!parent) {
      throw new Error(`Parent comment not found: ${parentId}`);
    }

    const reply = {
      id: `comment-${uuidv4().split('-')[0]}`,
      touchpointId: parent.touchpointId,
      journeyId: parent.journeyId,
      user: replyData.user,
      userId: replyData.userId,
      text: replyData.text,
      position: null,
      parentId: parentId,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      replies: [],
      metadata: {}
    };

    index.comments.push(reply);
    parent.replies.push(reply.id);
    parent.updatedAt = new Date().toISOString();
    
    index.lastUpdated = new Date().toISOString();
    index.stats = this._calculateStats(index.comments);

    await this._writeIndex(index);

    // Send notification to parent comment author
    await this._sendNotification('reply', reply, { parentUser: parent.user });

    logger.info(`Added reply ${reply.id} to comment ${parentId}`);
    return reply;
  }

  /**
   * Get comments for a journey
   * @param {string} journeyId - Journey ID
   * @param {Object} options - Query options
   * @returns {Array} Array of comments
   */
  async getCommentsForJourney(journeyId, options = {}) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    let comments = index.comments.filter(c => c.journeyId === journeyId);

    // Filter by status
    if (options.status) {
      comments = comments.filter(c => c.status === options.status);
    }

    // Filter by touchpoint
    if (options.touchpointId) {
      comments = comments.filter(c => c.touchpointId === options.touchpointId);
    }

    // Filter by user
    if (options.userId) {
      comments = comments.filter(c => c.userId === options.userId);
    }

    // Filter root comments only (no replies)
    if (options.rootOnly) {
      comments = comments.filter(c => c.parentId === null);
    }

    // Sort
    if (options.sortBy === 'oldest') {
      comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      // Default: newest first
      comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Limit
    if (options.limit) {
      comments = comments.slice(0, options.limit);
    }

    // Include replies if requested
    if (options.includeReplies) {
      comments = comments.map(c => this._populateReplies(c, index.comments));
    }

    return comments;
  }

  /**
   * Get comments for a specific touchpoint
   * @param {string} touchpointId - Touchpoint ID
   * @param {Object} options - Query options
   * @returns {Array} Array of comments
   */
  async getCommentsForTouchpoint(touchpointId, options = {}) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    let comments = index.comments.filter(c => c.touchpointId === touchpointId);

    // Filter by status
    if (options.status) {
      comments = comments.filter(c => c.status === options.status);
    }

    // Root comments only by default
    if (!options.includeReplies) {
      comments = comments.filter(c => c.parentId === null);
    }

    // Sort by date
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Include nested replies
    if (options.includeReplies) {
      comments = comments.map(c => this._populateReplies(c, index.comments));
    }

    return comments;
  }

  /**
   * Get a single comment by ID
   * @param {string} commentId - Comment ID
   * @param {boolean} includeReplies - Include nested replies
   * @returns {Object|null} Comment object or null
   */
  async getComment(commentId, includeReplies = true) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    const comment = this._findComment(index.comments, commentId);

    if (!comment) return null;

    if (includeReplies) {
      return this._populateReplies(comment, index.comments);
    }

    return comment;
  }

  /**
   * Update a comment
   * @param {string} commentId - Comment ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated comment
   */
  async updateComment(commentId, updates) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    const comment = this._findComment(index.comments, commentId);

    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    // Only allow updating text and position
    if (updates.text !== undefined) {
      comment.text = updates.text;
    }
    if (updates.position !== undefined) {
      comment.position = updates.position;
    }

    comment.updatedAt = new Date().toISOString();
    index.lastUpdated = new Date().toISOString();

    await this._writeIndex(index);

    logger.info(`Updated comment ${commentId}`);
    return comment;
  }

  /**
   * Resolve a comment
   * @param {string} commentId - Comment ID
   * @param {string} resolvedBy - User who resolved it
   * @returns {Object} Updated comment
   */
  async resolveComment(commentId, resolvedBy) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    const comment = this._findComment(index.comments, commentId);

    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    comment.status = 'resolved';
    comment.resolvedAt = new Date().toISOString();
    comment.resolvedBy = resolvedBy;
    comment.updatedAt = new Date().toISOString();

    index.lastUpdated = new Date().toISOString();
    index.stats = this._calculateStats(index.comments);

    await this._writeIndex(index);

    logger.info(`Resolved comment ${commentId} by ${resolvedBy}`);
    return comment;
  }

  /**
   * Unresolve a previously resolved comment
   * @param {string} commentId - Comment ID
   * @returns {Object} Updated comment
   */
  async unresolveComment(commentId) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    const comment = this._findComment(index.comments, commentId);

    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    comment.status = 'open';
    comment.resolvedAt = null;
    comment.resolvedBy = null;
    comment.updatedAt = new Date().toISOString();

    index.lastUpdated = new Date().toISOString();
    index.stats = this._calculateStats(index.comments);

    await this._writeIndex(index);

    logger.info(`Unresolved comment ${commentId}`);
    return comment;
  }

  /**
   * Delete a comment
   * @param {string} commentId - Comment ID
   * @returns {boolean} Success
   */
  async deleteComment(commentId) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    const commentIndex = index.comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    const comment = index.comments[commentIndex];

    // Remove from parent's replies if it's a reply
    if (comment.parentId) {
      const parent = this._findComment(index.comments, comment.parentId);
      if (parent) {
        parent.replies = parent.replies.filter(id => id !== commentId);
      }
    }

    // Delete all replies recursively
    const repliesToDelete = [...comment.replies];
    for (const replyId of repliesToDelete) {
      await this._deleteCommentRecursive(index, replyId);
    }

    // Remove the comment itself
    index.comments.splice(commentIndex, 1);

    index.lastUpdated = new Date().toISOString();
    index.stats = this._calculateStats(index.comments);

    await this._writeIndex(index);

    logger.info(`Deleted comment ${commentId}`);
    return true;
  }

  /**
   * Get comment statistics
   * @param {string} journeyId - Optional journey ID to filter by
   * @returns {Object} Statistics
   */
  async getStats(journeyId = null) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    let comments = index.comments;

    if (journeyId) {
      comments = comments.filter(c => c.journeyId === journeyId);
    }

    const stats = {
      total: comments.length,
      open: comments.filter(c => c.status === 'open' && !c.parentId).length,
      resolved: comments.filter(c => c.status === 'resolved').length,
      byTouchpoint: {},
      byUser: {}
    };

    // Stats by touchpoint
    comments.forEach(c => {
      if (!c.parentId) { // Only count root comments
        stats.byTouchpoint[c.touchpointId] = (stats.byTouchpoint[c.touchpointId] || 0) + 1;
      }
      stats.byUser[c.user] = (stats.byUser[c.user] || 0) + 1;
    });

    return stats;
  }

  /**
   * Mark all comments for a touchpoint as resolved
   * @param {string} touchpointId - Touchpoint ID
   * @param {string} resolvedBy - User who resolved them
   * @returns {number} Number of comments resolved
   */
  async resolveAllForTouchpoint(touchpointId, resolvedBy) {
    await this._ensureInitialized();

    const index = await this._readIndex();
    const touchpointComments = index.comments.filter(
      c => c.touchpointId === touchpointId && c.status === 'open'
    );

    for (const comment of touchpointComments) {
      comment.status = 'resolved';
      comment.resolvedAt = new Date().toISOString();
      comment.resolvedBy = resolvedBy;
      comment.updatedAt = new Date().toISOString();
    }

    index.lastUpdated = new Date().toISOString();
    index.stats = this._calculateStats(index.comments);

    await this._writeIndex(index);

    logger.info(`Resolved ${touchpointComments.length} comments for touchpoint ${touchpointId}`);
    return touchpointComments.length;
  }

  /**
   * Export comments for a journey
   * @param {string} journeyId - Journey ID
   * @param {string} format - Export format (json, csv)
   * @returns {string} Exported data
   */
  async exportComments(journeyId, format = 'json') {
    await this._ensureInitialized();

    const comments = await this.getCommentsForJourney(journeyId, {
      includeReplies: true,
      sortBy: 'oldest'
    });

    if (format === 'csv') {
      return this._exportToCsv(comments);
    }

    return JSON.stringify(comments, null, 2);
  }

  // ==================== PRIVATE METHODS ====================

  async _ensureInitialized() {
    const initialized = await this.isInitialized();
    if (!initialized) {
      await this.initialize();
    }
  }

  async _readIndex() {
    const content = await fs.readFile(this.indexFile, 'utf8');
    return JSON.parse(content);
  }

  async _writeIndex(data) {
    await fs.writeFile(this.indexFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  _findComment(comments, commentId) {
    return comments.find(c => c.id === commentId);
  }

  _populateReplies(comment, allComments) {
    if (!comment.replies || comment.replies.length === 0) {
      return comment;
    }

    const populated = { ...comment };
    populated.replies = comment.replies
      .map(replyId => {
        const reply = allComments.find(c => c.id === replyId);
        return reply ? this._populateReplies(reply, allComments) : null;
      })
      .filter(Boolean);

    return populated;
  }

  _calculateStats(comments) {
    const rootComments = comments.filter(c => !c.parentId);
    return {
      totalComments: comments.length,
      openComments: rootComments.filter(c => c.status === 'open').length,
      resolvedComments: rootComments.filter(c => c.status === 'resolved').length
    };
  }

  async _deleteCommentRecursive(index, commentId) {
    const commentIndex = index.comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return;

    const comment = index.comments[commentIndex];

    // Delete all replies first
    for (const replyId of comment.replies) {
      await this._deleteCommentRecursive(index, replyId);
    }

    // Remove the comment
    index.comments.splice(commentIndex, 1);
  }

  _exportToCsv(comments) {
    const headers = ['ID', 'Touchpoint', 'User', 'Text', 'Status', 'Created', 'Resolved By', 'Resolved At'];
    const rows = comments.map(c => [
      c.id,
      c.touchpointId,
      c.user,
      `"${c.text.replace(/"/g, '""')}"`,
      c.status,
      c.createdAt,
      c.resolvedBy || '',
      c.resolvedAt || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Send notification (placeholder implementation)
   * @param {string} type - Notification type
   * @param {Object} comment - Comment data
   * @param {Object} extra - Extra context
   */
  async _sendNotification(type, comment, extra = {}) {
    // Placeholder for email/Slack notification
    // This would integrate with your notification service
    logger.debug(`Would send ${type} notification for comment ${comment.id}`);
    
    // Example implementation:
    // await emailService.send({
    //   to: extra.parentUser || comment.user,
    //   subject: `New comment on ${comment.touchpointId}`,
    //   body: `${comment.user} commented: ${comment.text}`
    // });
  }
}

/**
 * Create comment system for a client
 * @param {string} clientSlug - Client slug
 * @returns {CommentSystem} Comment system instance
 */
export function createCommentSystem(clientSlug) {
  return new CommentSystem(clientSlug);
}

export default CommentSystem;
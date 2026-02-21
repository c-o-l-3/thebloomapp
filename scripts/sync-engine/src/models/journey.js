/**
 * Journey Model
 * Represents a marketing journey/timeline in the system
 */

export class Journey {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.description = data.description || '';
    this.status = data.status || 'Draft';
    this.client = data.client || '';
    this.version = data.version || 1;
    this.lastModified = data.lastModified || null;
    this.ghlWorkflowId = data.ghlWorkflowId || null;
    this.syncStatus = data.syncStatus || 'Not Synced';
    this.lastSync = data.lastSync || null;
    this.touchpoints = data.touchpoints || [];
    this.tags = data.tags || [];
    this.category = data.category || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  get isPublished() {
    return this.status === 'Published';
  }

  get isSyncing() {
    return this.syncStatus === 'Syncing';
  }

  get hasGHLWorkflow() {
    return !!this.ghlWorkflowId;
  }

  addTouchpoint(touchpoint) {
    this.touchpoints.push(touchpoint);
    this.touchpoints.sort((a, b) => a.order - b.order);
  }

  getFirstTouchpoint() {
    return this.touchpoints.find(tp => tp.order === 0) || this.touchpoints[0];
  }

  getTouchpointById(id) {
    return this.touchpoints.find(tp => tp.id === id);
  }

  getNextTouchpoint(currentTouchpointId) {
    const currentIndex = this.touchpoints.findIndex(tp => tp.id === currentTouchpointId);
    if (currentIndex === -1 || currentIndex === this.touchpoints.length - 1) {
      return null;
    }
    return this.touchpoints[currentIndex + 1];
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      client: this.client,
      version: this.version,
      lastModified: this.lastModified,
      ghlWorkflowId: this.ghlWorkflowId,
      syncStatus: this.syncStatus,
      lastSync: this.lastSync,
      touchpoints: this.touchpoints.map(tp => tp.toJSON()),
      tags: this.tags,
      category: this.category,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromAirtable(record) {
    return new Journey({
      id: record.id,
      name: record.get('Name') || '',
      description: record.get('Description') || '',
      status: record.get('Status') || 'Draft',
      client: record.get('Client') || '',
      version: record.get('Version') || 1,
      lastModified: record.get('Last Modified') || null,
      ghlWorkflowId: record.get('GHL Workflow ID') || null,
      syncStatus: record.get('Sync Status') || 'Not Synced',
      lastSync: record.get('Last Sync') || null,
      tags: record.get('Tags') || [],
      category: record.get('Category') || ''
    });
  }
}

export default Journey;

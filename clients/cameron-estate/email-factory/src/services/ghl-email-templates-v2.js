import axios from 'axios';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

export class GHLEmailTemplatesV2 {
  constructor(apiKey, locationId) {
    this.apiKey = apiKey;
    this.locationId = locationId;
    this.baseUrl = GHL_BASE_URL;
    this.rateLimitDelay = 250;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    
    try {
      const config = {
        method,
        url,
        headers: this.getHeaders()
      };
      
      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        throw new Error(`GHL API Error ${status}: ${JSON.stringify(data)}`);
      }
      throw error;
    }
  }

  async listItems({ limit = 50, offset = 0, folderId = null } = {}) {
    if (limit > 50) limit = 50;
    const params = new URLSearchParams({
      locationId: this.locationId,
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (folderId) {
      params.append('folderId', folderId);
    }
    
    const response = await this.request('GET', `/emails/public/v2/locations/${this.locationId}/templates?${params}`);
    return {
      items: response.items || [],
      total: response.total || 0
    };
  }

  async getTemplate(templateId) {
    return await this.request('GET', `/emails/public/v2/locations/${this.locationId}/templates/${templateId}`);
  }

  async createTemplate(templateData) {
    const payload = {
      locationId: this.locationId,
      name: templateData.name,
      subjectLine: templateData.subject || templateData.subjectLine || '',
      editorContent: templateData.html || templateData.editorContent || '',
      editorType: 'html',
      previewText: templateData.previewText || '',
      parentFolderId: templateData.folderId || null
    };

    return await this.request('POST', `/emails/public/v2/locations/${this.locationId}/templates`, payload);
  }

  async updateTemplate(templateId, templateData) {
    const payload = {
      name: templateData.name,
      subjectLine: templateData.subject || templateData.subjectLine || '',
      editorContent: templateData.html || templateData.editorContent || '',
      editorType: 'html',
      previewText: templateData.previewText || ''
    };

    return await this.request('PATCH', `/emails/public/v2/locations/${this.locationId}/templates/${templateId}`, payload);
  }

  async deleteTemplate(templateId) {
    return await this.request('DELETE', `/emails/public/v2/locations/${this.locationId}/templates/${templateId}`);
  }

  async listAllTemplates() {
    const allTemplates = [];
    const folders = [];
    
    let offset = 0;
    const limit = 50;
    
    const { items: rootItems, total } = await this.listItems({ limit, offset });
    
    for (const item of rootItems) {
      if (item.type === 'template') {
        allTemplates.push(item);
      } else if (item.type === 'folder') {
        folders.push(item);
      }
    }
    
    for (const folder of folders) {
      console.log(`  Fetching folder: ${folder.name} (${folder.childCount} items)`);
      const folderItems = await this.getFolderContents(folder.id);
      allTemplates.push(...folderItems);
    }
    
    return allTemplates;
  }

  async getFolderContents(folderId) {
    const templates = [];
    let offset = 0;
    const limit = 50;
    
    while (true) {
      const { items } = await this.listItems({ limit, offset, folderId });
      
      for (const item of items) {
        if (item.type === 'template') {
          templates.push(item);
        }
      }
      
      if (items.length < limit) {
        break;
      }
      
      offset += limit;
    }
    
    return templates;
  }

  async findTemplateByName(name) {
    const templates = await this.listAllTemplates();
    return templates.find(t => t.name.toLowerCase() === name.toLowerCase());
  }
}

export default GHLEmailTemplatesV2;

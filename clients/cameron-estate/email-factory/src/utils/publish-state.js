import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store state in client root
const STATE_FILE = path.resolve(__dirname, '../../../publish-state.json');

export class PublishState {
  constructor() {
    this.state = {};
    this.load();
  }

  load() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        this.state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      } catch (e) {
        console.warn('Failed to parse publish state, starting fresh.');
        this.state = {};
      }
    }
  }

  save() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  calculateHash(content) {
    return crypto.createHash('md5').update(content || '').digest('hex');
  }

  shouldPublish(id, content) {
    const hash = this.calculateHash(content);
    const lastState = this.state[id];

    if (!lastState) return true;
    if (lastState.hash !== hash) return true;
    
    return false;
  }

  updateState(id, content, type, name, ghlTemplateId) {
    this.state[id] = {
      lastPublished: new Date().toISOString(),
      hash: this.calculateHash(content),
      type,
      name,
      ghlTemplateId // Store GHL ID for future updates
    };
    this.save();
  }
  
  getGhlId(id) {
    return this.state[id] ? this.state[id].ghlTemplateId : null;
  }

  getLastPublished(id) {
    return this.state[id] ? this.state[id].lastPublished : null;
  }
}

export const publishState = new PublishState();
export default publishState;

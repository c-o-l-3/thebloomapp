/**
 * AssetManager Component
 * Client interface for managing uploaded assets
 */

import React, { useState, useEffect } from 'react';
import { 
  Image, 
  FileText, 
  Video, 
  Music, 
  File,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { getClientPortalApi } from '../services/clientPortalApi.js';
import './AssetManager.css';

const portalApi = getClientPortalApi();

const ASSET_TYPES = [
  { value: 'all', label: 'All Types', icon: File },
  { value: 'image', label: 'Images', icon: Image },
  { value: 'document', label: 'Documents', icon: FileText },
  { value: 'video', label: 'Videos', icon: Video },
  { value: 'audio', label: 'Audio', icon: Music }
];

const ASSET_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'logo', label: 'Logo' },
  { value: 'banner', label: 'Banner' },
  { value: 'email_header', label: 'Email Header' },
  { value: 'social', label: 'Social Media' },
  { value: 'document', label: 'Document' }
];

const getAssetIcon = (type) => {
  switch (type) {
    case 'image': return Image;
    case 'document': return FileText;
    case 'video': return Video;
    case 'audio': return Music;
    default: return File;
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * AssetManager - Client asset management interface
 */
export function AssetManager() {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    filterAssets();
  }, [assets, searchQuery, selectedType, selectedCategory]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await portalApi.getAssets();
      setAssets(data);
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => asset.type === selectedType);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(query) ||
        (asset.description && asset.description.toLowerCase().includes(query)) ||
        (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    setFilteredAssets(filtered);
  };

  const handleDeleteAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
      await portalApi.deleteAsset(assetId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
      setSelectedAsset(null);
    } catch (err) {
      console.error('Error deleting asset:', err);
      alert('Failed to delete asset');
    }
  };

  const handleAssetUpload = async (formData) => {
    // In a real implementation, this would upload to a storage service
    // For now, we'll simulate the upload
    try {
      const newAsset = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        fileType: formData.fileType,
        fileUrl: formData.fileUrl,
        fileSize: formData.fileSize,
        category: formData.category,
        tags: formData.tags
      };
      
      const created = await portalApi.createAsset(newAsset);
      setAssets(prev => [created, ...prev]);
      setShowUploadModal(false);
    } catch (err) {
      console.error('Error uploading asset:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="asset-manager">
        <div className="asset-manager__loading">
          <Loader2 size={32} className="asset-manager__spinner" />
          <p>Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-manager">
      <div className="asset-manager__header">
        <div>
          <h2>Asset Manager</h2>
          <p>Manage your images, documents, and other files</p>
        </div>
        <button 
          className="portal-btn portal-btn--primary"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload size={18} />
          Upload Asset
        </button>
      </div>

      {error && (
        <div className="asset-manager__error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={loadAssets}>Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="am-filters">
        <div className="am-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="am-filter-group">
          <Filter size={18} />
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {ASSET_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="am-filter-group">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {ASSET_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset Grid */}
      {filteredAssets.length > 0 ? (
        <div className="am-grid">
          {filteredAssets.map(asset => {
            const IconComponent = getAssetIcon(asset.type);
            
            return (
              <div 
                key={asset.id} 
                className="am-card"
                onClick={() => setSelectedAsset(asset)}
              >
                <div className="am-card__preview">
                  {asset.thumbnailUrl ? (
                    <img src={asset.thumbnailUrl} alt={asset.name} />
                  ) : (
                    <IconComponent size={48} />
                  )}
                </div>
                <div className="am-card__info">
                  <h4>{asset.name}</h4>
                  <div className="am-card__meta">
                    <span>{asset.type}</span>
                    <span>{formatFileSize(asset.fileSize)}</span>
                  </div>
                  <span className="am-card__category">{asset.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="am-empty">
          <Image size={64} />
          <p>No assets found</p>
          {searchQuery && <span>Try adjusting your filters</span>}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadAssetModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleAssetUpload}
        />
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDelete={() => handleDeleteAsset(selectedAsset.id)}
        />
      )}
    </div>
  );
}

/**
 * Upload Asset Modal
 */
function UploadAssetModal({ onClose, onUpload }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'image',
    fileType: '',
    fileUrl: '',
    fileSize: 0,
    category: 'general',
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.fileUrl) {
      setError('Please provide a name and file URL');
      return;
    }

    try {
      setLoading(true);
      await onUpload(formData);
    } catch (err) {
      setError('Failed to upload asset');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    }));
    setNewTag('');
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="am-modal">
      <div className="am-modal__overlay" onClick={onClose} />
      <div className="am-modal__content">
        <div className="am-modal__header">
          <h3>Upload Asset</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="am-modal__error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="am-field">
            <label>Asset Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Welcome Email Header"
              required
            />
          </div>

          <div className="am-field">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the asset..."
              rows={2}
            />
          </div>

          <div className="am-field-row">
            <div className="am-field">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                {ASSET_TYPES.filter(t => t.value !== 'all').map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="am-field">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {ASSET_CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="am-field">
            <label>File URL *</label>
            <input
              type="url"
              value={formData.fileUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
              placeholder="https://..."
              required
            />
          </div>

          <div className="am-field-row">
            <div className="am-field">
              <label>File Type</label>
              <input
                type="text"
                value={formData.fileType}
                onChange={(e) => setFormData(prev => ({ ...prev, fileType: e.target.value }))}
                placeholder="e.g., jpg, pdf"
              />
            </div>

            <div className="am-field">
              <label>File Size (bytes)</label>
              <input
                type="number"
                value={formData.fileSize}
                onChange={(e) => setFormData(prev => ({ ...prev, fileSize: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="am-field">
            <label>Tags</label>
            <div className="am-tags">
              {formData.tags.map((tag, index) => (
                <span key={index} className="am-tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(index)}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="am-tag-input">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button type="button" onClick={addTag}>Add</button>
            </div>
          </div>

          <div className="am-modal__actions">
            <button type="button" className="portal-btn portal-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="portal-btn portal-btn--primary" disabled={loading}>
              {loading ? <><Loader2 size={18} className="spinner" /> Uploading...</> : <><Upload size={18} /> Upload</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Asset Detail Modal
 */
function AssetDetailModal({ asset, onClose, onDelete }) {
  const IconComponent = getAssetIcon(asset.type);

  return (
    <div className="am-modal">
      <div className="am-modal__overlay" onClick={onClose} />
      <div className="am-modal__content">
        <div className="am-modal__header">
          <h3>{asset.name}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="am-detail">
          <div className="am-detail__preview">
            {asset.thumbnailUrl ? (
              <img src={asset.thumbnailUrl} alt={asset.name} />
            ) : (
              <IconComponent size={64} />
            )}
          </div>

          <div className="am-detail__info">
            <div className="am-detail__row">
              <span>Type</span>
              <span>{asset.type}</span>
            </div>
            <div className="am-detail__row">
              <span>Category</span>
              <span>{asset.category}</span>
            </div>
            <div className="am-detail__row">
              <span>File Type</span>
              <span>{asset.fileType || 'Unknown'}</span>
            </div>
            <div className="am-detail__row">
              <span>Size</span>
              <span>{formatFileSize(asset.fileSize)}</span>
            </div>
            <div className="am-detail__row">
              <span>Uploaded</span>
              <span>{format(new Date(asset.createdAt), 'MMM d, yyyy')}</span>
            </div>
            <div className="am-detail__row">
              <span>By</span>
              <span>{asset.uploadedBy}</span>
            </div>
          </div>

          {asset.description && (
            <div className="am-detail__description">
              <h4>Description</h4>
              <p>{asset.description}</p>
            </div>
          )}

          {asset.tags && asset.tags.length > 0 && (
            <div className="am-detail__tags">
              <h4>Tags</h4>
              <div className="am-tags">
                {asset.tags.map((tag, index) => (
                  <span key={index} className="am-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="am-detail__actions">
            <a 
              href={asset.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="portal-btn portal-btn--secondary"
            >
              <Download size={18} />
              Download
            </a>
            <button className="portal-btn portal-btn--danger" onClick={onDelete}>
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetManager;
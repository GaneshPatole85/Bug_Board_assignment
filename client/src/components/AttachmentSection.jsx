import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from './ui/Button.jsx';
import './AttachmentSection.css';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const AttachmentSection = ({ issueId }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const fetchAttachments = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/issues/${issueId}/attachments`);
      setAttachments(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleUploadFile = async (file) => {
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      addToast(`File size (${formatBytes(file.size)}) exceeds maximum limit of 5 MB`, 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await apiClient.post(`/issues/${issueId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data) {
        setAttachments((prev) => [res.data, ...prev]);
        addToast('Attachment uploaded successfully', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to upload attachment', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDownload = (attachment) => {
    // Direct link to download endpoint
    const baseURL = apiClient.defaults.baseURL || '/api/v1';
    window.open(`${baseURL}/attachments/${attachment._id}/download`, '_blank');
  };

  return (
    <div className="attachments-section" id="attachments-section">
      <div className="attachments-header">
        <span className="attachments-title">Attachments</span>
        <span className="attachments-count-pill font-mono">{attachments.length}</span>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        id="attachment-file-input"
      />

      {/* Drag & Drop Upload Zone */}
      <div
        className={`attachment-drop-zone ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'is-uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        id="attachment-drop-zone"
      >
        <div className="drop-zone-content">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          <span className="drop-zone-text">
            {isUploading ? 'Uploading file...' : 'Drop files here or click to browse'}
          </span>
          <span className="drop-zone-hint">Images, PDF, logs, text (max 5MB)</span>
        </div>
      </div>

      {/* Attachments List */}
      {loading ? (
        <div className="attachments-loading font-mono">Loading files...</div>
      ) : attachments.length === 0 ? (
        <div className="attachments-empty">No attachments uploaded yet</div>
      ) : (
        <div className="attachments-list" id="attachments-list">
          {attachments.map((att) => {
            const isImage = att.mimeType?.startsWith('image/');
            return (
              <div key={att._id} className="attachment-item" id={`attachment-${att._id}`}>
                <div className="attachment-icon-box" aria-hidden="true">
                  {isImage ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                </div>

                <div className="attachment-details">
                  <span className="attachment-filename" title={att.originalFilename}>
                    {att.originalFilename}
                  </span>
                  <div className="attachment-meta-row">
                    <span className="attachment-size font-mono">{formatBytes(att.size)}</span>
                    <span className="attachment-uploader">• {att.uploader?.name || 'User'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="attachment-download-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(att);
                  }}
                  title="Download attachment"
                  id={`download-att-${att._id}`}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttachmentSection;

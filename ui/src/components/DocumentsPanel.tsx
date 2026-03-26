import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, DocumentStatusUpdate } from '../types';
import { getDocuments, uploadDocument, deleteDocument } from '../api';
import { ensureConnected, onDocumentStatus } from '../chatConnection';

interface DocumentsPanelProps {
  onClose: () => void;
}

export default function DocumentsPanel({ onClose }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingDetails, setProcessingDetails] = useState<Record<string, DocumentStatusUpdate>>({});

  const loadDocuments = useCallback(async () => {
    const docs = await getDocuments();
    setDocuments(docs);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Real-time document processing via SignalR
  useEffect(() => {
    ensureConnected();
    const unsubscribe = onDocumentStatus((update: DocumentStatusUpdate) => {
      setProcessingDetails((prev) => ({ ...prev, [update.documentId]: update }));

      if (update.status === 'Ready' || update.status === 'Failed') {
        loadDocuments();
      }
    });
    return unsubscribe;
  }, [loadDocuments]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        await uploadDocument(file);
      }
      await loadDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [loadDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
  });

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusColor: Record<string, string> = {
    Pending: '#f59e0b',
    Processing: '#3b82f6',
    Ready: '#10b981',
    Failed: '#ef4444',
  };

  const renderProgress = (doc: Document) => {
    const detail = processingDetails[doc.id];
    if (!detail || doc.status === 'Ready') return null;

    return (
      <div className="processing-progress">
        <div className="progress-text">{detail.detail}</div>
        {detail.total && detail.total > 0 && (
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${((detail.progress || 0) / detail.total) * 100}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="documents-panel">
      <div className="documents-header">
        <h2>Documents</h2>
        <button onClick={onClose}>&times;</button>
      </div>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {uploading ? (
          <p>Uploading...</p>
        ) : isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p>Drag & drop PDF, DOCX, or TXT files here, or click to browse</p>
          </>
        )}
      </div>

      <div className="document-list">
        {documents.map((doc) => (
          <div key={doc.id} className="document-item">
            <div className="document-info">
              <span className="document-name">{doc.fileName}</span>
              <span className="document-meta">
                {formatSize(doc.fileSizeBytes)} &bull; {doc.chunkCount} chunks &bull;{' '}
                <span className="status-badge" style={{ backgroundColor: statusColor[doc.status] || '#6b7280' }}>
                  {doc.status}
                </span>
              </span>
              {renderProgress(doc)}
            </div>
            <button className="btn-delete" onClick={() => handleDelete(doc.id)} title="Delete">
              &times;
            </button>
          </div>
        ))}
        {documents.length === 0 && (
          <p className="no-documents">No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

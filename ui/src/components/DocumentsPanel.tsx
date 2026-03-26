import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document } from '../types';
import { getDocuments, uploadDocument, deleteDocument, getDocument } from '../api';

interface DocumentsPanelProps {
  onClose: () => void;
}

export default function DocumentsPanel({ onClose }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    const docs = await getDocuments();
    setDocuments(docs);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll for processing status
  useEffect(() => {
    const processing = documents.filter(d => d.status === 'Pending' || d.status === 'Processing');
    if (processing.length === 0) return;

    const interval = setInterval(async () => {
      const updated = await Promise.all(
        processing.map(d => getDocument(d.id))
      );
      setDocuments(prev => prev.map(d => {
        const u = updated.find(x => x.id === d.id);
        return u || d;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

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
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Pending: '#f59e0b',
      Processing: '#3b82f6',
      Ready: '#10b981',
      Failed: '#ef4444',
    };
    return (
      <span className="status-badge" style={{ backgroundColor: colors[status] || '#6b7280' }}>
        {status}
      </span>
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
          <p>Drag & drop PDF, DOCX, or TXT files here, or click to browse</p>
        )}
      </div>

      <div className="document-list">
        {documents.map((doc) => (
          <div key={doc.id} className="document-item">
            <div className="document-info">
              <span className="document-name">{doc.fileName}</span>
              <span className="document-meta">
                {formatSize(doc.fileSizeBytes)} &bull; {doc.chunkCount} chunks &bull; {statusBadge(doc.status)}
              </span>
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

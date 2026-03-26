import React, { useState, useEffect, useRef } from 'react';
import { DocumentChunk } from '../types';
import { getDocumentChunks } from '../api';

interface DocumentViewerProps {
  documentId: string;
  fileName: string;
  highlightChunkId?: string;
  onClose: () => void;
}

export default function DocumentViewer({ documentId, fileName, highlightChunkId, onClose }: DocumentViewerProps) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocumentChunks(documentId)
      .then(setChunks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => {
    if (!loading && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading]);

  return (
    <div className="document-viewer-overlay" onClick={onClose}>
      <div className="document-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <h2>{fileName}</h2>
          <span className="chunk-count">{chunks.length} chunks</span>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="viewer-content">
          {loading ? (
            <div className="viewer-loading">Loading document...</div>
          ) : (
            chunks.map((chunk) => (
              <div
                key={chunk.id}
                ref={chunk.id === highlightChunkId ? highlightRef : undefined}
                className={`viewer-chunk ${chunk.id === highlightChunkId ? 'highlighted' : ''}`}
              >
                <div className="chunk-header">Chunk {chunk.chunkIndex + 1} ({chunk.tokenCount} tokens)</div>
                <p>{chunk.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

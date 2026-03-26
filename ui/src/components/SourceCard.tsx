import React, { useState } from 'react';
import { Source } from '../types';

interface SourceCardProps {
  source: Source;
  onViewDocument?: () => void;
}

export default function SourceCard({ source, onViewDocument }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`source-card ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="source-card-header">
        <span className="source-file">{source.fileName}</span>
        <span className="source-score">{(source.relevanceScore * 100).toFixed(0)}%</span>
        <span className="source-expand">{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>
      {expanded && (
        <div className="source-card-body">
          <p className="source-snippet">{source.snippet}</p>
          {onViewDocument && (
            <button
              className="btn-view-doc"
              onClick={(e) => { e.stopPropagation(); onViewDocument(); }}
            >
              View in document
            </button>
          )}
        </div>
      )}
    </div>
  );
}

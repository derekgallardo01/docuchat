import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { AnalyticsData } from '../types';
import { getAnalytics } from '../api';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="analytics-loading">Loading analytics...</div>;
  if (!data) return <div className="analytics-loading">Failed to load analytics.</div>;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Analytics</h2>
        <button onClick={onClose}>&times;</button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.totalConversations}</div>
          <div className="stat-label">Conversations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.totalMessages}</div>
          <div className="stat-label">Messages</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.totalDocuments}</div>
          <div className="stat-label">Documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.totalTokensUsed.toLocaleString()}</div>
          <div className="stat-label">Tokens Used</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Messages Per Day */}
        <div className="chart-card">
          <h3>Messages Per Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.messagesPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Token Usage Over Time */}
        <div className="chart-card">
          <h3>Token Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.tokensPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Documents by Status */}
        <div className="chart-card">
          <h3>Documents by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.documentsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                {data.documentsByStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Referenced Documents */}
        <div className="chart-card">
          <h3>Top Referenced Documents</h3>
          <div className="top-docs-table">
            <div className="table-header">
              <span>Document</span>
              <span>References</span>
              <span>Avg Score</span>
            </div>
            {data.topDocuments.map((doc, i) => (
              <div key={i} className="table-row">
                <span className="doc-name">{doc.fileName}</span>
                <span>{doc.referenceCount}</span>
                <span>{(doc.avgRelevanceScore * 100).toFixed(0)}%</span>
              </div>
            ))}
            {data.topDocuments.length === 0 && (
              <div className="table-row"><span className="no-data">No data yet</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

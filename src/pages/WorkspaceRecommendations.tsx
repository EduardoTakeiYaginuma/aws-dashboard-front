import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, RecommendationsResponse } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const TYPE_LABELS: Record<string, string> = {
  EC2_DOWN_SIZE: 'EC2 Downsize',
  EBS_ORPHAN: 'EBS Orphaned',
  S3_LIFECYCLE: 'S3 Lifecycle',
  RDS_DOWN_SIZE: 'RDS Downsize',
  LAMBDA_UNUSED: 'Lambda Unused',
  LAMBDA_OVERSIZED: 'Lambda Oversized',
  ELB_NO_TARGETS: 'ELB No Targets',
  ELB_NO_TRAFFIC: 'ELB No Traffic',
  EIP_UNASSOCIATED: 'EIP Unassociated',
  NAT_GW_IDLE: 'NAT GW Idle',
};

const CHART_COLORS = [
  '#4361ee', '#f72585', '#4cc9f0', '#f77f00', '#7209b7',
  '#3a86a8', '#06d6a0', '#e63946', '#457b9d', '#8338ec',
];

export default function WorkspaceRecommendations() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getRecommendations(id, filter || undefined)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, filter]);

  if (loading) return <div className="loading">Loading recommendations...</div>;
  if (!data) return <div className="error-msg">Failed to load recommendations</div>;

  // Build savings-by-type chart data
  const savingsByType: Record<string, number> = {};
  data.recommendations.forEach(r => {
    const label = TYPE_LABELS[r.type] || r.type;
    savingsByType[label] = (savingsByType[label] || 0) + r.estimatedMonthlySavings;
  });
  const savingsBarData = Object.entries(savingsByType)
    .sort(([, a], [, b]) => b - a)
    .map(([name, savings], i) => ({ name, savings, fill: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <div>
      <div className="page-header">
        <h1>Recommendations</h1>
        <p>
          {data.summary.totalRecommendations} findings with estimated savings of{' '}
          <strong>${data.summary.totalEstimatedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</strong>
        </p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card-enhanced anim-delay-1" style={{ '--accent-gradient': 'linear-gradient(90deg, #059669, #34d399)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#ecfdf5', '--icon-color': '#059669' } as React.CSSProperties}>$</div>
          <div className="stat-label">Total Savings Potential</div>
          <div className="stat-value savings">
            ${data.summary.totalEstimatedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
          </div>
          <div className="stat-subtitle">${(data.summary.totalEstimatedSavings * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</div>
        </div>
        <div className="stat-card-enhanced anim-delay-2" style={{ '--accent-gradient': 'linear-gradient(90deg, #1e40af, #3b82f6)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#dbeafe', '--icon-color': '#1e40af' } as React.CSSProperties}>●</div>
          <div className="stat-label">New</div>
          <div className="stat-value">{data.summary.byStatus.new}</div>
          <div className="stat-subtitle">action needed</div>
        </div>
        <div className="stat-card-enhanced anim-delay-3" style={{ '--accent-gradient': 'linear-gradient(90deg, #92400e, #f59e0b)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#fef3c7', '--icon-color': '#92400e' } as React.CSSProperties}>✓</div>
          <div className="stat-label">Acknowledged</div>
          <div className="stat-value">{data.summary.byStatus.acknowledged}</div>
          <div className="stat-subtitle">in progress</div>
        </div>
        <div className="stat-card-enhanced anim-delay-4" style={{ '--accent-gradient': 'linear-gradient(90deg, #6b7280, #9ca3af)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#f3f4f6', '--icon-color': '#6b7280' } as React.CSSProperties}>✕</div>
          <div className="stat-label">Dismissed</div>
          <div className="stat-value">{data.summary.byStatus.dismissed}</div>
          <div className="stat-subtitle">skipped</div>
        </div>
      </div>

      {savingsBarData.length > 0 && (
        <div className="chart-card" style={{ marginBottom: '1.25rem' }}>
          <h3>Savings by Type</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, savingsBarData.length * 36)}>
            <BarChart data={savingsBarData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => `$${v.toLocaleString()}`} fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: '#374151' }} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Savings/mo']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.82rem' }}
              />
              <Bar dataKey="savings" radius={[0, 6, 6, 0]} barSize={18}>
                {savingsBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="filter-tabs">
        <button className={`filter-tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
        <button className={`filter-tab ${filter === 'new' ? 'active' : ''}`} onClick={() => setFilter('new')}>New</button>
        <button className={`filter-tab ${filter === 'acknowledged' ? 'active' : ''}`} onClick={() => setFilter('acknowledged')}>Acknowledged</button>
        <button className={`filter-tab ${filter === 'dismissed' ? 'active' : ''}`} onClick={() => setFilter('dismissed')}>Dismissed</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Resource</th>
                <th>Est. Savings</th>
                <th>Confidence</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recommendations.map((rec) => (
                <tr key={rec.id}>
                  <td>{TYPE_LABELS[rec.type] || rec.type}</td>
                  <td><code>{rec.resourceId}</code></td>
                  <td style={{ fontWeight: 600, color: '#059669' }}>
                    ${rec.estimatedMonthlySavings.toLocaleString()}/mo
                  </td>
                  <td>
                    <span className={`badge badge-${rec.confidence}`}>
                      {rec.confidence}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${rec.status}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/recommendations/${rec.id}`} className="btn btn-sm btn-primary">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
              {data.recommendations.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                    No recommendations found with the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

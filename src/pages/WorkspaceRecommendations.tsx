import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, RecommendationsResponse } from '../api';

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

  return (
    <div>
      <div className="page-header">
        <h1>Recommendations</h1>
        <p>
          {data.summary.totalRecommendations} findings with estimated savings of{' '}
          <strong>${data.summary.totalEstimatedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</strong>
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Savings Potential</div>
          <div className="stat-value savings">
            ${data.summary.totalEstimatedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New</div>
          <div className="stat-value">{data.summary.byStatus.new}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Acknowledged</div>
          <div className="stat-value">{data.summary.byStatus.acknowledged}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Dismissed</div>
          <div className="stat-value">{data.summary.byStatus.dismissed}</div>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === '' ? 'active' : ''}`}
          onClick={() => setFilter('')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'new' ? 'active' : ''}`}
          onClick={() => setFilter('new')}
        >
          New
        </button>
        <button
          className={`filter-tab ${filter === 'acknowledged' ? 'active' : ''}`}
          onClick={() => setFilter('acknowledged')}
        >
          Acknowledged
        </button>
        <button
          className={`filter-tab ${filter === 'dismissed' ? 'active' : ''}`}
          onClick={() => setFilter('dismissed')}
        >
          Dismissed
        </button>
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

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Recommendation } from '../api';

const TYPE_LABELS: Record<string, string> = {
  EC2_DOWN_SIZE: 'EC2 Instance Downsizing',
  EBS_ORPHAN: 'EBS Orphaned Volume',
  S3_LIFECYCLE: 'S3 Lifecycle Optimization',
  RDS_DOWN_SIZE: 'RDS Instance Downsizing',
  LAMBDA_UNUSED: 'Lambda Unused Function',
  LAMBDA_OVERSIZED: 'Lambda Oversized Memory',
  ELB_NO_TARGETS: 'Load Balancer Without Targets',
  ELB_NO_TRAFFIC: 'Load Balancer Without Traffic',
  EIP_UNASSOCIATED: 'Elastic IP Unassociated',
  NAT_GW_IDLE: 'NAT Gateway Idle',
};

export default function RecommendationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getRecommendation(id)
      .then(setRec)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus: string) {
    if (!id) return;
    setUpdating(true);
    try {
      const updated = await api.updateRecommendationStatus(id, newStatus);
      setRec(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="loading">Loading recommendation...</div>;
  if (!rec) return <div className="error-msg">Recommendation not found</div>;

  const metadata = rec.metadata as Record<string, unknown> | null;

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '0.75rem' }}>
          Back
        </button>
        <h1>{TYPE_LABELS[rec.type] || rec.type}</h1>
        <p>Resource: <code>{rec.resourceId}</code></p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Estimated Monthly Savings</div>
          <div className="stat-value savings">${rec.estimatedMonthlySavings.toLocaleString()}/mo</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Annual Savings Potential</div>
          <div className="stat-value savings">
            ${(rec.estimatedMonthlySavings * 12).toLocaleString()}/yr
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confidence</div>
          <div className="stat-value">
            <span className={`badge badge-${rec.confidence}`}>{rec.confidence}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-value">
            <span className={`badge badge-${rec.status}`}>{rec.status}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="detail-section">
          <h3>Description</h3>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>{rec.description}</p>
        </div>

        {metadata && Object.keys(metadata).length > 0 && (
          <div className="detail-section">
            <h3>Details</h3>
            {Object.entries(metadata).map(([key, value]) => (
              <div className="detail-row" key={key}>
                <span className="detail-label">{key}</span>
                <span className="detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="detail-section">
          <h3>Actions</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {rec.status !== 'acknowledged' && (
              <button
                className="btn btn-primary"
                disabled={updating}
                onClick={() => handleStatusChange('acknowledged')}
              >
                Acknowledge
              </button>
            )}
            {rec.status !== 'dismissed' && (
              <button
                className="btn btn-secondary"
                disabled={updating}
                onClick={() => handleStatusChange('dismissed')}
              >
                Dismiss
              </button>
            )}
            {rec.status !== 'new' && (
              <button
                className="btn btn-secondary"
                disabled={updating}
                onClick={() => handleStatusChange('new')}
              >
                Reset to New
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
        <p>
          <strong>Note:</strong> Savings estimates are conservative (using a 60% factor) and based on
          on-demand pricing. Actual savings may vary depending on Reserved Instances, Savings Plans,
          and specific usage patterns. This recommendation is read-only and will not make any changes
          to your AWS account.
        </p>
      </div>
    </div>
  );
}

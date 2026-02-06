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
  const annualSavings = rec.estimatedMonthlySavings * 12;

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '0.75rem' }}>
          Back
        </button>
        <h1>{TYPE_LABELS[rec.type] || rec.type}</h1>
        <p>Resource: <code>{rec.resourceId}</code></p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card-enhanced anim-delay-1" style={{ '--accent-gradient': 'linear-gradient(90deg, #059669, #34d399)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#ecfdf5', '--icon-color': '#059669' } as React.CSSProperties}>$</div>
          <div className="stat-label">Monthly Savings</div>
          <div className="stat-value savings">${rec.estimatedMonthlySavings.toLocaleString()}</div>
          <div className="stat-subtitle">per month</div>
        </div>
        <div className="stat-card-enhanced anim-delay-2" style={{ '--accent-gradient': 'linear-gradient(90deg, #065f46, #059669)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#d1fae5', '--icon-color': '#065f46' } as React.CSSProperties}>$</div>
          <div className="stat-label">Annual Potential</div>
          <div className="stat-value savings">${annualSavings.toLocaleString()}</div>
          <div className="stat-subtitle">per year</div>
        </div>
        <div className="stat-card-enhanced anim-delay-3" style={{ '--accent-gradient': `linear-gradient(90deg, ${rec.confidence === 'high' ? '#166534, #22c55e' : rec.confidence === 'medium' ? '#854d0e, #f59e0b' : '#991b1b, #ef4444'})` } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': rec.confidence === 'high' ? '#dcfce7' : rec.confidence === 'medium' ? '#fef3c7' : '#fee2e2', '--icon-color': rec.confidence === 'high' ? '#166534' : rec.confidence === 'medium' ? '#854d0e' : '#991b1b' } as React.CSSProperties}>
            {rec.confidence === 'high' ? '✓' : rec.confidence === 'medium' ? '~' : '!'}
          </div>
          <div className="stat-label">Confidence</div>
          <div className="stat-value">
            <span className={`badge badge-${rec.confidence}`}>{rec.confidence}</span>
          </div>
        </div>
        <div className="stat-card-enhanced anim-delay-4" style={{ '--accent-gradient': `linear-gradient(90deg, ${rec.status === 'new' ? '#1d4ed8, #3b82f6' : rec.status === 'acknowledged' ? '#92400e, #f59e0b' : '#6b7280, #9ca3af'})` } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': rec.status === 'new' ? '#dbeafe' : rec.status === 'acknowledged' ? '#fef3c7' : '#f3f4f6', '--icon-color': rec.status === 'new' ? '#1d4ed8' : rec.status === 'acknowledged' ? '#92400e' : '#6b7280' } as React.CSSProperties}>
            {rec.status === 'new' ? '●' : rec.status === 'acknowledged' ? '✓' : '✕'}
          </div>
          <div className="stat-label">Status</div>
          <div className="stat-value">
            <span className={`badge badge-${rec.status}`}>{rec.status}</span>
          </div>
        </div>
      </div>

      {/* Annual savings callout */}
      <div className="savings-banner" style={{ marginBottom: '1.25rem' }}>
        <div className="savings-banner-content">
          <div style={{ fontSize: '0.78rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '4px' }}>
            Annual Savings Opportunity
          </div>
          <div className="savings-amount">
            ${annualSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
          </div>
          <div className="savings-detail">
            Based on ${rec.estimatedMonthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo estimated savings
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

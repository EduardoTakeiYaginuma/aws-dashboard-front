import { useEffect, useState, useCallback } from 'react';
import {
  api,
  Workspace,
  Resource,
  CostData,
  RecommendationsResponse,
  SyncResult,
} from '../api';
import InfrastructureMap from '../components/InfrastructureMap';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// ─── Colors & Labels ──────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
  EC2: '#ff9900', EBS: '#d4a017', S3: '#3f8624', RDS: '#2e73b8',
  Lambda: '#c7511f', ELB: '#8c4fff', CloudFront: '#8c4fff', VPC: '#1b660f',
  AutoScaling: '#e25d10', ElasticBeanstalk: '#ff9900', DynamoDB: '#2e73b8',
  SNS: '#d63384', SQS: '#d63384', Route53: '#8c4fff', IAM: '#dd3522',
  CloudFormation: '#d63384',
};

const SERVICE_LABELS: Record<string, string> = {
  EC2: 'EC2 Instances', EBS: 'EBS Volumes', S3: 'S3 Buckets', RDS: 'RDS Databases',
  Lambda: 'Lambda Functions', ELB: 'Load Balancers', CloudFront: 'CloudFront',
  VPC: 'VPC & Networking', AutoScaling: 'Auto Scaling', ElasticBeanstalk: 'Elastic Beanstalk',
  DynamoDB: 'DynamoDB', SNS: 'SNS Topics', SQS: 'SQS Queues', Route53: 'Route 53',
  IAM: 'IAM', CloudFormation: 'CloudFormation',
};

const SERVICE_ORDER = [
  'EC2', 'EBS', 'Lambda', 'ELB', 'AutoScaling', 'ElasticBeanstalk',
  'RDS', 'DynamoDB', 'S3', 'CloudFront',
  'VPC', 'Route53', 'SNS', 'SQS', 'IAM', 'CloudFormation',
];

const REC_TYPE_LABELS: Record<string, string> = {
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

const COST_COLORS = [
  '#4361ee', '#f72585', '#4cc9f0', '#f77f00', '#7209b7',
  '#3a86a8', '#06d6a0', '#e63946', '#457b9d', '#8338ec',
];

const HEALTH_COLORS: Record<string, string> = {
  active: '#22c55e',
  running: '#22c55e',
  available: '#22c55e',
  'in-use': '#22c55e',
  stopped: '#ef4444',
  terminated: '#ef4444',
  pending: '#f59e0b',
  creating: '#f59e0b',
  other: '#94a3b8',
};

// ─── Micro-components ─────────────────────────────────────────────────

function StateBadge({ state }: { state: string }) {
  const color =
    ['running','active','available','in-use','Active','Ready','associated','connected'].includes(state) ? '#16a34a'
    : ['stopped','disabled','inactive','not-found','error','terminated','unassociated'].includes(state) ? '#dc2626'
    : ['pending','creating','Updating','Launching'].includes(state) ? '#ca8a04'
    : '#6b7280';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem',
      fontWeight: 600, backgroundColor: color + '18', color, border: `1px solid ${color}40`,
    }}>{state}</span>
  );
}

function ServiceBadge({ service }: { service: string }) {
  const color = SERVICE_COLORS[service] || '#6b7280';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem',
      fontWeight: 700, backgroundColor: color + '18', color, border: `1px solid ${color}40`,
    }}>{service}</span>
  );
}

function MetadataValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return (
    <div style={{ marginBottom: '4px' }}>
      <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>{label}: </span>
      <span style={{ fontWeight: 500 }}>{value ? 'Yes' : 'No'}</span>
    </div>
  );
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === 'string') return (
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>{label}: </span>
        <span style={{ fontWeight: 500 }}>{value.join(', ')}</span>
      </div>
    );
    return (
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>{label}:</span>
        <pre style={{ fontSize: '0.72rem', margin: '2px 0', padding: '4px 6px', background: '#f3f4f6', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  }
  if (typeof value === 'object') return (
    <div style={{ marginBottom: '4px' }}>
      <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>{label}:</span>
      <pre style={{ fontSize: '0.72rem', margin: '2px 0', padding: '4px 6px', background: '#f3f4f6', borderRadius: '4px', overflow: 'auto' }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
  return (
    <div style={{ marginBottom: '4px' }}>
      <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>{label}: </span>
      <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{String(value)}</span>
    </div>
  );
}

// ─── Resource Detail Modal ────────────────────────────────────────────

function ResourceDetailModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const meta = (resource.metadata || {}) as Record<string, unknown>;
  const tags = resource.tags || {};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>{resource.name}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <ServiceBadge service={resource.service} />
              <StateBadge state={resource.state} />
              {resource.type && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{resource.type}</span>}
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#374151' }}>Info</h3>
          <MetadataValue label="Resource ID" value={resource.resourceId} />
          {resource.arn && <MetadataValue label="ARN" value={resource.arn} />}
          <MetadataValue label="State" value={resource.state} />
          {resource.estimatedMonthlyCost > 0 && (
            <MetadataValue label="Est. Monthly Cost" value={`$${resource.estimatedMonthlyCost.toFixed(2)}`} />
          )}
          <MetadataValue label="Last Seen" value={new Date(resource.lastSeenAt).toLocaleString()} />
        </div>
        {Object.keys(tags).length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#374151' }}>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.entries(tags).map(([k, v]) => (
                <span key={k} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', background: '#dcfce7', border: '1px solid #bbf7d0', fontFamily: 'monospace' }}>
                  {k}={v}
                </span>
              ))}
            </div>
          </div>
        )}
        {Object.keys(meta).length > 0 && (
          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '14px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#374151' }}>Details</h3>
            {Object.entries(meta).map(([key, val]) => <MetadataValue key={key} label={key} value={val} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Connect Form ─────────────────────────────────────────────────────

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [form, setForm] = useState({ roleArn: '', awsAccountId: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const ws = await api.createWorkspace({ roleArn: form.roleArn, awsAccountId: form.awsAccountId, name: form.name || undefined });
      try { await api.syncResources(ws.id); } catch { /* sync errors are non-fatal */ }
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>AWS</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Connect your AWS Account</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            Link your AWS account to visualize your entire infrastructure
          </p>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Account Name</label>
              <input type="text" placeholder="e.g. Production" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>IAM Role ARN *</label>
              <input type="text" required placeholder="arn:aws:iam::123456789012:role/FinOpsDashboardRole" value={form.roleArn} onChange={e => setForm({ ...form, roleArn: e.target.value })} />
            </div>
            <div className="form-group">
              <label>AWS Account ID *</label>
              <input type="text" required placeholder="123456789012" value={form.awsAccountId} onChange={e => setForm({ ...form, awsAccountId: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              {submitting ? 'Connecting...' : 'Connect Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; payload?: { fill?: string } }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.82rem' }}>
      {label && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>${p.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ color: '#6b7280', marginLeft: '4px' }}>/mo</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section: Overview Stats ──────────────────────────────────────────

function OverviewStats({ workspace, resourceCount, serviceCount, costs, recs }: {
  workspace: Workspace; resourceCount: number; serviceCount: number; costs: CostData | null;
  recs: RecommendationsResponse | null;
}) {
  const savings = recs?.summary.totalEstimatedSavings || 0;
  const monthlyCost = costs?.totalMonthly || 0;
  const savingsPercent = monthlyCost > 0 ? ((savings / monthlyCost) * 100).toFixed(1) : '0';

  return (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      <div className="stat-card-enhanced anim-delay-1" style={{ '--accent-gradient': 'linear-gradient(90deg, #4361ee, #6366f1)' } as React.CSSProperties}>
        <div className="stat-icon" style={{ '--icon-bg': '#eef2ff', '--icon-color': '#4361ee' } as React.CSSProperties}>
          ☁
        </div>
        <div className="stat-label">Account</div>
        <div className="stat-value" style={{ fontSize: '1.1rem' }}>{workspace.name}</div>
        <div className="stat-subtitle">{workspace.awsAccountId}</div>
      </div>

      <div className="stat-card-enhanced anim-delay-2" style={{ '--accent-gradient': 'linear-gradient(90deg, #1e40af, #3b82f6)' } as React.CSSProperties}>
        <div className="stat-icon" style={{ '--icon-bg': '#dbeafe', '--icon-color': '#1e40af' } as React.CSSProperties}>
          ⊞
        </div>
        <div className="stat-label">Resources</div>
        <div className="stat-value">{resourceCount}</div>
        <div className="stat-subtitle">monitored</div>
      </div>

      <div className="stat-card-enhanced anim-delay-3" style={{ '--accent-gradient': 'linear-gradient(90deg, #7c3aed, #a78bfa)' } as React.CSSProperties}>
        <div className="stat-icon" style={{ '--icon-bg': '#ede9fe', '--icon-color': '#7c3aed' } as React.CSSProperties}>
          ◈
        </div>
        <div className="stat-label">AWS Services</div>
        <div className="stat-value">{serviceCount}</div>
        <div className="stat-subtitle">active</div>
      </div>

      <div className="stat-card-enhanced anim-delay-4" style={{ '--accent-gradient': 'linear-gradient(90deg, #059669, #34d399)' } as React.CSSProperties}>
        <div className="stat-icon" style={{ '--icon-bg': '#ecfdf5', '--icon-color': '#059669' } as React.CSSProperties}>
          $
        </div>
        <div className="stat-label">Monthly Cost</div>
        <div className="stat-value" style={{ color: '#059669' }}>
          ${monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="stat-subtitle">USD estimated</div>
      </div>

      <div className="stat-card-enhanced anim-delay-5" style={{ '--accent-gradient': 'linear-gradient(90deg, #dc2626, #f87171)' } as React.CSSProperties}>
        <div className="stat-icon" style={{ '--icon-bg': '#fef2f2', '--icon-color': '#dc2626' } as React.CSSProperties}>
          ↓
        </div>
        <div className="stat-label">Potential Savings</div>
        <div className="stat-value" style={{ color: '#dc2626' }}>
          ${savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="stat-subtitle">{savingsPercent}% of total cost</div>
      </div>
    </div>
  );
}

// ─── Section: Cost Breakdown ──────────────────────────────────────────

function CostBreakdown({ costs }: { costs: CostData }) {
  const entries = Object.entries(costs.byService).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;

  const pieData = entries.map(([name, value], i) => ({
    name, value, fill: COST_COLORS[i % COST_COLORS.length],
  }));

  const barData = entries.slice(0, 8).map(([name, value], i) => ({
    name, cost: value, fill: COST_COLORS[i % COST_COLORS.length],
  }));

  return (
    <div className="dashboard-grid-2">
      <div className="chart-card">
        <h3>Cost Distribution</h3>
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Cost']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.82rem' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-center-label">
            <div className="chart-center-value">${costs.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="chart-center-text">Total/mo</div>
          </div>
        </div>
        <div className="cost-legend" style={{ marginTop: '0.5rem' }}>
          {entries.map(([svc, val], i) => (
            <div key={svc} className="cost-legend-item">
              <span className="cost-legend-dot" style={{ background: COST_COLORS[i % COST_COLORS.length] }} />
              <span>{svc}: ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <h3>Top Services by Cost</h3>
        <ResponsiveContainer width="100%" height={entries.length > 4 ? 320 : 240}>
          <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => `$${v.toLocaleString()}`} fontSize={11} tick={{ fill: '#6b7280' }} />
            <YAxis type="category" dataKey="name" width={80} fontSize={12} tick={{ fill: '#374151' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cost" radius={[0, 6, 6, 0]} barSize={20}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Section: Savings Banner ──────────────────────────────────────────

function SavingsBanner({ recs, onViewRecs }: { recs: RecommendationsResponse; onViewRecs: () => void }) {
  if (recs.summary.totalEstimatedSavings <= 0) return null;
  const monthly = recs.summary.totalEstimatedSavings;
  const annual = monthly * 12;

  return (
    <div className="savings-banner">
      <div className="savings-banner-content">
        <div style={{ fontSize: '0.78rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '4px' }}>
          Optimization Opportunity
        </div>
        <div className="savings-amount">
          ${monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
        </div>
        <div className="savings-detail">
          Up to ${annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr across {recs.summary.totalRecommendations} recommendations
        </div>
      </div>
      <button className="btn btn-primary" onClick={onViewRecs} style={{ background: '#059669', whiteSpace: 'nowrap' }}>
        View Recommendations
      </button>
    </div>
  );
}

// ─── Section: Resources Dashboard Header ──────────────────────────────

function ResourcesDashboardHeader({ resources, costs }: { resources: Resource[]; costs: CostData | null }) {
  // Health data
  const healthMap: Record<string, number> = {};
  resources.forEach(r => {
    const cat = ['running', 'active', 'available', 'in-use', 'Active', 'Ready', 'associated', 'connected'].includes(r.state) ? 'active'
      : ['stopped', 'terminated', 'disabled', 'inactive', 'error', 'unassociated'].includes(r.state) ? 'stopped'
      : ['pending', 'creating', 'Updating', 'Launching'].includes(r.state) ? 'pending'
      : 'other';
    healthMap[cat] = (healthMap[cat] || 0) + 1;
  });
  const healthData = Object.entries(healthMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: HEALTH_COLORS[name] || '#94a3b8',
  }));

  // Cost by service for bar chart
  const costEntries = costs
    ? Object.entries(costs.byService).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 6)
    : [];
  const costBarData = costEntries.map(([name, cost], i) => ({
    name, cost, fill: COST_COLORS[i % COST_COLORS.length],
  }));

  // Service cards
  const serviceMap: Record<string, { count: number; active: number; cost: number }> = {};
  resources.forEach(r => {
    if (!serviceMap[r.service]) serviceMap[r.service] = { count: 0, active: 0, cost: 0 };
    serviceMap[r.service].count++;
    if (['running', 'active', 'available', 'in-use', 'Active', 'Ready', 'associated', 'connected'].includes(r.state)) {
      serviceMap[r.service].active++;
    }
    serviceMap[r.service].cost += r.estimatedMonthlyCost || 0;
  });

  const serviceCards = SERVICE_ORDER
    .filter(svc => serviceMap[svc])
    .map(svc => ({ name: svc, ...serviceMap[svc] }));

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div className="dashboard-grid-2">
        <div className="chart-card">
          <h3>Resource Health</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                  {healthData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {healthData.map(h => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <span className={`health-dot ${h.name.toLowerCase()}`} />
                  <span style={{ color: '#374151', fontWeight: 500 }}>{h.name}</span>
                  <span style={{ color: '#6b7280' }}>({h.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {costBarData.length > 0 && (
          <div className="chart-card">
            <h3>Cost by Service</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={costBarData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `$${v.toLocaleString()}`} fontSize={11} tick={{ fill: '#6b7280' }} />
                <YAxis type="category" dataKey="name" width={70} fontSize={12} tick={{ fill: '#374151' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" radius={[0, 6, 6, 0]} barSize={16}>
                  {costBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {serviceCards.length > 0 && (
        <div className="service-cards-grid">
          {serviceCards.map((svc, i) => {
            const healthPct = svc.count > 0 ? (svc.active / svc.count) * 100 : 0;
            const color = SERVICE_COLORS[svc.name] || '#6b7280';
            return (
              <div key={svc.name} className="service-card" style={{ animationDelay: `${i * 0.04}s`, borderTop: `3px solid ${color}` }}>
                <div className="service-card-name">{SERVICE_LABELS[svc.name] || svc.name}</div>
                <div className="service-card-count">{svc.count}</div>
                {svc.cost > 0 && (
                  <div className="service-card-cost">${svc.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</div>
                )}
                <div className="service-card-health">
                  <div className="service-card-health-fill" style={{ width: `${healthPct}%` }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>{svc.active}/{svc.count} healthy</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section: Resources by Service ────────────────────────────────────

function ResourcesSection({ resources, total, onSelectResource, filters, onFilterChange, onLoadMore, costs }: {
  resources: Resource[];
  total: number;
  onSelectResource: (r: Resource) => void;
  filters: { service: string; q: string };
  onFilterChange: (f: { service: string; q: string }) => void;
  onLoadMore: () => void;
  costs: CostData | null;
}) {
  const grouped = resources.reduce<Record<string, Resource[]>>((acc, r) => {
    if (!acc[r.service]) acc[r.service] = [];
    acc[r.service].push(r);
    return acc;
  }, {});

  const sortedServices = Object.keys(grouped).sort(
    (a, b) => (SERVICE_ORDER.indexOf(a) === -1 ? 999 : SERVICE_ORDER.indexOf(a)) -
              (SERVICE_ORDER.indexOf(b) === -1 ? 999 : SERVICE_ORDER.indexOf(b))
  );

  const allServices = [...new Set(resources.map(r => r.service))].sort(
    (a, b) => (SERVICE_ORDER.indexOf(a) === -1 ? 999 : SERVICE_ORDER.indexOf(a)) -
              (SERVICE_ORDER.indexOf(b) === -1 ? 999 : SERVICE_ORDER.indexOf(b))
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggle(svc: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(svc) ? n.delete(svc) : n.add(svc); return n; });
  }

  function getKeyDetail(r: Resource): string {
    const meta = (r.metadata || {}) as Record<string, unknown>;
    switch (r.service) {
      case 'EC2': return [meta.privateIp && `IP: ${meta.privateIp}`, meta.vpcId && `VPC: ${meta.vpcId}`].filter(Boolean).join(' | ');
      case 'EBS': return [meta.sizeGiB && `${meta.sizeGiB} GiB`, meta.encrypted && 'Encrypted', meta.attachedTo && `-> ${meta.attachedTo}`].filter(Boolean).join(' | ');
      case 'S3': return [meta.objectCount && `${meta.objectCount} objs`, meta.sizeMB && `${meta.sizeMB} MB`, meta.region].filter(Boolean).join(' | ');
      case 'RDS': return [meta.engine && `${meta.engine} ${meta.engineVersion || ''}`, meta.allocatedStorageGiB && `${meta.allocatedStorageGiB} GiB`, meta.multiAZ && 'Multi-AZ'].filter(Boolean).join(' | ');
      case 'Lambda': return [meta.runtime, meta.memoryMB && `${meta.memoryMB} MB`].filter(Boolean).join(' | ');
      case 'ELB': return [meta.scheme, meta.dnsName].filter(Boolean).join(' | ');
      case 'VPC': {
        if (r.type === 'VPC') return meta.cidrBlock ? `CIDR: ${meta.cidrBlock}` : '';
        if (r.type === 'Subnet') return `${meta.cidrBlock || ''} (${meta.availabilityZone || ''})`;
        if (r.type === 'SecurityGroup') { const rules = meta.inboundRules as unknown[]; return rules ? `${rules.length} inbound rules` : ''; }
        if (r.type === 'ElasticIP') return `${meta.publicIp || ''}`;
        return '';
      }
      case 'ElasticBeanstalk': return [meta.health && `Health: ${meta.health}`, meta.solutionStack && String(meta.solutionStack).split(' ').slice(0, 3).join(' ')].filter(Boolean).join(' | ');
      case 'DynamoDB': return [meta.itemCount !== undefined && `${meta.itemCount} items`, meta.sizeMB && `${meta.sizeMB} MB`].filter(Boolean).join(' | ');
      case 'Route53': return meta.recordCount ? `${meta.recordCount} records` : '';
      case 'IAM': {
        if (r.type === 'User' && meta.passwordLastUsed) return `Last login: ${new Date(meta.passwordLastUsed as string).toLocaleDateString()}`;
        if (r.type === 'Policy' && meta.attachmentCount !== undefined) return `${meta.attachmentCount} attachments`;
        return '';
      }
      case 'CloudFormation': return meta.driftStatus ? `Drift: ${meta.driftStatus}` : '';
      case 'SQS': return meta.approximateMessages !== undefined ? `Messages: ${meta.approximateMessages}` : '';
      default: return '';
    }
  }

  return (
    <div>
      <ResourcesDashboardHeader resources={resources} costs={costs} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>All Resources ({total})</h2>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search resources..." value={filters.q}
            onChange={e => onFilterChange({ ...filters, q: e.target.value })}
            style={{ flex: 1, minWidth: '160px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }} />
          <select value={filters.service} onChange={e => onFilterChange({ ...filters, service: e.target.value })}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}>
            <option value="">All Services</option>
            {allServices.map(s => <option key={s} value={s}>{SERVICE_LABELS[s] || s}</option>)}
          </select>
        </div>
      </div>

      {/* Grouped cards */}
      {sortedServices.map(service => {
        const items = grouped[service];
        const isExpanded = expanded.has(service) || sortedServices.length <= 3;
        const color = SERVICE_COLORS[service] || '#6b7280';
        const displayItems = isExpanded ? items : items.slice(0, 5);
        const hasMore = items.length > 5 && !isExpanded;
        const maxCost = Math.max(...items.map(r => r.estimatedMonthlyCost || 0), 0.01);

        return (
          <div key={service} className="card" style={{ marginBottom: '10px', borderLeft: `4px solid ${color}`, overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', background: `${color}06` }}
              onClick={() => toggle(service)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ServiceBadge service={service} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{SERVICE_LABELS[service] || service}</span>
                <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>({items.length})</span>
              </div>
              <span style={{ color: '#9ca3af' }}>{isExpanded ? '▾' : '▸'}</span>
            </div>
            <div className="table-container">
              <table style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '14px' }}>Name</th>
                    <th>ID</th>
                    <th>Type</th>
                    <th>State</th>
                    <th>Cost/mo</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map(r => (
                    <tr key={r.id} className="table-row-interactive" onClick={() => onSelectResource(r)}>
                      <td style={{ paddingLeft: '14px', fontWeight: 500, fontSize: '0.85rem' }}>{r.name}</td>
                      <td><code style={{ fontSize: '0.72rem' }}>{r.resourceId}</code></td>
                      <td style={{ fontSize: '0.78rem' }}>{r.type}</td>
                      <td><StateBadge state={r.state} /></td>
                      <td>
                        {r.estimatedMonthlyCost > 0 ? (
                          <div className="cost-bar-inline">
                            <div className="cost-bar-inline-track">
                              <div className="cost-bar-inline-fill" style={{ width: `${(r.estimatedMonthlyCost / maxCost) * 100}%` }} />
                            </div>
                            <span className="cost-bar-inline-value">${r.estimatedMonthlyCost.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#d1d5db', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#4b5563', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getKeyDetail(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore && (
                <div style={{ textAlign: 'center', padding: '6px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem' }} onClick={() => toggle(service)}>
                  Show all {items.length}...
                </div>
              )}
            </div>
          </div>
        );
      })}

      {resources.length < total && (
        <div style={{ textAlign: 'center', padding: '12px' }}>
          <button className="btn btn-secondary" onClick={onLoadMore}>
            Load more ({resources.length} of {total})
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Section: Recommendations Tab ─────────────────────────────────────

function RecommendationsTab({ recs }: { recs: RecommendationsResponse | null }) {
  if (!recs || recs.recommendations.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        No recommendations yet. Run a sync to analyze your infrastructure.
      </div>
    );
  }

  const monthly = recs.summary.totalEstimatedSavings;

  // Savings by type
  const savingsByType: Record<string, number> = {};
  recs.recommendations.forEach(r => {
    const label = REC_TYPE_LABELS[r.type] || r.type;
    savingsByType[label] = (savingsByType[label] || 0) + r.estimatedMonthlySavings;
  });
  const savingsBarData = Object.entries(savingsByType)
    .sort(([, a], [, b]) => b - a)
    .map(([name, savings], i) => ({ name, savings, fill: COST_COLORS[i % COST_COLORS.length] }));

  // Top 3 opportunities
  const topOpps = [...recs.recommendations]
    .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
    .slice(0, 3);

  return (
    <div>
      {/* Stat cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="stat-card-enhanced anim-delay-1" style={{ '--accent-gradient': 'linear-gradient(90deg, #059669, #34d399)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#ecfdf5', '--icon-color': '#059669' } as React.CSSProperties}>$</div>
          <div className="stat-label">Potential Savings</div>
          <div className="stat-value savings">${monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-subtitle">per month</div>
        </div>
        <div className="stat-card-enhanced anim-delay-2" style={{ '--accent-gradient': 'linear-gradient(90deg, #1e40af, #3b82f6)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#dbeafe', '--icon-color': '#1e40af' } as React.CSSProperties}>●</div>
          <div className="stat-label">New</div>
          <div className="stat-value">{recs.summary.byStatus.new}</div>
          <div className="stat-subtitle">action needed</div>
        </div>
        <div className="stat-card-enhanced anim-delay-3" style={{ '--accent-gradient': 'linear-gradient(90deg, #92400e, #f59e0b)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#fef3c7', '--icon-color': '#92400e' } as React.CSSProperties}>✓</div>
          <div className="stat-label">Acknowledged</div>
          <div className="stat-value">{recs.summary.byStatus.acknowledged}</div>
          <div className="stat-subtitle">in progress</div>
        </div>
        <div className="stat-card-enhanced anim-delay-4" style={{ '--accent-gradient': 'linear-gradient(90deg, #6b7280, #9ca3af)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ '--icon-bg': '#f3f4f6', '--icon-color': '#6b7280' } as React.CSSProperties}>✕</div>
          <div className="stat-label">Dismissed</div>
          <div className="stat-value">{recs.summary.byStatus.dismissed}</div>
          <div className="stat-subtitle">skipped</div>
        </div>
      </div>

      {/* Charts + Top opportunities */}
      <div className="dashboard-grid-2">
        <div className="chart-card">
          <h3>Savings by Type</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, savingsBarData.length * 36)}>
            <BarChart data={savingsBarData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => `$${v.toLocaleString()}`} fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: '#374151' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="savings" radius={[0, 6, 6, 0]} barSize={18}>
                {savingsBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Top Opportunities</h3>
          {topOpps.map((r, i) => (
            <div key={r.id} className={`rec-highlight-card confidence-${r.confidence}`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="rec-type">{REC_TYPE_LABELS[r.type] || r.type}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="rec-savings">${r.estimatedMonthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</div>
                <span className={`badge badge-${r.confidence}`}>{r.confidence}</span>
              </div>
              <div className="rec-desc">{r.description}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                <code>{r.resourceId}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full table */}
      <div className="card">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>All Recommendations</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Resource</th>
                <th>Description</th>
                <th>Savings/mo</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recs.recommendations.map(r => (
                <tr key={r.id}>
                  <td><span className="badge badge-new" style={{ fontSize: '0.68rem' }}>{REC_TYPE_LABELS[r.type] || r.type.replace(/_/g, ' ')}</span></td>
                  <td><code style={{ fontSize: '0.72rem' }}>{r.resourceId}</code></td>
                  <td style={{ fontSize: '0.82rem', maxWidth: '320px' }}>{r.description}</td>
                  <td style={{ fontWeight: 600, color: '#059669' }}>${r.estimatedMonthlySavings.toFixed(2)}</td>
                  <td><span className={`badge badge-${r.confidence}`}>{r.confidence}</span></td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Recommendations Summary ─────────────────────────────────

function RecommendationsSummary({ recs }: { recs: RecommendationsResponse | null }) {
  if (!recs || recs.recommendations.length === 0) return null;
  const activeRecs = recs.recommendations.filter(r => r.status !== 'dismissed');
  if (activeRecs.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Active Recommendations</h2>
        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
          Potential savings: ${recs.summary.totalEstimatedSavings.toFixed(2)}/mo
        </span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Resource</th>
              <th>Description</th>
              <th>Savings</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activeRecs.slice(0, 5).map(r => (
              <tr key={r.id}>
                <td><span className="badge badge-new">{REC_TYPE_LABELS[r.type] || r.type.replace(/_/g, ' ')}</span></td>
                <td><code style={{ fontSize: '0.75rem' }}>{r.resourceId}</code></td>
                <td style={{ fontSize: '0.85rem', maxWidth: '300px' }}>{r.description}</td>
                <td style={{ fontWeight: 600, color: '#059669' }}>${r.estimatedMonthlySavings.toFixed(2)}</td>
                <td><span className={`badge badge-${r.confidence}`}>{r.confidence}</span></td>
                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ClientDashboard ─────────────────────────────────────────────

type ActiveTab = 'overview' | 'resources' | 'recommendations';

export default function ClientDashboard() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [tab, setTab] = useState<ActiveTab>('overview');

  // Data
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceTotal, setResourceTotal] = useState(0);
  const [resourcePage, setResourcePage] = useState(1);
  const [costs, setCosts] = useState<CostData | null>(null);
  const [recs, setRecs] = useState<RecommendationsResponse | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [filters, setFilters] = useState({ service: '', q: '' });

  const loadWorkspace = useCallback(async () => {
    try {
      const wsList = await api.listWorkspaces();
      if (wsList.length > 0) {
        setWorkspace(wsList[0]);
      } else {
        setWorkspace(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async (ws: Workspace, page: number, f: { service: string; q: string }, append = false) => {
    try {
      const [invRes, costRes, recRes] = await Promise.all([
        api.getInventory(ws.id, { page, perPage: 100, service: f.service || undefined, q: f.q || undefined }),
        api.getCosts(ws.id),
        api.getRecommendations(ws.id),
      ]);
      setResources(prev => append ? [...prev, ...invRes.items] : invRes.items);
      setResourceTotal(invRes.total);
      setCosts(costRes);
      setRecs(recRes);
    } catch (err) {
      console.error('Load error:', err);
    }
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  useEffect(() => {
    if (workspace) {
      setResourcePage(1);
      loadData(workspace, 1, filters);
    }
  }, [workspace, filters, loadData]);

  async function handleSync() {
    if (!workspace || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.syncResources(workspace.id);
      setSyncResult(result);
      setResourcePage(1);
      await loadData(workspace, 1, filters);
    } catch (err) {
      setSyncResult({ status: 'error', message: err instanceof Error ? err.message : 'Sync failed', total: 0, byService: {}, errors: [] });
    } finally {
      setSyncing(false);
    }
  }

  function handleLoadMore() {
    if (!workspace) return;
    const nextPage = resourcePage + 1;
    setResourcePage(nextPage);
    loadData(workspace, nextPage, filters, true);
  }

  // ── No workspace → show connect form
  if (loading) return <div className="loading">Loading...</div>;

  if (!workspace) {
    return <ConnectForm onConnected={loadWorkspace} />;
  }

  // ── Workspace connected → unified dashboard
  const serviceCount = [...new Set(resources.map(r => r.service))].length;

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{workspace.name}</h1>
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>AWS Account {workspace.awsAccountId}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <StateBadge state={workspace.status} />
          <button className="btn btn-primary" onClick={handleSync} disabled={syncing} style={{ minWidth: '100px' }}>
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Sync banner */}
      {syncResult && (
        <div className="card" style={{
          padding: '10px 14px', marginBottom: '14px',
          borderLeft: `4px solid ${syncResult.status === 'error' ? '#dc2626' : '#16a34a'}`,
          background: syncResult.status === 'error' ? '#fef2f2' : '#f0fdf4',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.85rem' }}>{syncResult.message}</strong>
            <button className="btn btn-sm btn-secondary" onClick={() => setSyncResult(null)}>x</button>
          </div>
          {syncResult.total > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {Object.entries(syncResult.byService).filter(([, c]) => c > 0).sort(([, a], [, b]) => b - a).map(([svc, count]) => (
                <span key={svc} style={{ padding: '1px 6px', borderRadius: '10px', fontSize: '0.68rem', background: '#e5e7eb', fontWeight: 600 }}>
                  {svc}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {([
          { key: 'overview' as ActiveTab, label: 'Overview' },
          { key: 'resources' as ActiveTab, label: `Resources (${resourceTotal})` },
          { key: 'recommendations' as ActiveTab, label: `Recommendations (${recs?.summary.totalRecommendations || 0})` },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`tab-btn ${tab === t.key ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <>
          <OverviewStats workspace={workspace} resourceCount={resourceTotal} serviceCount={serviceCount} costs={costs} recs={recs} />

          {recs && recs.summary.totalEstimatedSavings > 0 && (
            <SavingsBanner recs={recs} onViewRecs={() => setTab('recommendations')} />
          )}

          {costs && <CostBreakdown costs={costs} />}

          {resources.length > 0 && (
            <InfrastructureMap resources={resources} onSelectResource={setSelectedResource} />
          )}

          <RecommendationsSummary recs={recs} />

          {/* Quick resource summary */}
          {resources.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Resources by Service</h2>
                <button className="btn btn-sm btn-primary" onClick={() => setTab('resources')}>View All</button>
              </div>
              <div className="service-cards-grid">
                {SERVICE_ORDER.filter(svc => resources.some(r => r.service === svc)).map((svc, i) => {
                  const svcResources = resources.filter(r => r.service === svc);
                  const count = svcResources.length;
                  const activeCount = svcResources.filter(r =>
                    ['running', 'active', 'available', 'in-use', 'Active', 'Ready', 'associated', 'connected'].includes(r.state)
                  ).length;
                  const color = SERVICE_COLORS[svc] || '#6b7280';
                  const healthPct = count > 0 ? (activeCount / count) * 100 : 0;
                  return (
                    <div key={svc} className="service-card" style={{ animationDelay: `${i * 0.04}s`, borderTop: `3px solid ${color}`, cursor: 'pointer' }}
                      onClick={() => { setFilters({ ...filters, service: svc }); setTab('resources'); }}>
                      <div className="service-card-name">{SERVICE_LABELS[svc] || svc}</div>
                      <div className="service-card-count">{count}</div>
                      <div className="service-card-health">
                        <div className="service-card-health-fill" style={{ width: `${healthPct}%` }} />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>{activeCount}/{count} healthy</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Resources */}
      {tab === 'resources' && (
        <ResourcesSection
          resources={resources}
          total={resourceTotal}
          onSelectResource={setSelectedResource}
          filters={filters}
          onFilterChange={f => { setFilters(f); setResourcePage(1); }}
          onLoadMore={handleLoadMore}
          costs={costs}
        />
      )}

      {/* Tab: Recommendations */}
      {tab === 'recommendations' && (
        <RecommendationsTab recs={recs} />
      )}

      {/* Resource Detail Modal */}
      {selectedResource && <ResourceDetailModal resource={selectedResource} onClose={() => setSelectedResource(null)} />}
    </div>
  );
}

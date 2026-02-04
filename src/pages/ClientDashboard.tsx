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

const COST_COLORS = [
  '#4361ee', '#f72585', '#4cc9f0', '#f77f00', '#7209b7',
  '#3a86a8', '#06d6a0', '#e63946', '#457b9d', '#8338ec',
];

// ─── Micro-components ─────────────────────────────────────────────────

function StateBadge({ state }: { state: string }) {
  const color =
    ['running','active','available','in-use','Active','Ready','associated','connected'].includes(state) ? '#16a34a'
    : ['stopped','disabled','inactive','not-found','error','terminated'].includes(state) ? '#dc2626'
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
      // trigger initial sync
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

// ─── Section: Overview Stats ──────────────────────────────────────────

function OverviewStats({ workspace, resourceCount, serviceCount, costs }: {
  workspace: Workspace; resourceCount: number; serviceCount: number; costs: CostData | null;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
      <div className="card" style={{ padding: '16px', borderLeft: '4px solid #4361ee' }}>
        <div style={{ fontSize: '0.78rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>{workspace.name}</div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>{workspace.awsAccountId}</div>
      </div>
      <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e40af' }}>{resourceCount}</div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Resources</div>
      </div>
      <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>{serviceCount}</div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>AWS Services</div>
      </div>
      <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>
          ${costs ? costs.totalMonthly.toFixed(2) : '0.00'}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Monthly Cost (USD)</div>
      </div>
    </div>
  );
}

// ─── Section: Cost Breakdown ──────────────────────────────────────────

function CostBreakdown({ costs }: { costs: CostData }) {
  const entries = Object.entries(costs.byService).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Cost Breakdown by Service</h2>
      <div className="cost-bar">
        {entries.map(([svc, val], i) => (
          <div key={svc} className="cost-bar-segment" style={{ width: `${(val / total) * 100}%`, background: COST_COLORS[i % COST_COLORS.length] }}>
            {(val / total) > 0.08 ? svc.split(' ')[0] : ''}
          </div>
        ))}
      </div>
      <div className="cost-legend">
        {entries.map(([svc, val], i) => (
          <div key={svc} className="cost-legend-item">
            <span className="cost-legend-dot" style={{ background: COST_COLORS[i % COST_COLORS.length] }} />
            <span>{svc}: ${val.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Recommendations ─────────────────────────────────────────

function RecommendationsSection({ recs }: { recs: RecommendationsResponse | null }) {
  if (!recs || recs.recommendations.length === 0) return null;
  const activeRecs = recs.recommendations.filter(r => r.status !== 'dismissed');
  if (activeRecs.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Recommendations</h2>
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
            {activeRecs.slice(0, 10).map(r => (
              <tr key={r.id}>
                <td><span className="badge badge-new">{r.type.replace(/_/g, ' ')}</span></td>
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

// ─── Section: Resources by Service ────────────────────────────────────

function ResourcesSection({ resources, total, onSelectResource, filters, onFilterChange, onLoadMore }: {
  resources: Resource[];
  total: number;
  onSelectResource: (r: Resource) => void;
  filters: { service: string; q: string };
  onFilterChange: (f: { service: string; q: string }) => void;
  onLoadMore: () => void;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Infrastructure ({total} resources)</h2>
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
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onSelectResource(r)}>
                      <td style={{ paddingLeft: '14px', fontWeight: 500, fontSize: '0.85rem' }}>{r.name}</td>
                      <td><code style={{ fontSize: '0.72rem' }}>{r.resourceId}</code></td>
                      <td style={{ fontSize: '0.78rem' }}>{r.type}</td>
                      <td><StateBadge state={r.state} /></td>
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
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '0' }}>
        {([
          { key: 'overview' as ActiveTab, label: 'Overview' },
          { key: 'resources' as ActiveTab, label: `Resources (${resourceTotal})` },
          { key: 'recommendations' as ActiveTab, label: `Recommendations (${recs?.summary.totalRecommendations || 0})` },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', fontSize: '0.85rem', fontWeight: tab === t.key ? 700 : 500,
            border: 'none', background: 'none', cursor: 'pointer',
            borderBottom: tab === t.key ? '3px solid #4361ee' : '3px solid transparent',
            color: tab === t.key ? '#4361ee' : '#6b7280',
            marginBottom: '-2px',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <>
          <OverviewStats workspace={workspace} resourceCount={resourceTotal} serviceCount={serviceCount} costs={costs} />
          {costs && <CostBreakdown costs={costs} />}
          {resources.length > 0 && (
            <InfrastructureMap resources={resources} onSelectResource={setSelectedResource} />
          )}
          <RecommendationsSection recs={recs} />

          {/* Quick resource summary */}
          {resources.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Resources by Service</h2>
                <button className="btn btn-sm btn-primary" onClick={() => setTab('resources')}>View All</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {SERVICE_ORDER.filter(svc => resources.some(r => r.service === svc)).map(svc => {
                  const count = resources.filter(r => r.service === svc).length;
                  const color = SERVICE_COLORS[svc] || '#6b7280';
                  return (
                    <div key={svc} onClick={() => { setFilters({ ...filters, service: svc }); setTab('resources'); }}
                      style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${color}30`, background: `${color}08`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{count}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{SERVICE_LABELS[svc] || svc}</div>
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
        />
      )}

      {/* Tab: Recommendations */}
      {tab === 'recommendations' && (
        <div>
          {recs && recs.recommendations.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#059669' }}>${recs.summary.totalEstimatedSavings.toFixed(2)}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Potential Savings/mo</div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e40af' }}>{recs.summary.byStatus.new}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>New</div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#92400e' }}>{recs.summary.byStatus.acknowledged}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Acknowledged</div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#6b7280' }}>{recs.summary.byStatus.dismissed}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Dismissed</div>
                </div>
              </div>
              <div className="card">
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
                          <td><span className="badge badge-new" style={{ fontSize: '0.68rem' }}>{r.type.replace(/_/g, ' ')}</span></td>
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
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              No recommendations yet. Run a sync to analyze your infrastructure.
            </div>
          )}
        </div>
      )}

      {/* Resource Detail Modal */}
      {selectedResource && <ResourceDetailModal resource={selectedResource} onClose={() => setSelectedResource(null)} />}
    </div>
  );
}

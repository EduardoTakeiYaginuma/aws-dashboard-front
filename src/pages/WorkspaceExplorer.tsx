import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Resource, CostsSummary, SyncResult } from '../api';

const SERVICE_COLORS: Record<string, string> = {
  EC2: '#ff9900',
  EBS: '#d4a017',
  S3: '#3f8624',
  RDS: '#2e73b8',
  Lambda: '#c7511f',
  ELB: '#8c4fff',
  CloudFront: '#8c4fff',
  VPC: '#1b660f',
  AutoScaling: '#e25d10',
  ElasticBeanstalk: '#ff9900',
  DynamoDB: '#2e73b8',
  SNS: '#d63384',
  SQS: '#d63384',
  Route53: '#8c4fff',
  IAM: '#dd3522',
  CloudFormation: '#d63384',
};

const SERVICE_LABELS: Record<string, string> = {
  EC2: 'EC2 Instances',
  EBS: 'EBS Volumes',
  S3: 'S3 Buckets',
  RDS: 'RDS Databases',
  Lambda: 'Lambda Functions',
  ELB: 'Load Balancers',
  CloudFront: 'CloudFront Distributions',
  VPC: 'VPC & Networking',
  AutoScaling: 'Auto Scaling Groups',
  ElasticBeanstalk: 'Elastic Beanstalk',
  DynamoDB: 'DynamoDB Tables',
  SNS: 'SNS Topics',
  SQS: 'SQS Queues',
  Route53: 'Route 53 Hosted Zones',
  IAM: 'IAM (Roles, Users, Policies)',
  CloudFormation: 'CloudFormation Stacks',
};

function StateBadge({ state }: { state: string }) {
  const color =
    state === 'running' || state === 'active' || state === 'available' || state === 'in-use' || state === 'Active' || state === 'Ready' || state === 'associated'
      ? '#16a34a'
      : state === 'stopped' || state === 'disabled' || state === 'inactive' || state === 'not-found'
      ? '#dc2626'
      : state === 'pending' || state === 'creating' || state === 'Updating' || state === 'Launching'
      ? '#ca8a04'
      : '#6b7280';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: color + '18',
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {state}
    </span>
  );
}

function ServiceBadge({ service }: { service: string }) {
  const color = SERVICE_COLORS[service] || '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: color + '18',
        color,
        border: `1px solid ${color}40`,
        letterSpacing: '0.02em',
      }}
    >
      {service}
    </span>
  );
}

function MetadataValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'boolean') {
    return (
      <div style={{ marginBottom: '6px' }}>
        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{label}: </span>
        <span style={{ fontWeight: 500 }}>{value ? 'Yes' : 'No'}</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === 'string') {
      return (
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{label}: </span>
          <span style={{ fontWeight: 500 }}>{value.join(', ')}</span>
        </div>
      );
    }
    return (
      <div style={{ marginBottom: '6px' }}>
        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{label}:</span>
        <pre style={{ fontSize: '0.75rem', margin: '4px 0', padding: '6px', background: '#f3f4f6', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div style={{ marginBottom: '6px' }}>
        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{label}:</span>
        <pre style={{ fontSize: '0.75rem', margin: '4px 0', padding: '6px', background: '#f3f4f6', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '6px' }}>
      <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{label}: </span>
      <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{String(value)}</span>
    </div>
  );
}

function ResourceDetailPanel({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const meta = (resource.metadata || {}) as Record<string, unknown>;
  const tags = resource.tags || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>{resource.name}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <ServiceBadge service={resource.service} />
              <StateBadge state={resource.state} />
              {resource.type && (
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{resource.type}</span>
              )}
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ marginLeft: '16px' }}>
            Close
          </button>
        </div>

        {/* Basic Info */}
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#374151' }}>Resource Info</h3>
          <MetadataValue label="Resource ID" value={resource.resourceId} />
          {resource.arn && <MetadataValue label="ARN" value={resource.arn} />}
          <MetadataValue label="Service" value={resource.service} />
          <MetadataValue label="Type" value={resource.type} />
          <MetadataValue label="State" value={resource.state} />
          <MetadataValue label="Last Seen" value={new Date(resource.lastSeenAt).toLocaleString()} />
          {resource.estimatedMonthlyCost > 0 && (
            <MetadataValue label="Est. Monthly Cost" value={`$${resource.estimatedMonthlyCost.toFixed(2)}`} />
          )}
        </div>

        {/* Tags */}
        {Object.keys(tags).length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#374151' }}>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(tags).map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    fontFamily: 'monospace',
                  }}
                >
                  {k}={v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {Object.keys(meta).length > 0 && (
          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#374151' }}>Details</h3>
            {Object.entries(meta).map(([key, val]) => (
              <MetadataValue key={key} label={key} value={val} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type ViewMode = 'table' | 'grouped';

export default function WorkspaceExplorer() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const [resources, setResources] = useState<Resource[]>([]);
  const [costs, setCosts] = useState<CostsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(50);
  const [filters, setFilters] = useState({ service: '', tag: '', q: '' });
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  async function loadData() {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [inventoryRes, costsRes] = await Promise.all([
        api.getInventory(workspaceId, { page, perPage, ...filters }),
        api.getCostsSummary(workspaceId),
      ]);
      setResources(inventoryRes.items);
      setTotal(inventoryRes.total);
      setCosts(costsRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!workspaceId || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.syncResources(workspaceId);
      setSyncResult(result);
      await loadData();
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Sync failed',
        total: 0,
        byService: {},
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [workspaceId, page, filters]);

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  }

  function toggleService(service: string) {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  }

  // Group resources by service
  const grouped = resources.reduce<Record<string, Resource[]>>((acc, r) => {
    if (!acc[r.service]) acc[r.service] = [];
    acc[r.service].push(r);
    return acc;
  }, {});

  const serviceOrder = [
    'EC2', 'EBS', 'Lambda', 'ELB', 'AutoScaling', 'ElasticBeanstalk',
    'RDS', 'DynamoDB', 'S3', 'CloudFront',
    'VPC', 'Route53', 'SNS', 'SQS',
    'IAM', 'CloudFormation',
  ];
  const sortedServices = Object.keys(grouped).sort(
    (a, b) => (serviceOrder.indexOf(a) === -1 ? 999 : serviceOrder.indexOf(a)) -
              (serviceOrder.indexOf(b) === -1 ? 999 : serviceOrder.indexOf(b))
  );

  const allServices = costs?.byService.map(s => s.service) || sortedServices;
  const totalResources = total;
  const totalServices = allServices.length;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Infrastructure Explorer</h1>
          <p>Complete view of your AWS infrastructure</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={handleSync}
            disabled={syncing}
            style={{ minWidth: '120px' }}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div
          className="card"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderLeft: `4px solid ${syncResult.status === 'error' ? '#dc2626' : '#16a34a'}`,
            background: syncResult.status === 'error' ? '#fef2f2' : '#f0fdf4',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{syncResult.message}</strong>
              {syncResult.errors.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '4px' }}>
                  Warnings: {syncResult.errors.join('; ')}
                </div>
              )}
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => setSyncResult(null)}>Dismiss</button>
          </div>
          {syncResult.total > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {Object.entries(syncResult.byService)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([svc, count]) => (
                  <span key={svc} style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    background: '#e5e7eb',
                    fontWeight: 600,
                  }}>
                    {svc}: {count}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e40af' }}>{totalResources}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total Resources</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>{totalServices}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>AWS Services</div>
        </div>
        {costs && (
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>
              ${costs.total.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Est. Monthly Cost</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            name="q"
            placeholder="Search resources..."
            value={filters.q}
            onChange={handleFilterChange}
            style={{ flex: 1, minWidth: '180px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
          <select
            name="service"
            value={filters.service}
            onChange={handleFilterChange}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="">All Services</option>
            {serviceOrder
              .filter((s) => allServices.includes(s))
              .map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABELS[s] || s}
                </option>
              ))}
            {allServices
              .filter((s) => !serviceOrder.includes(s))
              .map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
          </select>
          <input
            type="text"
            name="tag"
            placeholder="Filter by tag (key:value)"
            value={filters.tag}
            onChange={handleFilterChange}
            style={{ minWidth: '160px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
            <button
              className={`btn btn-sm ${viewMode === 'grouped' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('grouped')}
              style={{ borderRadius: 0, borderRight: '1px solid #d1d5db' }}
            >
              Grouped
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('table')}
              style={{ borderRadius: 0 }}
            >
              Table
            </button>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={loadData}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '12px' }}>
            No resources found. Click "Sync Now" to collect your AWS infrastructure data.
          </p>
          <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Resources'}
          </button>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped View */
        <div>
          {sortedServices.map((service) => {
            const items = grouped[service];
            const isExpanded = expandedServices.has(service) || sortedServices.length <= 3;
            const color = SERVICE_COLORS[service] || '#6b7280';
            const displayItems = isExpanded ? items : items.slice(0, 5);
            const hasMore = items.length > 5 && !isExpanded;

            return (
              <div
                key={service}
                className="card"
                style={{
                  marginBottom: '12px',
                  borderLeft: `4px solid ${color}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: `${color}08`,
                  }}
                  onClick={() => toggleService(service)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ServiceBadge service={service} />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {SERVICE_LABELS[service] || service}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                      ({items.length} resource{items.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '1.2rem' }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </div>

                <div className="table-container" style={{ padding: '0' }}>
                  <table style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: '16px' }}>Name</th>
                        <th>Resource ID</th>
                        <th>Type</th>
                        <th>State</th>
                        <th>Key Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.map((r) => {
                        const meta = (r.metadata || {}) as Record<string, unknown>;
                        let keyDetail = '';
                        if (service === 'EC2') {
                          const parts = [];
                          if (meta.privateIp) parts.push(`IP: ${meta.privateIp}`);
                          if (meta.vpcId) parts.push(`VPC: ${meta.vpcId}`);
                          keyDetail = parts.join(' | ');
                        } else if (service === 'EBS') {
                          const parts = [];
                          if (meta.sizeGiB) parts.push(`${meta.sizeGiB} GiB`);
                          if (meta.encrypted) parts.push('Encrypted');
                          if (meta.attachedTo) parts.push(`-> ${meta.attachedTo}`);
                          keyDetail = parts.join(' | ');
                        } else if (service === 'S3') {
                          const parts = [];
                          if (meta.objectCount) parts.push(`${meta.objectCount} objects`);
                          if (meta.sizeMB) parts.push(`${meta.sizeMB} MB`);
                          if (meta.region) parts.push(meta.region as string);
                          keyDetail = parts.join(' | ');
                        } else if (service === 'RDS') {
                          const parts = [];
                          if (meta.engine) parts.push(`${meta.engine} ${meta.engineVersion || ''}`);
                          if (meta.allocatedStorageGiB) parts.push(`${meta.allocatedStorageGiB} GiB`);
                          if (meta.multiAZ) parts.push('Multi-AZ');
                          keyDetail = parts.join(' | ');
                        } else if (service === 'Lambda') {
                          const parts = [];
                          if (meta.runtime) parts.push(meta.runtime as string);
                          if (meta.memoryMB) parts.push(`${meta.memoryMB} MB`);
                          if (meta.codeSizeMB) parts.push(`Code: ${meta.codeSizeMB} MB`);
                          keyDetail = parts.join(' | ');
                        } else if (service === 'ELB') {
                          const parts = [];
                          if (meta.scheme) parts.push(meta.scheme as string);
                          if (meta.dnsName) parts.push(meta.dnsName as string);
                          keyDetail = parts.join(' | ');
                        } else if (service === 'VPC') {
                          if (r.type === 'VPC' && meta.cidrBlock) keyDetail = `CIDR: ${meta.cidrBlock}`;
                          else if (r.type === 'Subnet') keyDetail = `${meta.cidrBlock || ''} (${meta.availabilityZone || ''})`;
                          else if (r.type === 'SecurityGroup') {
                            const rules = meta.inboundRules as unknown[];
                            keyDetail = rules ? `${rules.length} inbound rules` : '';
                          }
                          else if (r.type === 'ElasticIP') keyDetail = `${meta.publicIp || ''}`;
                        } else if (service === 'ElasticBeanstalk') {
                          const parts = [];
                          if (meta.health) parts.push(`Health: ${meta.health}`);
                          if (meta.solutionStack) parts.push(String(meta.solutionStack).split(' ').slice(0, 3).join(' '));
                          keyDetail = parts.join(' | ');
                        } else if (service === 'DynamoDB') {
                          const parts = [];
                          if (meta.itemCount !== undefined) parts.push(`${meta.itemCount} items`);
                          if (meta.sizeMB) parts.push(`${meta.sizeMB} MB`);
                          keyDetail = parts.join(' | ');
                        } else if (service === 'Route53') {
                          if (meta.recordCount) keyDetail = `${meta.recordCount} records`;
                        } else if (service === 'IAM') {
                          if (r.type === 'User' && meta.passwordLastUsed) keyDetail = `Last login: ${new Date(meta.passwordLastUsed as string).toLocaleDateString()}`;
                          if (r.type === 'Policy' && meta.attachmentCount !== undefined) keyDetail = `${meta.attachmentCount} attachments`;
                        } else if (service === 'CloudFormation') {
                          if (meta.driftStatus) keyDetail = `Drift: ${meta.driftStatus}`;
                        } else if (service === 'SQS') {
                          if (meta.approximateMessages !== undefined) keyDetail = `Messages: ${meta.approximateMessages}`;
                        }

                        return (
                          <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedResource(r)}>
                            <td style={{ paddingLeft: '16px', fontWeight: 500 }}>{r.name}</td>
                            <td><code style={{ fontSize: '0.75rem' }}>{r.resourceId}</code></td>
                            <td style={{ fontSize: '0.8rem' }}>{r.type}</td>
                            <td><StateBadge state={r.state} /></td>
                            <td style={{ fontSize: '0.8rem', color: '#4b5563', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {keyDetail}
                            </td>
                            <td>
                              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedResource(r); }}>
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {hasMore && (
                    <div
                      style={{ textAlign: 'center', padding: '8px', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem' }}
                      onClick={() => toggleService(service)}
                    >
                      Show all {items.length} resources...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Name</th>
                  <th>Resource ID</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Est. $/mo</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedResource(r)}>
                    <td><ServiceBadge service={r.service} /></td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td><code style={{ fontSize: '0.75rem' }}>{r.resourceId}</code></td>
                    <td style={{ fontSize: '0.8rem' }}>{r.type}</td>
                    <td><StateBadge state={r.state} /></td>
                    <td>${(r.estimatedMonthlyCost || 0).toFixed(2)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(r.lastSeenAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedResource(r); }}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              Showing {(page - 1) * perPage + 1}--{Math.min(page * perPage, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={page * perPage >= total}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedResource && (
        <ResourceDetailPanel resource={selectedResource} onClose={() => setSelectedResource(null)} />
      )}
    </div>
  );
}

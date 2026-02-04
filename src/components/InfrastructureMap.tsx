import { useState, useMemo } from 'react';
import type { Resource } from '../api';

// ─── Service visual config ──────────────────────────────────────────

const SVC: Record<string, { label: string; color: string; gradient: string; icon?: string }> = {
  Route53:          { label: 'Route 53',         color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  CloudFront:       { label: 'CloudFront',       color: '#a78bfa', gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' },
  ELB:              { label: 'Load Balancer',    color: '#22c55e', gradient: 'linear-gradient(135deg, #4ade80, #22c55e)', icon: '/img/LoadBalanceIcon.png' },
  ElasticBeanstalk: { label: 'Elastic Beanstalk', color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', icon: '/img/ElasticBeanstalkIcon.png' },
  AutoScaling:      { label: 'Auto Scaling',     color: '#84cc16', gradient: 'linear-gradient(135deg, #a3e635, #84cc16)' },
  EC2:              { label: 'EC2',              color: '#f97316', gradient: 'linear-gradient(135deg, #fb923c, #f97316)' },
  Lambda:           { label: 'Lambda',           color: '#f97316', gradient: 'linear-gradient(135deg, #fb923c, #ea580c)' },
  RDS:              { label: 'RDS',              color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)', icon: '/img/RDSIcon.png' },
  DynamoDB:         { label: 'DynamoDB',         color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)' },
  S3:               { label: 'S3',               color: '#ef4444', gradient: 'linear-gradient(135deg, #f87171, #ef4444)', icon: '/img/S3Icon.png' },
  EBS:              { label: 'EBS',              color: '#eab308', gradient: 'linear-gradient(135deg, #facc15, #eab308)' },
  SNS:              { label: 'SNS',              color: '#ec4899', gradient: 'linear-gradient(135deg, #f472b6, #ec4899)' },
  SQS:              { label: 'SQS',              color: '#ec4899', gradient: 'linear-gradient(135deg, #f472b6, #db2777)' },
  VPC:              { label: 'VPC',              color: '#10b981', gradient: 'linear-gradient(135deg, #34d399, #10b981)' },
  IAM:              { label: 'IAM',              color: '#ef4444', gradient: 'linear-gradient(135deg, #f87171, #dc2626)' },
  CloudFormation:   { label: 'CloudFormation',   color: '#a855f7', gradient: 'linear-gradient(135deg, #c084fc, #a855f7)' },
  Amplify:          { label: 'Amplify',          color: '#f97316', gradient: 'linear-gradient(135deg, #fb923c, #f97316)', icon: '/img/AmplifyIcon.png' },
};

// Architecture tiers (top → bottom = user-facing → backend)
const TIER_DEFS = [
  { id: 'dns',     label: 'DNS / CDN',    services: ['Route53', 'CloudFront'] },
  { id: 'ingress', label: 'Ingress',       services: ['ELB'] },
  { id: 'compute', label: 'Compute',       services: ['ElasticBeanstalk', 'EC2', 'Lambda', 'AutoScaling'] },
  { id: 'data',    label: 'Data / Storage', services: ['RDS', 'DynamoDB', 'S3', 'EBS'] },
  { id: 'msg',     label: 'Messaging',     services: ['SNS', 'SQS'] },
];

const SUPPORT_SERVICES = ['VPC', 'IAM', 'CloudFormation'];

// Connections (from → to) with label describing the relationship
const EDGES: { from: string; to: string; label: string }[] = [
  { from: 'Route53', to: 'CloudFront', label: 'resolves' },
  { from: 'Route53', to: 'ELB', label: 'resolves' },
  { from: 'CloudFront', to: 'ELB', label: 'origin' },
  { from: 'CloudFront', to: 'S3', label: 'origin' },
  { from: 'ELB', to: 'ElasticBeanstalk', label: 'routes traffic' },
  { from: 'ELB', to: 'EC2', label: 'routes traffic' },
  { from: 'ELB', to: 'Lambda', label: 'invokes' },
  { from: 'ElasticBeanstalk', to: 'EC2', label: 'manages' },
  { from: 'ElasticBeanstalk', to: 'AutoScaling', label: 'manages' },
  { from: 'AutoScaling', to: 'EC2', label: 'scales' },
  { from: 'EC2', to: 'RDS', label: 'queries' },
  { from: 'EC2', to: 'DynamoDB', label: 'queries' },
  { from: 'EC2', to: 'S3', label: 'read/write' },
  { from: 'ElasticBeanstalk', to: 'RDS', label: 'queries' },
  { from: 'ElasticBeanstalk', to: 'S3', label: 'read/write' },
  { from: 'Lambda', to: 'DynamoDB', label: 'queries' },
  { from: 'Lambda', to: 'S3', label: 'read/write' },
  { from: 'Lambda', to: 'SQS', label: 'polls' },
  { from: 'Lambda', to: 'SNS', label: 'publishes' },
  { from: 'SNS', to: 'SQS', label: 'delivers' },
];

// ─── Helpers ────────────────────────────────────────────────────────

function stateInfo(state: string | null): { color: string; label: string } {
  const s = (state || '').toLowerCase();
  if (['running', 'active', 'available', 'in-use', 'ready', 'associated', 'update_complete'].includes(s))
    return { color: '#22c55e', label: 'active' };
  if (['stopped', 'error', 'terminated', 'failed'].includes(s))
    return { color: '#ef4444', label: 'stopped' };
  if (s === 'not-found')
    return { color: '#f59e0b', label: 'stale' };
  return { color: '#94a3b8', label: s || 'unknown' };
}

// ─── Node card ──────────────────────────────────────────────────────

function NodeCard({ service, resources, isConnected, hovered, onHover, onExpand }: {
  service: string;
  resources: Resource[];
  isConnected: boolean;
  hovered: boolean;
  onHover: (s: string | null) => void;
  onExpand: (s: string) => void;
}) {
  const cfg = SVC[service] || { label: service, color: '#64748b', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)' };
  const active = resources.filter(r => stateInfo(r.state).label === 'active').length;
  const total = resources.length;

  return (
    <div
      onMouseEnter={() => onHover(service)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onExpand(service)}
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 14,
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: `2px solid ${hovered || isConnected ? cfg.color : '#e2e8f0'}`,
        boxShadow: hovered
          ? `0 8px 30px ${cfg.color}30`
          : isConnected ? `0 4px 16px ${cfg.color}15` : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px) scale(1.02)' : 'none',
        minWidth: 155,
        maxWidth: 220,
        flex: '1 1 155px',
      }}
    >
      {/* Color accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: cfg.gradient, borderRadius: '14px 14px 0 0',
      }} />

      {/* Service name + icon + count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {cfg.icon && (
            <img
              src={cfg.icon}
              alt={cfg.label}
              style={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }}
            />
          )}
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
            {cfg.label}
          </span>
        </div>
        <span style={{
          background: cfg.gradient, color: '#fff', fontWeight: 800,
          fontSize: '0.72rem', padding: '2px 9px', borderRadius: 20,
          minWidth: 24, textAlign: 'center',
        }}>
          {total}
        </span>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', background: '#f1f5f9', marginBottom: 8 }}>
        {active > 0 && <div style={{ width: `${(active / total) * 100}%`, background: '#22c55e', borderRadius: 3 }} />}
      </div>

      {/* Resource names (top 2) */}
      <div style={{ display: 'grid', gap: 3 }}>
        {resources.slice(0, 2).map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#64748b' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: stateInfo(r.state).color, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {r.name || r.resourceId}
            </span>
          </div>
        ))}
        {total > 2 && <span style={{ fontSize: '0.63rem', color: '#94a3b8', textAlign: 'center' }}>+{total - 2} more</span>}
      </div>
    </div>
  );
}

// ─── Flow connector between tiers ───────────────────────────────────

function FlowConnector({ labels, highlight }: { labels: string[]; highlight: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '4px 0', gap: 2,
    }}>
      {/* Vertical line + arrow */}
      <svg width="24" height="28" viewBox="0 0 24 28">
        <line x1="12" y1="0" x2="12" y2="20"
          stroke={highlight ? '#64748b' : '#cbd5e1'} strokeWidth={highlight ? 2.5 : 2}
          strokeDasharray={highlight ? 'none' : '4 3'}
        />
        <polygon
          points="6,18 18,18 12,27"
          fill={highlight ? '#64748b' : '#cbd5e1'}
        />
      </svg>
      {/* Connection labels */}
      {labels.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {labels.map((l, i) => (
            <span key={i} style={{
              fontSize: '0.6rem', color: highlight ? '#475569' : '#94a3b8',
              fontStyle: 'italic', fontWeight: highlight ? 600 : 400,
              background: highlight ? '#e2e8f0' : 'transparent',
              padding: highlight ? '1px 6px' : '0',
              borderRadius: 6,
            }}>
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail panel (expand on click) ─────────────────────────────────

function DetailPanel({ service, resources, onSelect, onClose }: {
  service: string;
  resources: Resource[];
  onSelect: (r: Resource) => void;
  onClose: () => void;
}) {
  const cfg = SVC[service] || { label: service, color: '#64748b', gradient: '' };
  return (
    <div style={{
      background: '#fff', border: `1px solid ${cfg.color}30`,
      borderRadius: 14, padding: '16px 18px', marginTop: 12,
      boxShadow: `0 4px 20px ${cfg.color}10`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cfg.icon && (
            <img src={cfg.icon} alt={cfg.label} style={{ width: 44, height: 44, objectFit: 'contain' }} />
          )}
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: cfg.color }}>
            {cfg.label} — {resources.length} resource{resources.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8',
        }}>✕</button>
      </div>
      <div style={{ display: 'grid', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
        {resources.map(r => {
          const si = stateInfo(r.state);
          return (
            <div key={r.id} onClick={(e) => { e.stopPropagation(); onSelect(r); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'border-color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: si.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name || r.resourceId}
                </div>
                {r.type && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{r.type}</div>}
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: si.color + '15', color: si.color }}>
                {si.label}
              </span>
              {r.estimatedMonthlyCost > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>
                  ${r.estimatedMonthlyCost.toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Supporting service pill ────────────────────────────────────────

function SupportPill({ service, resources, isActive, onClick }: {
  service: string; resources: Resource[]; isActive: boolean; onClick: () => void;
}) {
  const cfg = SVC[service] || { label: service, color: '#64748b', gradient: '' };
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 10,
      background: isActive ? '#fff' : '#f8fafc',
      border: `1.5px solid ${isActive ? cfg.color : '#e2e8f0'}`,
      cursor: 'pointer', transition: 'all 0.15s',
      boxShadow: isActive ? `0 2px 10px ${cfg.color}20` : 'none',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
      <span style={{ fontWeight: 600, fontSize: '0.78rem', color: '#374151' }}>{cfg.label}</span>
      <span style={{ background: cfg.color + '15', color: cfg.color, fontWeight: 700, fontSize: '0.7rem', padding: '1px 7px', borderRadius: 10 }}>
        {resources.length}
      </span>
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export default function InfrastructureMap({ resources, onSelectResource }: {
  resources: Resource[];
  onSelectResource: (r: Resource) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { activeTiers, supportSvcs, byService, activeEdges } = useMemo(() => {
    const byService: Record<string, Resource[]> = {};
    for (const r of resources) {
      if (!byService[r.service]) byService[r.service] = [];
      byService[r.service].push(r);
    }

    // Clean ELB
    if (byService['ELB']) {
      const lbs = byService['ELB'].filter(r => r.type !== 'TargetGroup');
      if (lbs.length > 0) byService['ELB'] = lbs;
      else delete byService['ELB'];
    }

    const has = (s: string) => (byService[s]?.length || 0) > 0;

    // Build active tiers
    const activeTiers = TIER_DEFS
      .map(t => ({ ...t, activeServices: t.services.filter(has) }))
      .filter(t => t.activeServices.length > 0);

    // Support services
    const supportSvcs = SUPPORT_SERVICES.filter(has);

    // Active edges
    const activeEdges = EDGES.filter(e => has(e.from) && has(e.to));

    return { activeTiers, supportSvcs, byService, activeEdges };
  }, [resources]);

  if (activeTiers.length === 0 && supportSvcs.length === 0) return null;

  // Hover: highlight connected services
  const connectedTo = new Set<string>();
  if (hovered) {
    connectedTo.add(hovered);
    for (const e of activeEdges) {
      if (e.from === hovered) connectedTo.add(e.to);
      if (e.to === hovered) connectedTo.add(e.from);
    }
  }

  // Get connection labels between two tiers
  function getFlowLabels(fromTier: string[], toTier: string[]): string[] {
    const labels = activeEdges
      .filter(e => fromTier.includes(e.from) && toTier.includes(e.to))
      .map(e => e.label);
    return [...new Set(labels)];
  }

  // Are any services in a connector highlighted?
  function isConnectorHighlighted(fromTier: string[], toTier: string[]): boolean {
    if (!hovered) return false;
    return activeEdges.some(e =>
      (fromTier.includes(e.from) && toTier.includes(e.to)) &&
      (e.from === hovered || e.to === hovered)
    );
  }

  const toggleExpand = (svc: string) => setExpanded(expanded === svc ? null : svc);

  return (
    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Infrastructure Map</h2>
        <div style={{ display: 'flex', gap: 14, fontSize: '0.7rem', color: '#94a3b8' }}>
          {[
            { c: '#22c55e', l: 'Active' },
            { c: '#f59e0b', l: 'Stale' },
            { c: '#ef4444', l: 'Stopped' },
          ].map(s => (
            <span key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.c }} />
              {s.l}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ TIERED FLOW ═══ */}
      <div style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0',
      }}>
        {activeTiers.map((tier, ti) => (
          <div key={tier.id}>
            {/* Tier label */}
            <div style={{
              fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.8px', color: '#94a3b8', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 18, height: 1, background: '#cbd5e1' }} />
              {tier.label}
              <span style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
            </div>

            {/* Service cards in this tier */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 12,
              justifyContent: 'center',
            }}>
              {tier.activeServices.map(svc => (
                <NodeCard
                  key={svc}
                  service={svc}
                  resources={byService[svc]}
                  isConnected={connectedTo.has(svc)}
                  hovered={hovered === svc}
                  onHover={setHovered}
                  onExpand={toggleExpand}
                />
              ))}
            </div>

            {/* Expanded detail panel */}
            {expanded && tier.activeServices.includes(expanded) && (
              <DetailPanel
                service={expanded}
                resources={byService[expanded]}
                onSelect={onSelectResource}
                onClose={() => setExpanded(null)}
              />
            )}

            {/* Flow connector to next tier */}
            {ti < activeTiers.length - 1 && (
              <FlowConnector
                labels={getFlowLabels(tier.activeServices, activeTiers[ti + 1].activeServices)}
                highlight={isConnectorHighlighted(tier.activeServices, activeTiers[ti + 1].activeServices)}
              />
            )}
          </div>
        ))}
      </div>

      {/* ═══ SUPPORTING INFRASTRUCTURE ═══ */}
      {supportSvcs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 18, height: 1, background: '#cbd5e1' }} />
            Supporting Infrastructure
            <span style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {supportSvcs.map(svc => (
              <SupportPill
                key={svc}
                service={svc}
                resources={byService[svc]}
                isActive={expanded === svc}
                onClick={() => toggleExpand(svc)}
              />
            ))}
          </div>
          {expanded && supportSvcs.includes(expanded) && (
            <DetailPanel
              service={expanded}
              resources={byService[expanded]}
              onSelect={onSelectResource}
              onClose={() => setExpanded(null)}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center', marginTop: 16, paddingTop: 12,
        borderTop: '1px solid #f0f0f0', fontSize: '0.7rem', color: '#94a3b8',
      }}>
        Hover to see connections. Click to expand details.
      </div>
    </div>
  );
}

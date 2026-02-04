import { useState, useMemo } from 'react';
import type { Resource } from '../api';

// ─── Block visual config ────────────────────────────────────────────

const BW = 164;
const BH = 48;

const PALETTE: Record<string, { bg: string; shelf: string; label: string }> = {
  Route53:          { bg: '#7c3aed', shelf: '#5b21b6', label: 'Route 53' },
  CloudFront:       { bg: '#8b5cf6', shelf: '#6d28d9', label: 'CloudFront' },
  ELB:              { bg: '#4ade80', shelf: '#16a34a', label: 'Load Balancer' },
  ElasticBeanstalk: { bg: '#f59e0b', shelf: '#b45309', label: 'Elastic Beanstalk' },
  AutoScaling:      { bg: '#84cc16', shelf: '#4d7c0f', label: 'Auto Scaling' },
  EC2:              { bg: '#fb923c', shelf: '#c2410c', label: 'EC2' },
  Lambda:           { bg: '#fb923c', shelf: '#c2410c', label: 'Lambda' },
  RDS:              { bg: '#3b82f6', shelf: '#1d4ed8', label: 'RDS' },
  DynamoDB:         { bg: '#3b82f6', shelf: '#1d4ed8', label: 'DynamoDB' },
  S3:               { bg: '#ef4444', shelf: '#b91c1c', label: 'S3' },
  EBS:              { bg: '#eab308', shelf: '#a16207', label: 'EBS' },
  SNS:              { bg: '#ec4899', shelf: '#be185d', label: 'SNS' },
  SQS:              { bg: '#ec4899', shelf: '#be185d', label: 'SQS' },
  Subnet:           { bg: '#4ade80', shelf: '#16a34a', label: 'Subnet' },
};

// Architecture tiers
const TIER_ENTRY   = ['Route53', 'CloudFront'];
const TIER_INGRESS = ['ELB'];
const TIER_COMPUTE = ['ElasticBeanstalk', 'EC2', 'Lambda', 'AutoScaling'];
const TIER_DATA    = ['S3', 'RDS', 'DynamoDB'];

// Flow connections
const FLOWS: [string, string][] = [
  ['Route53', 'CloudFront'],
  ['Route53', 'ELB'],
  ['CloudFront', 'ELB'],
  ['CloudFront', 'S3'],
  ['ELB', 'ElasticBeanstalk'],
  ['ELB', 'EC2'],
  ['ELB', 'Lambda'],
  ['ElasticBeanstalk', 'S3'],
  ['ElasticBeanstalk', 'RDS'],
  ['ElasticBeanstalk', 'DynamoDB'],
  ['EC2', 'RDS'],
  ['EC2', 'DynamoDB'],
  ['EC2', 'S3'],
  ['Lambda', 'DynamoDB'],
  ['Lambda', 'S3'],
];

// ─── Layout engine ──────────────────────────────────────────────────

const VB_W = 880;
const VB_H = 480;
const CX = VB_W / 2;
const TIER_GAP = 110;

interface BlockInfo {
  id: string;
  x: number; // top-left x
  y: number; // top-left y
  label: string;
  bg: string;
  shelf: string;
  resources: Resource[];
  small?: boolean;
}

function buildLayout(byService: Record<string, Resource[]>) {
  const has = (s: string) => (byService[s]?.length || 0) > 0;

  // If EB exists, it absorbs EC2 and AutoScaling visually
  const ebMode = has('ElasticBeanstalk');

  const blocks: BlockInfo[] = [];
  const arrows: [string, string][] = [];

  // ── Tier 0: Entry (y=20) ──
  const t0: string[] = TIER_ENTRY.filter(has);
  const y0 = 20;

  // ── Tier 1: Ingress (y=y0 + gap) ──
  const t1: string[] = TIER_INGRESS.filter(has);
  const y1 = y0 + TIER_GAP;

  // ── Tier 2: Compute ──
  const t2: string[] = ebMode
    ? ['ElasticBeanstalk', ...(has('Lambda') ? ['Lambda'] : [])]
    : TIER_COMPUTE.filter(s => has(s) && s !== 'AutoScaling');
  const y2 = y1 + TIER_GAP;

  // ── Tier 3: Data ──
  const t3base: string[] = TIER_DATA.filter(has);
  const y3 = y2 + TIER_GAP;

  // Extract named subnets
  const subnets = (byService['VPC'] || [])
    .filter(r => r.type === 'Subnet' && r.name && !r.name.includes('default'))
    .slice(0, 2);

  // Data row: S3 on left, subnets center, RDS/DynamoDB on right
  // Build data row items
  const dataLeft: string[] = [];
  const dataRight: string[] = [];
  if (has('S3')) dataLeft.push('S3');
  if (has('RDS')) dataRight.push('RDS');
  if (has('DynamoDB')) dataRight.push('DynamoDB');

  // Helper: center a list of service blocks in a row
  function placeRow(services: string[], y: number, gap = 40) {
    const n = services.length;
    if (n === 0) return;
    const totalW = n * BW + (n - 1) * gap;
    const startX = CX - totalW / 2;
    for (let i = 0; i < n; i++) {
      const svc = services[i];
      const p = PALETTE[svc];
      if (!p) continue;
      blocks.push({
        id: svc,
        x: startX + i * (BW + gap),
        y,
        label: p.label,
        bg: p.bg,
        shelf: p.shelf,
        resources: byService[svc] || [],
      });
    }
  }

  placeRow(t0, y0);
  placeRow(t1, y1);
  placeRow(t2, y2);

  // Data row: spread S3...subnets...RDS across the width
  {
    type DataItem = { id: string; label: string; bg: string; shelf: string; resources: Resource[]; small?: boolean };
    const items: DataItem[] = [];

    if (has('S3')) {
      const p = PALETTE['S3'];
      items.push({ id: 'S3', label: p.label, bg: p.bg, shelf: p.shelf, resources: byService['S3'] });
    }

    for (const sub of subnets) {
      items.push({
        id: `Subnet-${sub.resourceId}`,
        label: sub.name || 'Subnet',
        bg: PALETTE['Subnet'].bg,
        shelf: PALETTE['Subnet'].shelf,
        resources: [sub],
        small: true,
      });
    }

    if (has('RDS')) {
      const p = PALETTE['RDS'];
      items.push({ id: 'RDS', label: p.label, bg: p.bg, shelf: p.shelf, resources: byService['RDS'] });
    }
    if (has('DynamoDB')) {
      const p = PALETTE['DynamoDB'];
      items.push({ id: 'DynamoDB', label: p.label, bg: p.bg, shelf: p.shelf, resources: byService['DynamoDB'] });
    }

    const n = items.length;
    if (n > 0) {
      const gap = 30;
      const itemWidths = items.map(it => it.small ? 120 : BW);
      const totalW = itemWidths.reduce((a, b) => a + b, 0) + (n - 1) * gap;
      let cx = CX - totalW / 2;
      for (let i = 0; i < n; i++) {
        const w = itemWidths[i];
        blocks.push({
          id: items[i].id,
          x: cx,
          y: y3,
          label: items[i].label,
          bg: items[i].bg,
          shelf: items[i].shelf,
          resources: items[i].resources,
          small: items[i].small,
        });
        cx += w + gap;
      }
    }
  }

  // Build arrows: only between services that both exist as blocks
  const blockIds = new Set(blocks.map(b => b.id));
  for (const [from, to] of FLOWS) {
    if (blockIds.has(from) && blockIds.has(to)) {
      arrows.push([from, to]);
    }
  }

  // Add arrows from compute to subnets
  const computeBlock = t2[0]; // main compute (EB or EC2)
  if (computeBlock && blockIds.has(computeBlock)) {
    for (const sub of subnets) {
      const subId = `Subnet-${sub.resourceId}`;
      if (blockIds.has(subId)) {
        arrows.push([computeBlock, subId]);
      }
    }
  }

  // VPC boundary: arc encompassing ingress → data
  const innerBlocks = blocks.filter(b =>
    !TIER_ENTRY.includes(b.id) && b.id !== 'S3'
  );
  let vpcPath = '';
  let vpcLabelPos = { x: CX, y: y1 - 30 };
  if (innerBlocks.length > 0) {
    const minX = Math.min(...innerBlocks.map(b => b.x)) - 30;
    const maxX = Math.max(...innerBlocks.map(b => b.x + (b.small ? 120 : BW))) + 30;
    const topY = Math.min(...innerBlocks.map(b => b.y)) - 30;
    const botY = Math.max(...innerBlocks.map(b => b.y + BH)) + 25;
    // Dome arc
    vpcPath = `M ${minX},${botY} C ${minX},${topY - 40} ${maxX},${topY - 40} ${maxX},${botY}`;
    vpcLabelPos = { x: (minX + maxX) / 2 + (maxX - minX) * 0.35, y: topY - 15 };
  }

  // VPC name
  const vpcRes = (byService['VPC'] || []).find(r => r.type === 'VPC' && r.name && !r.name.startsWith('vpc-'));
  const vpcName = vpcRes ? vpcRes.name?.trim() || 'VPC' : 'VPC';

  return { blocks, arrows, vpcPath, vpcLabelPos, vpcName };
}

// ─── SVG Block component ────────────────────────────────────────────

function Block({ block, isHovered, onHover, onClick }: {
  block: BlockInfo;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
}) {
  const w = block.small ? 120 : BW;
  const h = block.small ? 38 : BH;
  const fontSize = block.small ? 11 : 14;
  const label = block.small
    ? (block.label.length > 16 ? block.label.slice(0, 14) + '..' : block.label)
    : block.label;

  return (
    <g
      transform={`translate(${block.x}, ${block.y})`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(block.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* 3D shelf shadow */}
      <rect x={6} y={h - 2} width={w - 12} height={10} rx={5} fill={block.shelf} />

      {/* Main block */}
      <rect
        width={w} height={h} rx={8}
        fill={block.bg}
        stroke={isHovered ? '#fff' : 'none'}
        strokeWidth={isHovered ? 3 : 0}
        filter={isHovered ? 'url(#glow)' : undefined}
      />

      {/* Label */}
      <text
        x={w / 2} y={h / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill="#fff" fontWeight={700} fontSize={fontSize}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        {label}
      </text>

      {/* Resource count badge */}
      {block.resources.length > 1 && (
        <>
          <circle cx={w - 4} cy={4} r={10} fill="#fff" opacity={0.9} />
          <text x={w - 4} y={5} textAnchor="middle" dominantBaseline="middle"
            fill={block.bg} fontWeight={800} fontSize={10}
            fontFamily="system-ui">
            {block.resources.length}
          </text>
        </>
      )}
    </g>
  );
}

// ─── Arrow path ─────────────────────────────────────────────────────

function ArrowPath({ from, to, blocks }: { from: string; to: string; blocks: BlockInfo[] }) {
  const fb = blocks.find(b => b.id === from);
  const tb = blocks.find(b => b.id === to);
  if (!fb || !tb) return null;

  const fw = fb.small ? 120 : BW;
  const tw = tb.small ? 120 : BW;
  const fh = fb.small ? 38 : BH;

  const x1 = fb.x + fw / 2;
  const y1 = fb.y + fh;
  const x2 = tb.x + tw / 2;
  const y2 = tb.y;

  const dy = y2 - y1;
  const midY = y1 + dy * 0.5;

  const d = Math.abs(x2 - x1) < 5
    ? `M ${x1} ${y1} L ${x2} ${y2}`
    : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  return (
    <path d={d} fill="none" stroke="#374151" strokeWidth={2} markerEnd="url(#arrowhead)" opacity={0.7} />
  );
}

// ─── Tooltip via foreignObject ──────────────────────────────────────

function Tooltip({ block }: { block: BlockInfo }) {
  const w = block.small ? 120 : BW;
  const tx = Math.min(block.x + w / 2 - 120, VB_W - 260);
  const ty = block.y - 8;

  function stateDot(state: string | null) {
    const s = (state || '').toLowerCase();
    if (['running', 'active', 'available', 'in-use', 'ready', 'associated', 'update_complete'].includes(s)) return '#16a34a';
    if (['stopped', 'error', 'terminated'].includes(s)) return '#dc2626';
    if (s === 'not-found') return '#f59e0b';
    return '#6b7280';
  }

  return (
    <foreignObject x={Math.max(10, tx)} y={ty} width={250} height={200}
      style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
        fontSize: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transform: 'translateY(-100%)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: block.bg }}>
          {block.label}
        </div>
        {block.resources.slice(0, 5).map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: stateDot(r.state), flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1a2e', fontWeight: 500 }}>
              {r.name || r.resourceId}
            </span>
            {r.type && <span style={{ color: '#9ca3af', fontSize: 10 }}>{r.type}</span>}
          </div>
        ))}
        {block.resources.length > 5 && (
          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
            +{block.resources.length - 5} more
          </div>
        )}
        {block.resources.some(r => r.estimatedMonthlyCost > 0) && (
          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 6, paddingTop: 6, fontWeight: 600, color: '#059669' }}>
            Est. ${block.resources.reduce((sum, r) => sum + (r.estimatedMonthlyCost || 0), 0).toFixed(2)}/mo
          </div>
        )}
      </div>
    </foreignObject>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export default function InfrastructureMap({ resources, onSelectResource }: {
  resources: Resource[];
  onSelectResource: (r: Resource) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const byService = useMemo(() => {
    const map: Record<string, Resource[]> = {};
    for (const r of resources) {
      if (!map[r.service]) map[r.service] = [];
      map[r.service].push(r);
    }
    // Clean ELB: remove TargetGroups
    if (map['ELB']) {
      const lbs = map['ELB'].filter(r => r.type !== 'TargetGroup');
      if (lbs.length > 0) map['ELB'] = lbs;
    }
    return map;
  }, [resources]);

  const { blocks, arrows, vpcPath, vpcLabelPos, vpcName } = useMemo(
    () => buildLayout(byService), [byService]
  );

  if (blocks.length === 0) return null;

  const hoveredBlock = blocks.find(b => b.id === hovered);

  return (
    <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>Infrastructure Map</h2>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          style={{ maxHeight: 520, display: 'block' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
            </marker>
            <filter id="glow">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fff" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* VPC dashed boundary */}
          {vpcPath && (
            <>
              <path
                d={vpcPath}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={2.5}
                strokeDasharray="12 7"
                opacity={0.5}
              />
              <text
                x={vpcLabelPos.x}
                y={vpcLabelPos.y}
                textAnchor="middle"
                fill="#9ca3af"
                fontWeight={700}
                fontSize={15}
                fontFamily="system-ui"
                opacity={0.7}
              >
                {vpcName}
              </text>
            </>
          )}

          {/* Arrows */}
          {arrows.map(([from, to], i) => (
            <ArrowPath key={i} from={from} to={to} blocks={blocks} />
          ))}

          {/* Blocks */}
          {blocks.map(block => (
            <Block
              key={block.id}
              block={block}
              isHovered={hovered === block.id}
              onHover={setHovered}
              onClick={() => {
                if (block.resources.length > 0) onSelectResource(block.resources[0]);
              }}
            />
          ))}

          {/* Tooltip */}
          {hoveredBlock && <Tooltip block={hoveredBlock} />}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16,
        marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0f0f0',
        fontSize: '0.72rem', color: '#9ca3af',
      }}>
        {[
          { c: '#16a34a', l: 'Active' },
          { c: '#f59e0b', l: 'Stale' },
          { c: '#dc2626', l: 'Stopped' },
        ].map(s => (
          <span key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.c, display: 'inline-block' }} />
            {s.l}
          </span>
        ))}
        <span style={{ marginLeft: 8, fontStyle: 'italic' }}>Hover for details, click to inspect</span>
      </div>
    </div>
  );
}

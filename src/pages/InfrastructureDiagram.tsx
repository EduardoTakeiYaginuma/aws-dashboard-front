import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface EC2Instance {
  instanceId: string;
  instanceType: string;
  state: string;
  tags: Record<string, string>;
  platform: string;
}

interface EBSVolume {
  volumeId: string;
  size: number;
  volumeType: string;
  state: string;
  attachments: { instanceId: string; state: string }[];
}

interface S3Bucket {
  bucketName: string;
  region: string;
  sizeBytes: number;
  objectCount: number;
  storageClass: string;
}

interface RDSInstance {
  dbInstanceId: string;
  dbInstanceClass: string;
  engine: string;
  status: string;
  allocatedStorage: number;
  multiAZ: boolean;
}

interface ResourcesData {
  ec2: EC2Instance[];
  ebs: EBSVolume[];
  s3: S3Bucket[];
  rds: RDSInstance[];
}

const AUTH_TOKEN = 'dev-token';

const COLORS = {
  ec2: { bg: '#fff7ed', border: '#f97316', icon: '#ea580c' },
  ebs: { bg: '#fef3c7', border: '#f59e0b', icon: '#d97706' },
  s3: { bg: '#ecfdf5', border: '#10b981', icon: '#059669' },
  rds: { bg: '#eff6ff', border: '#3b82f6', icon: '#2563eb' },
  elb: { bg: '#f5f3ff', border: '#8b5cf6', icon: '#7c3aed' },
  orphan: { bg: '#fef2f2', border: '#ef4444', icon: '#dc2626' },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function ResourceCard({
  type,
  title,
  subtitle,
  details,
  status,
  warning,
}: {
  type: keyof typeof COLORS;
  title: string;
  subtitle: string;
  details: string[];
  status?: string;
  warning?: boolean;
}) {
  const color = warning ? COLORS.orphan : COLORS[type];
  return (
    <div
      style={{
        background: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        minWidth: 220,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            background: color.border,
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {type.toUpperCase()}
        </span>
        {status && (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color:
                status === 'running' || status === 'available' || status === 'in-use'
                  ? '#059669'
                  : status === 'stopped'
                  ? '#6b7280'
                  : '#dc2626',
            }}
          >
            {status}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: 2 }}>
        {title}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 6 }}>{subtitle}</div>
      {details.map((d, i) => (
        <div key={i} style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          {d}
        </div>
      ))}
      {warning && (
        <div
          style={{
            marginTop: 8,
            fontSize: '0.7rem',
            color: '#dc2626',
            fontWeight: 600,
          }}
        >
          Not attached - potential waste
        </div>
      )}
    </div>
  );
}

function ConnectionLine({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 0',
      }}
    >
      <div
        style={{
          width: 2,
          height: 24,
          background: '#d1d5db',
          position: 'relative',
        }}
      >
        {label && (
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: 4,
              fontSize: '0.65rem',
              color: '#9ca3af',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export default function InfrastructureDiagram() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspaces/${id}/resources`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed: ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Building infrastructure diagram...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return null;

  // Build relationships: EBS -> EC2
  const ebsByInstance = new Map<string, EBSVolume[]>();
  const orphanedEbs: EBSVolume[] = [];
  for (const vol of data.ebs) {
    if (vol.attachments.length > 0) {
      for (const att of vol.attachments) {
        const existing = ebsByInstance.get(att.instanceId) || [];
        existing.push(vol);
        ebsByInstance.set(att.instanceId, existing);
      }
    } else {
      orphanedEbs.push(vol);
    }
  }

  const totalResources = data.ec2.length + data.ebs.length + data.s3.length + data.rds.length;

  return (
    <div>
      <div className="page-header">
        <h1>Infrastructure Map</h1>
        <p>{totalResources} resources across your AWS account</p>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {Object.entries(COLORS)
          .filter(([k]) => k !== 'orphan')
          .map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: val.bg,
                  border: `2px solid ${val.border}`,
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>
                {key}
              </span>
            </div>
          ))}
      </div>

      {/* Compute & Storage Section */}
      {data.ec2.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16, fontSize: '0.95rem' }}>Compute & Storage</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {data.ec2.map((inst) => {
              const attachedVolumes = ebsByInstance.get(inst.instanceId) || [];
              const name = inst.tags['Name'] || inst.instanceId;
              const envName = inst.tags['elasticbeanstalk:environment-name'];

              return (
                <div key={inst.instanceId}>
                  {envName && (
                    <>
                      <div
                        style={{
                          border: '1px dashed #8b5cf6',
                          borderRadius: 8,
                          padding: '8px 12px',
                          display: 'inline-block',
                          fontSize: '0.75rem',
                          color: '#7c3aed',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Elastic Beanstalk: {envName}
                      </div>
                      <ConnectionLine />
                    </>
                  )}

                  <ResourceCard
                    type="ec2"
                    title={name}
                    subtitle={inst.instanceType}
                    status={inst.state}
                    details={[
                      `Platform: ${inst.platform}`,
                      `ID: ${inst.instanceId}`,
                    ]}
                  />

                  {attachedVolumes.length > 0 && (
                    <>
                      <ConnectionLine label="attached" />
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingLeft: 24 }}>
                        {attachedVolumes.map((vol) => (
                          <ResourceCard
                            key={vol.volumeId}
                            type="ebs"
                            title={vol.volumeId}
                            subtitle={`${vol.size} GiB ${vol.volumeType}`}
                            status={vol.state}
                            details={[]}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Orphaned EBS */}
      {orphanedEbs.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16, fontSize: '0.95rem', color: '#dc2626' }}>
            Orphaned Volumes
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {orphanedEbs.map((vol) => (
              <ResourceCard
                key={vol.volumeId}
                type="ebs"
                title={vol.volumeId}
                subtitle={`${vol.size} GiB ${vol.volumeType}`}
                status={vol.state}
                details={[]}
                warning
              />
            ))}
          </div>
        </div>
      )}

      {/* Database Section */}
      {data.rds.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16, fontSize: '0.95rem' }}>Databases</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.rds.map((db) => (
              <ResourceCard
                key={db.dbInstanceId}
                type="rds"
                title={db.dbInstanceId}
                subtitle={`${db.dbInstanceClass} - ${db.engine}`}
                status={db.status}
                details={[
                  `Storage: ${db.allocatedStorage} GiB`,
                  `Multi-AZ: ${db.multiAZ ? 'Yes' : 'No'}`,
                ]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Storage Section */}
      {data.s3.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16, fontSize: '0.95rem' }}>Object Storage</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.s3.map((bucket) => (
              <ResourceCard
                key={bucket.bucketName}
                type="s3"
                title={bucket.bucketName}
                subtitle={bucket.region}
                details={[
                  `Size: ${formatBytes(bucket.sizeBytes)}`,
                  `Objects: ${bucket.objectCount.toLocaleString()}`,
                  `Class: ${bucket.storageClass}`,
                ]}
              />
            ))}
          </div>
        </div>
      )}

      {totalResources === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280' }}>No resources found in this account.</p>
        </div>
      )}
    </div>
  );
}

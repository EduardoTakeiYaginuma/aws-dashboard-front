import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface EC2Instance {
  instanceId: string;
  instanceType: string;
  state: string;
  launchTime: string;
  tags: Record<string, string>;
  platform: string;
}

interface EBSVolume {
  volumeId: string;
  size: number;
  volumeType: string;
  state: string;
  attachments: { instanceId: string; state: string }[];
  createTime: string;
}

interface S3Bucket {
  bucketName: string;
  region: string;
  sizeBytes: number;
  objectCount: number;
  lastAccessedDays: number;
  storageClass: string;
}

interface RDSInstance {
  dbInstanceId: string;
  dbInstanceClass: string;
  engine: string;
  status: string;
  allocatedStorage: number;
  averageCpuPercent: number;
  averageConnections: number;
  multiAZ: boolean;
}

interface ResourcesData {
  ec2: EC2Instance[];
  ebs: EBSVolume[];
  s3: S3Bucket[];
  rds: RDSInstance[];
  summary: {
    ec2Count: number;
    ec2Running: number;
    ebsCount: number;
    ebsOrphaned: number;
    s3Count: number;
    rdsCount: number;
  };
}

const AUTH_TOKEN = 'dev-token';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function WorkspaceResources() {
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

  if (loading) return <div className="loading">Scanning AWS resources...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return null;

  const totalResources =
    data.summary.ec2Count + data.summary.ebsCount + data.summary.s3Count + data.summary.rdsCount;

  return (
    <div>
      <div className="page-header">
        <h1>Active Resources</h1>
        <p>{totalResources} resources found in your AWS account</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">EC2 Instances</div>
          <div className="stat-value">{data.summary.ec2Count}</div>
          <div style={{ fontSize: '0.8rem', color: '#059669' }}>
            {data.summary.ec2Running} running
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">EBS Volumes</div>
          <div className="stat-value">{data.summary.ebsCount}</div>
          {data.summary.ebsOrphaned > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>
              {data.summary.ebsOrphaned} orphaned
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">S3 Buckets</div>
          <div className="stat-value">{data.summary.s3Count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RDS Instances</div>
          <div className="stat-value">{data.summary.rdsCount}</div>
        </div>
      </div>

      {/* EC2 */}
      {data.ec2.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>EC2 Instances</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Instance ID</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Platform</th>
                  <th>Launched</th>
                </tr>
              </thead>
              <tbody>
                {data.ec2.map((inst) => (
                  <tr key={inst.instanceId}>
                    <td>{inst.tags['Name'] || '-'}</td>
                    <td><code>{inst.instanceId}</code></td>
                    <td><code>{inst.instanceType}</code></td>
                    <td>
                      <span
                        className={`badge ${inst.state === 'running' ? 'badge-connected' : 'badge-dismissed'}`}
                      >
                        {inst.state}
                      </span>
                    </td>
                    <td>{inst.platform}</td>
                    <td>{new Date(inst.launchTime).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EBS */}
      {data.ebs.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>EBS Volumes</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Volume ID</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Attached To</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.ebs.map((vol) => (
                  <tr key={vol.volumeId}>
                    <td><code>{vol.volumeId}</code></td>
                    <td>{vol.size} GiB</td>
                    <td><code>{vol.volumeType}</code></td>
                    <td>
                      <span
                        className={`badge ${vol.state === 'in-use' ? 'badge-connected' : 'badge-error'}`}
                      >
                        {vol.state}
                      </span>
                    </td>
                    <td>
                      {vol.attachments.length > 0
                        ? vol.attachments.map((a) => a.instanceId).join(', ')
                        : <span style={{ color: '#dc2626' }}>not attached</span>}
                    </td>
                    <td>{new Date(vol.createTime).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S3 */}
      {data.s3.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>S3 Buckets</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th>Region</th>
                  <th>Size (sample)</th>
                  <th>Objects (sample)</th>
                  <th>Storage Class</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                {data.s3.map((bucket) => (
                  <tr key={bucket.bucketName}>
                    <td><code>{bucket.bucketName}</code></td>
                    <td>{bucket.region}</td>
                    <td>{formatBytes(bucket.sizeBytes)}</td>
                    <td>{bucket.objectCount.toLocaleString()}</td>
                    <td><code>{bucket.storageClass}</code></td>
                    <td>
                      {bucket.lastAccessedDays > 0
                        ? `${bucket.lastAccessedDays} days ago`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RDS */}
      {data.rds.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>RDS Instances</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Instance ID</th>
                  <th>Class</th>
                  <th>Engine</th>
                  <th>Status</th>
                  <th>Storage</th>
                  <th>Avg CPU</th>
                  <th>Avg Connections</th>
                  <th>Multi-AZ</th>
                </tr>
              </thead>
              <tbody>
                {data.rds.map((db) => (
                  <tr key={db.dbInstanceId}>
                    <td><code>{db.dbInstanceId}</code></td>
                    <td><code>{db.dbInstanceClass}</code></td>
                    <td>{db.engine}</td>
                    <td>
                      <span
                        className={`badge ${db.status === 'available' ? 'badge-connected' : 'badge-pending'}`}
                      >
                        {db.status}
                      </span>
                    </td>
                    <td>{db.allocatedStorage} GiB</td>
                    <td>{db.averageCpuPercent}%</td>
                    <td>{db.averageConnections}</td>
                    <td>{db.multiAZ ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalResources === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280' }}>
            No resources found. The account may have resources in a different region,
            or the IAM Role may not have sufficient permissions.
          </p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Workspace, CostData, HealthResponse } from '../api';

const COLORS = ['#4361ee', '#f72585', '#4cc9f0', '#7209b7', '#3a0ca3', '#f77f00', '#999'];

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [costs, setCosts] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, ws] = await Promise.all([api.health(), api.listWorkspaces()]);
        setHealth(h);
        setWorkspaces(ws);

        if (ws.length > 0) {
          const c = await api.getCosts(ws[0].id);
          setCosts(c);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const totalRecs = workspaces.reduce((s, w) => s + (w._count?.recommendations || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Overview</h1>
        <p>Your AWS cost optimization summary</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">System Status</div>
          <div className="stat-value">{health?.status === 'ok' ? 'Healthy' : 'Degraded'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Connected Workspaces</div>
          <div className="stat-value">{workspaces.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Recommendations</div>
          <div className="stat-value">{totalRecs}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Est. Monthly Spend</div>
          <div className="stat-value">
            {costs ? `$${costs.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--'}
          </div>
        </div>
      </div>

      {costs && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Cost Breakdown by Service</h3>
          <div className="cost-bar">
            {Object.entries(costs.byService).map(([service, amount], i) => {
              const pct = (amount / costs.totalMonthly) * 100;
              if (pct < 2) return null;
              return (
                <div
                  key={service}
                  className="cost-bar-segment"
                  style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                  title={`${service}: $${amount.toLocaleString()}`}
                >
                  {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                </div>
              );
            })}
          </div>
          <div className="cost-legend">
            {Object.entries(costs.byService).map(([service, amount], i) => (
              <div key={service} className="cost-legend-item">
                <div className="cost-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{service}: ${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {workspaces.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Workspaces</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>AWS Account</th>
                  <th>Status</th>
                  <th>Recommendations</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <tr key={ws.id}>
                    <td>{ws.name}</td>
                    <td>{ws.awsAccountId}</td>
                    <td><span className={`badge badge-${ws.status}`}>{ws.status}</span></td>
                    <td>{ws._count?.recommendations || 0}</td>
                    <td>
                      <Link to={`/workspaces/${ws.id}/recommendations`} className="btn btn-sm btn-primary">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {workspaces.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            No workspaces connected yet. Add your first AWS account to start optimizing costs.
          </p>
          <Link to="/workspaces" className="btn btn-primary">Add Workspace</Link>
        </div>
      )}

      {health?.lastJobRun && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Last Analysis Run</h3>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">{health.lastJobRun.status}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Started At</span>
            <span className="detail-value">{new Date(health.lastJobRun.startedAt).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Recommendations Found</span>
            <span className="detail-value">{health.lastJobRun.recommendationsFound}</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Workspace } from '../api';

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ roleArn: '', awsAccountId: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadWorkspaces() {
    try {
      const ws = await api.listWorkspaces();
      setWorkspaces(ws);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.createWorkspace({
        roleArn: form.roleArn,
        awsAccountId: form.awsAccountId,
        name: form.name || undefined,
      });
      setShowForm(false);
      setForm({ roleArn: '', awsAccountId: '', name: '' });
      await loadWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTestConnection(id: string) {
    try {
      await api.testConnection(id);
      await loadWorkspaces();
    } catch (err) {
      console.error('Connection test failed:', err);
    }
  }

  if (loading) return <div className="loading">Loading workspaces...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Workspaces</h1>
          <p>Manage your connected AWS accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Add Workspace
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Connect AWS Account</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Workspace Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production Account"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>IAM Role ARN *</label>
                <input
                  type="text"
                  required
                  placeholder="arn:aws:iam::123456789012:role/FinOpsDashboardRole"
                  value={form.roleArn}
                  onChange={(e) => setForm({ ...form, roleArn: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>AWS Account ID *</label>
                <input
                  type="text"
                  required
                  placeholder="123456789012"
                  value={form.awsAccountId}
                  onChange={(e) => setForm({ ...form, awsAccountId: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Connect Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280' }}>
            No workspaces yet. Click "Add Workspace" to connect your first AWS account.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>AWS Account ID</th>
                  <th>Status</th>
                  <th>Recommendations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <tr key={ws.id}>
                    <td>{ws.name}</td>
                    <td><code>{ws.awsAccountId}</code></td>
                    <td>
                      <span className={`badge badge-${ws.status}`}>{ws.status}</span>
                    </td>
                    <td>{ws._count?.recommendations || 0}</td>
                    <td>
                      <Link to={`/workspaces/${ws.id}/resources`} className="btn btn-sm btn-primary">
                        Resources
                      </Link>
                      <Link to={`/workspaces/${ws.id}/explorer`} className="btn btn-sm btn-primary">
                        Explorer
                      </Link>
                      <Link to={`/workspaces/${ws.id}/diagram`} className="btn btn-sm btn-primary">
                        Diagram
                      </Link>
                      <Link to={`/workspaces/${ws.id}/recommendations`} className="btn btn-sm btn-primary">
                        Recommendations
                      </Link>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleTestConnection(ws.id)}
                      >
                        Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

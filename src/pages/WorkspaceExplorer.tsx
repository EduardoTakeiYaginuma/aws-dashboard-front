import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Resource, CostsSummary } from '../api';

export default function WorkspaceExplorer() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const [resources, setResources] = useState<Resource[]>([]);
  const [costs, setCosts] = useState<CostsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState({ service: '', tag: '', q: '' });
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

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

  useEffect(() => {
    loadData();
  }, [workspaceId, page, perPage, filters]);

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Inventory Explorer</h1>
        <p>Explore and analyze your AWS resources</p>
      </div>

      {costs && (
        <div className="card summary-card">
          <h2>Cost Summary</h2>
          <div className="summary-grid">
            <div>
              <h3>Total Estimated Cost</h3>
              <p>${costs.total.toFixed(2)} / mo</p>
            </div>
            <div>
              <h3>Cost by Service</h3>
              <ul>
                {costs.byService.map((s) => (
                  <li key={s.service}>
                    {s.service}: ${s.cost.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
                <h3>Cost by Tag (owner)</h3>
                <ul>
                    {costs.byTag.map((t) => (
                        <li key={t.tag}>
                            {t.tag}: ${t.cost.toFixed(2)}
                        </li>
                    ))}
                </ul>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="filters">
            <input type="text" name="q" placeholder="Search by ID or name" value={filters.q} onChange={handleFilterChange} />
            <input type="text" name="tag" placeholder="Filter by tag (key:value)" value={filters.tag} onChange={handleFilterChange} />
            <select name="service" value={filters.service} onChange={handleFilterChange}>
                <option value="">All Services</option>
                {costs?.byService.map(s => <option key={s.service} value={s.service}>{s.service}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={loadData}>Refresh</button>
        </div>

        {loading ? (
          <div className="loading">Loading resources...</div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Resource ID</th>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Type</th>
                    <th>State</th>
                    <th>Est. $/mo</th>
                    <th>Last Seen</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => (
                    <tr key={r.id}>
                      <td><code>{r.resourceId}</code></td>
                      <td>{r.name}</td>
                      <td><span className={`badge badge-service-${r.service.toLowerCase()}`}>{r.service}</span></td>
                      <td>{r.type}</td>
                      <td><span className={`badge badge-state-${r.state?.toLowerCase()}`}>{r.state}</span></td>
                      <td>${r.estimatedMonthlyCost.toFixed(2)}</td>
                      <td>{new Date(r.lastSeenAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm" onClick={() => setSelectedResource(r)}>Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Previous</button>
                <span>Page {page} of {Math.ceil(total/perPage)}</span>
                <button onClick={() => setPage(p => p+1)} disabled={page * perPage >= total}>Next</button>
            </div>
          </>
        )}
      </div>

      {selectedResource && (
        <div className="modal-overlay" onClick={() => setSelectedResource(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Resource Details</h2>
                <pre>{JSON.stringify(selectedResource, null, 2)}</pre>
                <div className="modal-actions">
                    <button className="btn btn-primary" onClick={() => setSelectedResource(null)}>Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalRecs = workspaces.reduce((s, w) => s + (w._count?.recommendations || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Overview</h1>
          <p className="text-gray-600 text-lg">Your AWS cost optimization summary</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">System Status</div>
            <div className="text-3xl font-bold text-gray-900">
              {health?.status === 'ok' ? (
                <span className="text-green-600">Healthy</span>
              ) : (
                <span className="text-yellow-600">Degraded</span>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Connected Workspaces</div>
            <div className="text-3xl font-bold text-gray-900">{workspaces.length}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Total Recommendations</div>
            <div className="text-3xl font-bold text-blue-600">{totalRecs}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Est. Monthly Spend</div>
            <div className="text-3xl font-bold text-gray-900">
              {costs ? `$${costs.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--'}
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        {costs && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Cost Breakdown by Service</h3>
            
            {/* Cost Bar */}
            <div className="flex h-12 rounded-lg overflow-hidden mb-4 shadow-inner">
              {Object.entries(costs.byService).map(([service, amount], i) => {
                const pct = (amount / costs.totalMonthly) * 100;
                if (pct < 2) return null;
                return (
                  <div
                    key={service}
                    className="flex items-center justify-center text-white font-semibold text-sm transition-all hover:opacity-80 cursor-pointer"
                    style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                    title={`${service}: $${amount.toLocaleString()}`}
                  >
                    {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(costs.byService).map(([service, amount], i) => (
                <div key={service} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-700 truncate">
                    <span className="font-medium">{service}:</span> ${amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces Table */}
        {workspaces.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Workspaces</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AWS Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendations</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ws.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ws.awsAccountId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ws.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : ws.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ws.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ws._count?.recommendations || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          to={`/workspaces/${ws.id}/recommendations`} 
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
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

        {/* Empty State */}
        {workspaces.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-4 text-gray-600 text-lg">
              No workspaces connected yet. Add your first AWS account to start optimizing costs.
            </p>
            <Link 
              to="/workspaces" 
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Add Workspace
            </Link>
          </div>
        )}

        {/* Last Job Run */}
        {health?.lastJobRun && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Last Analysis Run</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  health.lastJobRun.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : health.lastJobRun.status === 'running'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {health.lastJobRun.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Started At</span>
                <span className="text-sm text-gray-900">{new Date(health.lastJobRun.startedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-500">Recommendations Found</span>
                <span className="text-sm font-bold text-blue-600">{health.lastJobRun.recommendationsFound}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

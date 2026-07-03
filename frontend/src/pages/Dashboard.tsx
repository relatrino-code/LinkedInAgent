import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, Send, Mail, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { jobsApi, applicationsApi } from '../services/api';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { data: jobStats } = useQuery({ queryKey: ['job-stats'], queryFn: jobsApi.stats });
  const { data: appStats } = useQuery({ queryKey: ['app-stats'], queryFn: applicationsApi.stats });
  const { data: recentApps } = useQuery({
    queryKey: ['recent-apps'],
    queryFn: () => applicationsApi.list({ page_size: 5, sort_by: 'updated_at' }),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Jobs"
          value={jobStats?.total ?? 0}
          icon={Briefcase}
          color="blue"
        />
        <StatsCard
          title="Applications"
          value={appStats?.total ?? 0}
          icon={Send}
          color="purple"
        />
        <StatsCard
          title="Emails Sent"
          value={appStats?.by_email_status?.sent ?? 0}
          icon={Mail}
          color="amber"
        />
        <StatsCard
          title="Replies"
          value={appStats?.replied ?? 0}
          icon={TrendingUp}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} /> Recent Applications
          </h3>
          {recentApps?.items?.length ? (
            <div className="space-y-3">
              {recentApps.items.map(app => (
                <Link
                  key={app.id}
                  to={`/applications/${app.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {app.job?.title || 'Unknown'} <span className="text-gray-500">at</span> {app.job?.company || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {app.contact_name ? `Contact: ${app.contact_name}` : 'No contact found'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.application_status} />
                    <StatusBadge status={app.email_status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No applications yet. Start by scraping jobs!</p>
          )}
          <Link to="/applications" className="block mt-4 text-sm text-blue-600 hover:text-blue-700">
            View all applications →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle size={18} /> Application Status
          </h3>
          {appStats?.by_status ? (
            <div className="space-y-3">
              {(Object.entries(appStats.by_status) as [string, number][]).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}

          <h3 className="text-lg font-semibold mt-6 mb-4">Job Sources</h3>
          {jobStats?.by_source ? (
            <div className="space-y-3">
              {(Object.entries(jobStats.by_source) as [string, number][]).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-gray-600">{source}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

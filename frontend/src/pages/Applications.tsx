import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Mail, ExternalLink, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { applicationsApi } from '../services/api';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';

export default function Applications() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [emailStatusFilter, setEmailStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['applications', page, search, statusFilter, emailStatusFilter],
    queryFn: () => applicationsApi.list({
      page,
      page_size: 20,
      search: search || undefined,
      status: statusFilter || undefined,
      email_status: emailStatusFilter || undefined,
      sort_by: 'updated_at',
      sort_order: 'desc',
    }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
      </div>

      <FilterBar
        onSearch={setSearch}
        searchPlaceholder="Search by company, contact name, email..."
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            options: [
              { label: 'Discovered', value: 'discovered' },
              { label: 'Email Found', value: 'email_found' },
              { label: 'Email Sent', value: 'email_sent' },
              { label: 'Followed Up', value: 'followed_up' },
              { label: 'Replied', value: 'replied' },
              { label: 'Interview', value: 'interview_scheduled' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'Offer', value: 'offer' },
            ],
            onChange: setStatusFilter,
          },
          {
            label: 'Email Status',
            value: emailStatusFilter,
            options: [
              { label: 'Draft', value: 'draft' },
              { label: 'Sent', value: 'sent' },
              { label: 'Delivered', value: 'delivered' },
              { label: 'Opened', value: 'opened' },
              { label: 'Replied', value: 'replied' },
              { label: 'Failed', value: 'failed' },
            ],
            onChange: setEmailStatusFilter,
          },
        ]}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data?.items?.length ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                <th className="p-4 font-medium">Company / Role</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Email Status</th>
                <th className="p-4 font-medium">Last Updated</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map(app => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{app.job?.title || 'Unknown Role'}</p>
                    <p className="text-sm text-gray-500">{app.job?.company || 'Unknown Company'}</p>
                  </td>
                  <td className="p-4">
                    {app.contact_name ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{app.contact_name}</p>
                        <p className="text-xs text-gray-400">{app.contact_email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No contact yet</span>
                    )}
                  </td>
                  <td className="p-4"><StatusBadge status={app.application_status} /></td>
                  <td className="p-4"><StatusBadge status={app.email_status} /></td>
                  <td className="p-4 text-sm text-gray-500">
                    {app.last_contact_at
                      ? format(new Date(app.last_contact_at), 'MMM d, HH:mm')
                      : format(new Date(app.updated_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="p-4">
                    <Link
                      to={`/applications/${app.id}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <MessageSquare size={14} /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-400">
            No applications yet. Scrape jobs and create applications to get started!
          </div>
        )}
      </div>

      {data && data.total > data.page_size && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(data.page - 1) * data.page_size + 1}-{Math.min(data.page * data.page_size, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * data.page_size >= data.total} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobsApi } from '../services/api';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';

export default function Jobs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showScrape, setShowScrape] = useState(false);
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [scrapeLocation, setScrapeLocation] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, search, sourceFilter, statusFilter],
    queryFn: () => jobsApi.list({
      page,
      page_size: 20,
      search: search || undefined,
      source: sourceFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const scrapeMutation = useMutation({
    mutationFn: () => jobsApi.scrape(scrapeQuery, scrapeLocation),
    onSuccess: () => {
      toast.success('Scraping started! Results will appear shortly.');
      setShowScrape(false);
      setScrapeQuery('');
      setScrapeLocation('');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Scrape failed'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Jobs</h2>
        <button
          onClick={() => setShowScrape(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> Scrape Jobs
        </button>
      </div>

      <FilterBar
        onSearch={setSearch}
        searchPlaceholder="Search jobs by title, company..."
        filters={[
          {
            label: 'Source',
            value: sourceFilter,
            options: [
              { label: 'LinkedIn', value: 'linkedin' },
              { label: 'Indeed', value: 'indeed' },
              { label: 'Company Career', value: 'company_career' },
              { label: 'Manual', value: 'manual' },
            ],
            onChange: setSourceFilter,
          },
          {
            label: 'Status',
            value: statusFilter,
            options: [
              { label: 'Discovered', value: 'discovered' },
              { label: 'Applied', value: 'applied' },
              { label: 'Replied', value: 'reply_received' },
              { label: 'Interview', value: 'interview' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'Offer', value: 'offer' },
              { label: 'Closed', value: 'closed' },
            ],
            onChange: setStatusFilter,
          },
        ]}
      />

      {showScrape && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-semibold mb-3">Scrape New Jobs</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Job title (e.g. Software Engineer)"
              value={scrapeQuery}
              onChange={e => setScrapeQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Location (optional)"
              value={scrapeLocation}
              onChange={e => setScrapeLocation(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => scrapeMutation.mutate()}
              disabled={!scrapeQuery || scrapeMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {scrapeMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Scrape
            </button>
            <button
              onClick={() => setShowScrape(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data?.items?.length ? (
          <div className="divide-y divide-gray-100">
            {data.items.map(job => (
              <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company}</p>
                    {job.location && <p className="text-sm text-gray-400">{job.location}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.source} />
                    <StatusBadge status={job.status} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {job.salary_range && <span className="text-xs text-gray-500">{job.salary_range}</span>}
                  {job.required_experience && <span className="text-xs text-gray-500">{job.required_experience}</span>}
                  {job.job_url && (
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> View Job
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            No jobs found. Click "Scrape Jobs" to find some!
          </div>
        )}
      </div>

      {data && data.total > data.page_size && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(data.page - 1) * data.page_size + 1}-{Math.min(data.page * data.page_size, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * data.page_size >= data.total}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

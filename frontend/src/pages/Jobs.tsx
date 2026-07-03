import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, ExternalLink, Send, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobsApi, applicationsApi, userApi } from '../services/api';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';

const initialScrape = {
  query: '', location: '', companies: '', experience_level: '', keywords: '', sources: 'linkedin,indeed',
};

export default function Jobs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showScrape, setShowScrape] = useState(false);
  const [form, setForm] = useState(initialScrape);

  const { data: savedQueries } = useQuery({
    queryKey: ['search-queries'],
    queryFn: userApi.getSearchQueries,
  });

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
    mutationFn: () => jobsApi.scrape(form),
    onSuccess: () => {
      toast.success('Scraping started!');
      setShowScrape(false);
      setForm(initialScrape);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['job-stats'] });
      }, 10000);
    },
    onError: (err: any) => toast.error(err?.message || 'Scrape failed'),
  });

  const createAppMutation = useMutation({
    mutationFn: (jobId: string) => applicationsApi.create({ job_id: jobId }),
    onSuccess: () => {
      toast.success('Application created! Go to Applications tab.');
      queryClient.invalidateQueries({ queryKey: ['app-stats'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed'),
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

      {savedQueries && savedQueries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
            <Bookmark size={14} /> Saved Search Queries
          </h3>
          <div className="flex flex-wrap gap-2">
            {savedQueries.map(q => (
              <button
                key={q.id}
                onClick={() => {
                  setForm({
                    query: q.job_titles.split(',')[0].trim(),
                    location: q.locations || '',
                    companies: q.companies || '',
                    experience_level: q.experience_level || '',
                    keywords: q.keywords || '',
                    sources: q.sources || 'linkedin,indeed',
                  });
                  setShowScrape(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 whitespace-nowrap"
              >
                <Plus size={12} />
                {q.job_titles.split(',')[0].trim()}
                {q.companies && <span className="text-gray-400">· {q.companies}</span>}
                {q.locations && <span className="text-blue-400">· {q.locations}</span>}
                {q.keywords && <span className="text-green-500">· kw:{q.keywords}</span>}
                {q.experience_level && <span className="text-purple-500">· {q.experience_level}</span>}
                {q.sources && <span className="text-orange-500">· {q.sources}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showScrape && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-semibold mb-3">Scrape New Jobs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text" placeholder="Job Title *" value={form.query}
              onChange={e => setForm(p => ({ ...p, query: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text" placeholder="Location" value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text" placeholder="Companies (comma separated)" value={form.companies}
              onChange={e => setForm(p => ({ ...p, companies: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text" placeholder="Keywords" value={form.keywords}
              onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text" placeholder="Experience Level (entry, mid, senior)" value={form.experience_level}
              onChange={e => setForm(p => ({ ...p, experience_level: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text" placeholder="Sources (linkedin, indeed)" value={form.sources}
              onChange={e => setForm(p => ({ ...p, sources: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => scrapeMutation.mutate()}
              disabled={!form.query || scrapeMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {scrapeMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {scrapeMutation.isPending ? 'Scraping...' : 'Start Scrape'}
            </button>
            <button onClick={() => { setShowScrape(false); setForm(initialScrape); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company}</p>
                    {job.location && <p className="text-sm text-gray-400">{job.location}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <StatusBadge status={job.source} />
                    <StatusBadge status={job.status} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  {job.salary_range && <span className="text-xs text-gray-500">{job.salary_range}</span>}
                  {job.required_experience && <span className="text-xs text-gray-500">{job.required_experience}</span>}
                  <div className="flex-1" />
                  {job.job_url && (
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> View
                    </a>
                  )}
                  <button
                    onClick={() => createAppMutation.mutate(job.id)}
                    disabled={createAppMutation.isPending}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send size={12} /> Apply
                  </button>
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * data.page_size >= data.total} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

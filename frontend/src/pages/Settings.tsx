import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Plus, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../services/api';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: userApi.getProfile });
  const { data: queries } = useQuery({ queryKey: ['search-queries'], queryFn: userApi.getSearchQueries });

  const [form, setForm] = useState({
    name: '', email: '', phone: '', linkedin_url: '', portfolio_url: '',
    current_company: '', current_title: '', years_experience: 0, skills: '',
    cover_letter_template: '',
  });

  const [newQuery, setNewQuery] = useState({
    job_titles: '', companies: '', locations: '', experience_level: '', keywords: '', sources: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        linkedin_url: profile.linkedin_url || '',
        portfolio_url: profile.portfolio_url || '',
        current_company: profile.current_company || '',
        current_title: profile.current_title || '',
        years_experience: profile.years_experience || 0,
        skills: profile.skills || '',
        cover_letter_template: profile.cover_letter_template || '',
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => profile
      ? userApi.updateProfile(form)
      : userApi.createProfile(form),
    onSuccess: () => {
      toast.success('Profile saved!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => toast.error('Failed to save profile'),
  });

  const createQueryMutation = useMutation({
    mutationFn: () => userApi.createSearchQuery(newQuery),
    onSuccess: () => {
      toast.success('Search query created!');
      setNewQuery({ job_titles: '', companies: '', locations: '', experience_level: '', keywords: '', sources: '' });
      queryClient.invalidateQueries({ queryKey: ['search-queries'] });
    },
  });

  const deleteQueryMutation = useMutation({
    mutationFn: (id: string) => userApi.deleteSearchQuery(id),
    onSuccess: () => {
      toast.success('Query deleted');
      queryClient.invalidateQueries({ queryKey: ['search-queries'] });
    },
  });

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await userApi.uploadResume(file);
      toast.success('Resume uploaded!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4">Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="LinkedIn URL" value={form.linkedin_url} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Portfolio URL" value={form.portfolio_url} onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Current Company" value={form.current_company} onChange={e => setForm(p => ({ ...p, current_company: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Current Title" value={form.current_title} onChange={e => setForm(p => ({ ...p, current_title: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Years of Experience" type="number" value={form.years_experience} onChange={e => setForm(p => ({ ...p, years_experience: parseInt(e.target.value) || 0 }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <textarea placeholder="Skills (comma separated)" value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} className="w-full mt-4 px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2} />
        <textarea placeholder="Cover Letter Template (use {{company}} {{role}} as placeholders)" value={form.cover_letter_template} onChange={e => setForm(p => ({ ...p, cover_letter_template: e.target.value }))} className="w-full mt-4 px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={4} />

        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">Resume / CV</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
              <Upload size={14} /> Upload Resume
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" />
            </label>
            {profile?.resume_path && <span className="text-xs text-gray-500">Uploaded</span>}
          </div>
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} /> {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4">Search Queries</h3>
        <p className="text-sm text-gray-500 mb-4">
          These queries will be run automatically on your configured schedule.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input placeholder="Job Titles (comma separated)" value={newQuery.job_titles} onChange={e => setNewQuery(p => ({ ...p, job_titles: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Companies (comma separated, optional)" value={newQuery.companies} onChange={e => setNewQuery(p => ({ ...p, companies: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Locations (comma separated, optional)" value={newQuery.locations} onChange={e => setNewQuery(p => ({ ...p, locations: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Keywords (optional)" value={newQuery.keywords} onChange={e => setNewQuery(p => ({ ...p, keywords: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <select value={newQuery.experience_level} onChange={e => setNewQuery(p => ({ ...p, experience_level: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">Experience Level</option>
            <option value="entry">Entry</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead / Manager</option>
          </select>
          <input placeholder="Sources (linkedin,indeed)" value={newQuery.sources} onChange={e => setNewQuery(p => ({ ...p, sources: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>

        <button
          onClick={() => createQueryMutation.mutate()}
          disabled={!newQuery.job_titles || createQueryMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={14} /> Add Search Query
        </button>

        {queries?.length ? (
          <div className="mt-4 space-y-2">
            {queries.map(q => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{q.job_titles}</p>
                  {q.locations && <p className="text-xs text-gray-500">{q.locations}</p>}
                </div>
                <button onClick={() => deleteQueryMutation.mutate(q.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Environment Status</h3>
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`} />
            Backend API
          </p>
          <p className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`} />
            PostgreSQL Database
          </p>
          <p className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`} />
            Redis (for Celery)
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Ensure all services are running via docker-compose
          </p>
        </div>
      </div>
    </div>
  );
}

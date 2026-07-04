import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Plus, Trash2, Pencil, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../services/api';

const emptyQuery = {
  job_titles: '', companies: '', locations: '',
  experience_level: '', keywords: '', sources: '',
};

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: userApi.getProfile });
  const { data: queries } = useQuery({ queryKey: ['search-queries'], queryFn: userApi.getSearchQueries });

  const [form, setForm] = useState({
    name: '', email: '', phone: '', linkedin_url: '', portfolio_url: '',
    current_company: '', current_title: '', years_experience: 0, skills: '',
    cover_letter_template: '',
    email_subject_template: '',
    email_body_template: '',
  });

  const [queryForm, setQueryForm] = useState(emptyQuery);
  const [editingId, setEditingId] = useState<string | null>(null);

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
        email_subject_template: profile.email_subject_template || '',
        email_body_template: profile.email_body_template || '',
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => profile ? userApi.updateProfile(form) : userApi.createProfile(form),
    onSuccess: () => { toast.success('Profile saved!'); queryClient.invalidateQueries({ queryKey: ['profile'] }); },
    onError: () => toast.error('Failed to save profile'),
  });

  const createQueryMutation = useMutation({
    mutationFn: () => userApi.createSearchQuery(queryForm),
    onSuccess: () => {
      toast.success('Search query created!');
      setQueryForm(emptyQuery);
      queryClient.invalidateQueries({ queryKey: ['search-queries'] });
    },
  });

  const updateQueryMutation = useMutation({
    mutationFn: () => userApi.updateSearchQuery(editingId!, queryForm),
    onSuccess: () => {
      toast.success('Search query updated!');
      setQueryForm(emptyQuery);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['search-queries'] });
    },
  });

  const deleteQueryMutation = useMutation({
    mutationFn: (id: string) => userApi.deleteSearchQuery(id),
    onSuccess: () => { toast.success('Query deleted'); queryClient.invalidateQueries({ queryKey: ['search-queries'] }); },
  });

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await userApi.uploadResume(file);
      toast.success('Resume uploaded!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch { toast.error('Upload failed'); }
  };

  const startEdit = (q: any) => {
    setQueryForm({
      job_titles: q.job_titles || '',
      companies: q.companies || '',
      locations: q.locations || '',
      experience_level: q.experience_level || '',
      keywords: q.keywords || '',
      sources: q.sources || '',
    });
    setEditingId(q.id);
  };

  const cancelEdit = () => {
    setQueryForm(emptyQuery);
    setEditingId(null);
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

        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          <Save size={14} /> {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Mail size={16} /> Email Defaults
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Set default subject and body for emails. Use {'{{company}}'} and {'{{role}}'} as placeholders.
          When sending from the Application detail page, leave subject/body blank to use defaults.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Subject</label>
            <input
              placeholder="e.g. Application for {{role}} at {{company}}"
              value={form.email_subject_template}
              onChange={e => setForm(p => ({ ...p, email_subject_template: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            {form.email_subject_template && (
              <p className="text-xs text-green-600 mt-1">
                Preview: {form.email_subject_template.replace('{{company}}', 'Google').replace('{{role}}', 'Software Engineer')}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Body</label>
            <textarea
              placeholder="e.g. Hi, I'm interested in the {{role}} position at {{company}}. Please find my CV attached."
              value={form.email_body_template}
              onChange={e => setForm(p => ({ ...p, email_body_template: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              rows={5}
            />
            {form.email_body_template && (
              <p className="text-xs text-green-600 mt-1">
                Preview: {form.email_body_template.replace('{{company}}', 'Google').replace('{{role}}', 'Software Engineer')}
              </p>
            )}
          </div>
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50">
          <Save size={14} /> Save Email Templates
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-4">
          {editingId ? 'Edit Search Query' : 'Search Queries'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {editingId
            ? 'Update the fields below and save.'
            : 'These queries will be run automatically on your configured schedule.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input placeholder="Job Titles *" value={queryForm.job_titles} onChange={e => setQueryForm(p => ({ ...p, job_titles: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Companies (comma separated)" value={queryForm.companies} onChange={e => setQueryForm(p => ({ ...p, companies: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Locations (comma separated)" value={queryForm.locations} onChange={e => setQueryForm(p => ({ ...p, locations: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Keywords" value={queryForm.keywords} onChange={e => setQueryForm(p => ({ ...p, keywords: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Experience Level" value={queryForm.experience_level} onChange={e => setQueryForm(p => ({ ...p, experience_level: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Sources (linkedin,indeed)" value={queryForm.sources} onChange={e => setQueryForm(p => ({ ...p, sources: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>

        <div className="flex gap-2">
          {editingId ? (
            <>
              <button onClick={() => updateQueryMutation.mutate()} disabled={!queryForm.job_titles || updateQueryMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                <Save size={14} /> Update Query
              </button>
              <button onClick={cancelEdit} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            </>
          ) : (
            <button onClick={() => createQueryMutation.mutate()} disabled={!queryForm.job_titles || createQueryMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              <Plus size={14} /> Add Search Query
            </button>
          )}
        </div>

        {queries?.length ? (
          <div className="mt-4 space-y-2">
            {queries.map(q => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{q.job_titles}</p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    {q.locations && <span>{q.locations}</span>}
                    {q.companies && <span>· {q.companies}</span>}
                    {q.keywords && <span>· {q.keywords}</span>}
                    {q.experience_level && <span>· {q.experience_level}</span>}
                    {q.sources && <span>· {q.sources}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button onClick={() => startEdit(q)} className="text-blue-500 hover:text-blue-700">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteQueryMutation.mutate(q.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Environment Status</h3>
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Backend API</p>
          <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> PostgreSQL Database</p>
          <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Redis (for Celery)</p>
          <p className="text-xs text-gray-400 mt-2">Ensure all services are running via docker-compose</p>
        </div>
      </div>
    </div>
  );
}

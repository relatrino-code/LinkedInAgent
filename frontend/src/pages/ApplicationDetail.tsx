import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Search, Reply, Mail, ExternalLink, User, Building2, CheckCircle, Circle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { applicationsApi, userApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [showReply, setShowReply] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.get(id!),
    enabled: !!id,
  });

  const { data: threads } = useQuery({
    queryKey: ['threads', id],
    queryFn: () => applicationsApi.getThreads(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts', id],
    queryFn: () => applicationsApi.getContacts(id!),
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
  });

  const findEmailsMutation = useMutation({
    mutationFn: () => applicationsApi.findEmails(id!),
    onSuccess: (data) => {
      toast.success(`Found ${data.found} contact(s)!`);
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts', id] });
    },
    onError: () => toast.error('Failed to find emails'),
  });

  const selectMutation = useMutation({
    mutationFn: (ids: string[]) => applicationsApi.selectContacts(id!, ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', id] }),
  });

  const sendEmailMutation = useMutation({
    mutationFn: () => applicationsApi.sendEmail(id!, { subject, body }),
    onSuccess: () => {
      toast.success('Email(s) queued for sending!');
      setShowSendEmail(false);
      setSubject('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['threads', id] });
    },
    onError: () => toast.error('Failed to send email'),
  });

  const replyMutation = useMutation({
    mutationFn: () => applicationsApi.reply(id!, { thread_id: showReply!, body: replyBody }),
    onSuccess: () => {
      toast.success('Reply sent!');
      setShowReply(null);
      setReplyBody('');
      queryClient.invalidateQueries({ queryKey: ['threads', id] });
    },
    onError: () => toast.error('Failed to send reply'),
  });

  const toggleContact = (cid: string) => {
    const next = new Set(selectedIds);
    if (next.has(cid)) next.delete(cid);
    else next.add(cid);
    setSelectedIds(next);
    selectMutation.mutate([...next]);
  };

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!app) return <div className="text-center py-12 text-gray-400">Application not found</div>;

  const hasEmail = app.contact_email || (contacts && contacts.some(c => c.email));
  const hasSelected = selectedIds.size > 0;

  return (
    <div>
      <Link to="/applications" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to Applications
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{app.job?.title || 'Unknown Role'}</h2>
                <p className="flex items-center gap-1 text-gray-600 mt-1">
                  <Building2 size={16} /> {app.job?.company || 'Unknown Company'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={app.application_status} />
                <StatusBadge status={app.email_status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {app.sent_at && (
                <div>
                  <span className="text-gray-400">Sent:</span>{' '}
                  <span className="text-gray-700">{format(new Date(app.sent_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
              )}
              {app.first_reply_at && (
                <div>
                  <span className="text-gray-400">First Reply:</span>{' '}
                  <span className="text-green-600">{format(new Date(app.first_reply_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
              )}
              {app.last_contact_at && (
                <div>
                  <span className="text-gray-400">Last Contact:</span>{' '}
                  <span className="text-gray-700">{format(new Date(app.last_contact_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Updated:</span>{' '}
                <span className="text-gray-700">{format(new Date(app.updated_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Mail size={16} /> Contacts
            </h3>

            {contacts && contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div
                    key={c.id}
                    onClick={() => toggleContact(c.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(c.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="mt-0.5">
                      {selectedIds.has(c.id) ? (
                        <CheckCircle size={18} className="text-blue-600" />
                      ) : (
                        <Circle size={18} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      {c.title && <p className="text-xs text-gray-500">{c.title}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        {c.email && (
                          <span className="text-xs text-gray-400 truncate">{c.email}</span>
                        )}
                        {!c.email && (
                          <span className="text-xs text-amber-500">No email (find through Apollo)</span>
                        )}
                        {c.source && (
                          <span className="text-xs text-gray-400">via {c.source}</span>
                        )}
                        {c.confidence > 0 && (
                          <span className={`text-xs ${c.confidence > 0.7 ? 'text-green-500' : 'text-yellow-500'}`}>
                            {Math.round(c.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="text-blue-500 hover:text-blue-700 shrink-0">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm mb-3">No contacts found yet.</p>
                <button
                  onClick={() => findEmailsMutation.mutate()}
                  disabled={findEmailsMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search size={14} /> {findEmailsMutation.isPending ? 'Searching...' : 'Find Contacts'}
                </button>
              </div>
            )}
          </div>

          {hasEmail && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">Send Email</h3>
              {!hasSelected && contacts && contacts.length > 0 && (
                <p className="text-xs text-amber-600 mb-3">Select contacts above to send them an email.</p>
              )}
              {showSendEmail ? (
                <div>
                  <input
                    type="text"
                    placeholder={profile?.email_subject_template ? `Subject (default: ${profile.email_subject_template.replace('{{company}}', app.job?.company || '').replace('{{role}}', app.job?.title || '')})` : 'Subject'}
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    rows={6}
                    placeholder={profile?.email_body_template ? `Body (default template available in Settings)` : 'Email body...'}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {profile?.email_subject_template && !subject && (
                    <p className="text-xs text-gray-400 mb-2">
                      Template: {profile.email_subject_template.replace('{{company}}', app.job?.company || '').replace('{{role}}', app.job?.title || '')}
                      <br />Leave blank to use template. Edit template in Settings.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendEmailMutation.mutate()}
                      disabled={sendEmailMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send size={14} /> {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
                      {hasSelected && ` (to ${selectedIds.size})`}
                    </button>
                    <button onClick={() => setShowSendEmail(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (contacts && contacts.length > 0 && !hasSelected) {
                      toast('Select contacts first by clicking on them');
                      return;
                    }
                    setShowSendEmail(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 w-full justify-center disabled:opacity-50"
                  disabled={!hasSelected && contacts && contacts.length > 0}
                >
                  <Send size={14} /> Send Email
                </button>
              )}
            </div>
          )}

          {app.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.notes}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-2">Timeline</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Created: {format(new Date(app.created_at), 'MMM d, yyyy HH:mm')}</p>
              <p>Updated: {format(new Date(app.updated_at), 'MMM d, yyyy HH:mm')}</p>
              {app.sent_at && <p>Sent: {format(new Date(app.sent_at), 'MMM d, yyyy HH:mm')}</p>}
              {app.first_reply_at && <p>First Reply: {format(new Date(app.first_reply_at), 'MMM d, yyyy HH:mm')}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User size={16} /> Primary Contact
            </h3>
            {app.contact_name ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400">Name:</span> {app.contact_name}</p>
                {app.contact_title && <p><span className="text-gray-400">Title:</span> {app.contact_title}</p>}
                {app.contact_email && <p><span className="text-gray-400">Email:</span> {app.contact_email}</p>}
                {app.contact_linkedin && (
                  <a href={app.contact_linkedin} target="_blank" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                    <ExternalLink size={12} /> LinkedIn
                  </a>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No primary contact.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-3">Email Thread</h3>
            {threads && threads.length > 0 ? (
              <div className="space-y-3">
                {threads.map(t => (
                  <div key={t.id} className={`text-sm p-3 rounded-lg ${t.is_incoming ? 'bg-gray-50 border border-gray-100' : 'bg-blue-50 border border-blue-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">{t.is_incoming ? '←' : '→'}</span>
                      <span className="text-xs font-medium text-gray-600">{t.is_incoming ? t.from_email : t.to_email}</span>
                      <span className="text-xs text-gray-400 ml-auto">{format(new Date(t.sent_at), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="font-medium text-gray-800 mb-1">{t.subject}</p>
                    <p className="text-gray-600 whitespace-pre-wrap line-clamp-4">{t.body}</p>
                    {showReply === t.id && !t.is_incoming ? (
                      <div className="mt-3">
                        <textarea
                          rows={3} placeholder="Type your reply..."
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => replyMutation.mutate()} disabled={!replyBody || replyMutation.isPending}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                            Send Reply
                          </button>
                          <button onClick={() => setShowReply(null)} className="px-3 py-1.5 border rounded text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : t.is_incoming ? (
                      <button onClick={() => setShowReply(t.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs mt-2">
                        <Reply size={12} /> Reply
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No emails sent yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

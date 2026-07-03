import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Search, Reply, Mail, ExternalLink, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { applicationsApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [showReply, setShowReply] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [replyBody, setReplyBody] = useState('');

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

  const findEmailsMutation = useMutation({
    mutationFn: () => applicationsApi.findEmails(id!),
    onSuccess: (data) => {
      toast.success(`Found ${data.found} email(s)!`);
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: () => toast.error('Failed to find emails'),
  });

  const sendEmailMutation = useMutation({
    mutationFn: () => applicationsApi.sendEmail(id!, { subject, body }),
    onSuccess: () => {
      toast.success('Email queued for sending!');
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

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!app) return <div className="text-center py-12 text-gray-400">Application not found</div>;

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
                <span className="text-gray-400">Follow-ups:</span>{' '}
                <span className="text-gray-700">{app.follow_up_count}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mail size={18} /> Email Thread
            </h3>
            {threads?.length ? (
              <div className="space-y-4">
                {threads.map(thread => (
                  <div
                    key={thread.id}
                    className={`p-4 rounded-lg border ${thread.is_incoming ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${thread.is_incoming ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'}`}>
                          {thread.is_incoming ? 'INCOMING' : 'OUTGOING'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(thread.sent_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      {thread.is_incoming && (
                        <button
                          onClick={() => { setShowReply(thread.id); setReplyBody(''); }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Reply size={12} /> Reply
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      From: {thread.from_email} → To: {thread.to_email}
                    </p>
                    <p className="text-xs font-medium text-gray-700 mb-1">{thread.subject}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{thread.body}</p>
                  </div>
                ))}

                {showReply && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                    <textarea
                      rows={4}
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                      placeholder="Write your reply..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => replyMutation.mutate()}
                        disabled={!replyBody || replyMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                      </button>
                      <button onClick={() => setShowReply(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No emails in this thread yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User size={18} /> Contact
            </h3>
            {app.contact_email ? (
              <div className="space-y-2 text-sm">
                {app.contact_name && <p><span className="text-gray-400">Name:</span> {app.contact_name}</p>}
                {app.contact_title && <p><span className="text-gray-400">Title:</span> {app.contact_title}</p>}
                <p><span className="text-gray-400">Email:</span> {app.contact_email}</p>
                {app.contact_linkedin && (
                  <a href={app.contact_linkedin} target="_blank" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <ExternalLink size={12} /> LinkedIn Profile
                  </a>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm mb-3">No contact found yet.</p>
                <button
                  onClick={() => findEmailsMutation.mutate()}
                  disabled={findEmailsMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search size={14} /> {findEmailsMutation.isPending ? 'Searching...' : 'Find Emails'}
                </button>
              </div>
            )}
          </div>

          {app.contact_email && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              {showSendEmail ? (
                <div>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    rows={6}
                    placeholder="Email body..."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendEmailMutation.mutate()}
                      disabled={!subject || !body || sendEmailMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send size={14} /> {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                    </button>
                    <button onClick={() => setShowSendEmail(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSendEmail(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 w-full justify-center"
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
              {app.first_reply_at && <p>Replied: {format(new Date(app.first_reply_at), 'MMM d, yyyy HH:mm')}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

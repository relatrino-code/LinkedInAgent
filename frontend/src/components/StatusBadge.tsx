import clsx from 'clsx';

const statusStyles: Record<string, string> = {
  discovered: 'bg-gray-100 text-gray-700',
  email_found: 'bg-blue-100 text-blue-700',
  email_sent: 'bg-indigo-100 text-indigo-700',
  sent: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-cyan-100 text-cyan-700',
  opened: 'bg-amber-100 text-amber-700',
  clicked: 'bg-orange-100 text-orange-700',
  replied: 'bg-green-100 text-green-700',
  reply_received: 'bg-green-100 text-green-700',
  interview: 'bg-purple-100 text-purple-700',
  interview_scheduled: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
  offer: 'bg-emerald-100 text-emerald-700',
  applied: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-700',
  draft: 'bg-gray-100 text-gray-500',
  queued: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  bounced: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        statusStyles[status] || 'bg-gray-100 text-gray-700',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

import { Bell } from 'lucide-react';

export default function NotifyButton() {
  return (
    <button
      onClick={() => alert('Notifications coming soon!')}
      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-brand-blue/30 bg-brand-blue/5 text-brand-blue font-semibold text-sm transition-all hover:bg-brand-blue/10"
    >
      <Bell size={16} />
      Notify me on this day
    </button>
  );
}

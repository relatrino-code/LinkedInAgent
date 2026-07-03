import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface FilterBarProps {
  onSearch: (query: string) => void;
  filters: { label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }[];
  searchPlaceholder?: string;
}

export default function FilterBar({ onSearch, filters, searchPlaceholder }: FilterBarProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder || 'Search...'}
            value={search}
            onChange={e => { setSearch(e.target.value); onSearch(e.target.value); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => { setSearch(''); onSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
        {filters.map(f => (
          <select
            key={f.label}
            value={f.value}
            onChange={e => f.onChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All {f.label}</option>
            {f.options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}

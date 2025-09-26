import React from 'react';
import { Icons } from './Icons';
import type { Step } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  roles: string[];
  selectedRole: string;
  onSelectedRoleChange: (role: string) => void;
  potentials: Array<Step['automation_potential']>;
  selectedPotentials: string[];
  onSelectedPotentialsChange: (potentials: string[]) => void;
  onClearFilters: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchQueryChange,
  roles,
  selectedRole,
  onSelectedRoleChange,
  potentials,
  selectedPotentials,
  onSelectedPotentialsChange,
  onClearFilters,
  onExpandAll,
  onCollapseAll,
}) => {

  const handlePotentialToggle = (potential: string) => {
    const newSelection = selectedPotentials.includes(potential)
      ? selectedPotentials.filter(p => p !== potential)
      : [...selectedPotentials, potential];
    onSelectedPotentialsChange(newSelection);
  };

  const hasActiveFilters = searchQuery || selectedRole !== 'all' || selectedPotentials.length > 0;

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3 flex-shrink-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search steps, tasks, processes..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
          />
        </div>

        {/* Role Select */}
        <div className="relative">
           <select
            value={selectedRole}
            onChange={(e) => onSelectedRoleChange(e.target.value)}
            className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm bg-white appearance-none"
           >
            <option value="all">All Responsible Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
           </select>
           <Icons.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Automation Potential Toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-600 mr-2">Automation:</span>
        {potentials.map(p => (
          <button
            key={p}
            onClick={() => handlePotentialToggle(p)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              selectedPotentials.includes(p)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
            }`}
          >
            {p}
          </button>
        ))}
        <div className="flex-grow flex items-center justify-end gap-2">
            <button title="Expand All" onClick={onExpandAll} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-md transition-colors"><Icons.ChevronsDown className="w-4 h-4" /></button>
            <button title="Collapse All" onClick={onCollapseAll} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-md transition-colors"><Icons.ChevronsUp className="w-4 h-4" /></button>
            {hasActiveFilters && (
                <button
                onClick={onClearFilters}
                className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                <Icons.X className="w-4 h-4" />
                Clear Filters
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

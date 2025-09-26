
import React from 'react';
import { Icons } from './Icons';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between p-4 bg-white shadow-md border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Icons.Workflow className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">Process Flow Codifier</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Powered by Gemini</span>
        <Icons.Sparkles className="w-5 h-5 text-indigo-500" />
      </div>
    </header>
  );
};

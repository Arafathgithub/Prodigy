
import React, { useState } from 'react';
import { Icons } from './Icons';

interface InputPanelProps {
  onAnalyze: (documentText: string) => void;
  isLoading: boolean;
  initialValue: string;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onAnalyze, isLoading, initialValue }) => {
  const [documentText, setDocumentText] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (documentText.trim()) {
      onAnalyze(documentText);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Icons.FileText className="w-5 h-5 text-gray-600" />
        <span>Process Document Input</span>
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          placeholder="Paste your SOP or process document here..."
          className="w-full flex-grow p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm min-h-[150px]"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !documentText.trim()}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Icons.Loader className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Icons.Play className="w-5 h-5" />
              <span>Analyze & Visualize</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

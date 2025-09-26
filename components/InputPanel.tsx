
import React, { useState, useCallback, useRef } from 'react';
import { Icons } from './Icons';

interface InputPanelProps {
  onAnalyze: (source: { text?: string; file?: { mimeType: string; data: string; } }) => void;
  isLoading: boolean;
  initialValue: string;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = (reader.result as string).split(',')[1];
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
    });
};

export const InputPanel: React.FC<InputPanelProps> = ({ onAnalyze, isLoading, initialValue }) => {
  const [documentText, setDocumentText] = useState(initialValue);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      setDocumentText('');
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    setDocumentText(initialValue);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (selectedFile) {
      const base64Data = await fileToBase64(selectedFile);
      onAnalyze({ file: { mimeType: selectedFile.type || 'application/octet-stream', data: base64Data } });
    } else if (documentText.trim()) {
      onAnalyze({ text: documentText });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Icons.FileText className="w-5 h-5 text-gray-600" />
        <span>Process Document Input</span>
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
        <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />

        {!selectedFile ? (
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
            >
                <Icons.UploadCloud className="w-8 h-8 text-gray-400 mb-2"/>
                <p className="text-sm font-semibold text-gray-600">Drag & drop a document here</p>
                <p className="text-xs text-gray-500">or click to browse (.pdf, .docx, .txt)</p>
            </div>
        ) : (
            <div className="flex items-center justify-between p-2 bg-gray-100 border border-gray-200 rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Icons.FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors"
                    aria-label="Remove file"
                >
                    <Icons.X className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="flex items-center my-3">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-2 text-xs font-semibold text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <textarea
          value={documentText}
          onChange={(e) => {
            setDocumentText(e.target.value);
            if (selectedFile) setSelectedFile(null);
          }}
          placeholder="Paste your SOP or process document here..."
          className="w-full flex-grow p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm min-h-[100px]"
          disabled={isLoading || !!selectedFile}
        />
        <button
          type="submit"
          disabled={isLoading || (!documentText.trim() && !selectedFile)}
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

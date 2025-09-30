import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import type { AiProvider, AzureConfig, OllamaConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: AiProvider;
  onProviderChange: (provider: AiProvider) => void;
  azureConfig: AzureConfig;
  onAzureConfigChange: (config: AzureConfig) => void;
  ollamaConfig: OllamaConfig;
  onOllamaConfigChange: (config: OllamaConfig) => void;
  onSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  provider,
  onProviderChange,
  azureConfig,
  onAzureConfigChange,
  ollamaConfig,
  onOllamaConfigChange,
  onSave,
}) => {
  const [localAzureConfig, setLocalAzureConfig] = useState(azureConfig);
  const [localOllamaConfig, setLocalOllamaConfig] = useState(ollamaConfig);
  const [localProvider, setLocalProvider] = useState(provider);

  useEffect(() => {
    if (isOpen) {
        setLocalProvider(provider);
        setLocalAzureConfig(azureConfig);
        setLocalOllamaConfig(ollamaConfig);
    }
  }, [isOpen, provider, azureConfig, ollamaConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    onProviderChange(localProvider);
    onAzureConfigChange(localAzureConfig);
    onOllamaConfigChange(localOllamaConfig);
    onSave();
  };

  const providers: { id: AiProvider; name: string }[] = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'azure', name: 'Azure OpenAI' },
    { id: 'ollama', name: 'Ollama (Local)' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">AI Provider Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200" aria-label="Close settings">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Select Provider</label>
            <div className="flex space-x-2 rounded-lg bg-gray-100 p-1">
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setLocalProvider(p.id)}
                  className={`flex-1 text-sm font-semibold py-2 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                    localProvider === p.id ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {localProvider === 'gemini' && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800 animate-fade-in">
              <p>Google Gemini is configured using the <strong>API_KEY</strong> environment variable provided by the platform. No additional configuration is needed here.</p>
            </div>
          )}

          {localProvider === 'azure' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-semibold text-gray-700">Azure OpenAI Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="azure-endpoint">Endpoint</label>
                <input id="azure-endpoint" type="text" placeholder="https://your-resource.openai.azure.com/" value={localAzureConfig.endpoint} onChange={(e) => setLocalAzureConfig(c => ({ ...c, endpoint: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="azure-deployment">Deployment Name</label>
                <input id="azure-deployment" type="text" placeholder="gpt-4-deployment" value={localAzureConfig.deployment} onChange={(e) => setLocalAzureConfig(c => ({ ...c, deployment: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="azure-apikey">API Key</label>
                <input id="azure-apikey" type="password" placeholder="••••••••••••••••••••••••••••••••" value={localAzureConfig.apiKey} onChange={(e) => setLocalAzureConfig(c => ({ ...c, apiKey: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
              </div>
            </div>
          )}

          {localProvider === 'ollama' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-semibold text-gray-700">Ollama Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ollama-baseurl">Base URL</label>
                <input id="ollama-baseurl" type="text" placeholder="http://localhost:11434" value={localOllamaConfig.baseUrl} onChange={(e) => setLocalOllamaConfig(c => ({ ...c, baseUrl: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ollama-model">Model Name</label>
                <input id="ollama-model" type="text" placeholder="llama3" value={localOllamaConfig.model} onChange={(e) => setLocalOllamaConfig(c => ({ ...c, model: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
                 <p className="text-xs text-gray-500 mt-1">E.g., 'llama3', 'mistral', etc. Make sure the model is pulled in Ollama.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-4 bg-gray-50 border-t rounded-b-lg">
          <button onClick={onClose} className="text-sm font-semibold text-gray-600 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors mr-2">
            Cancel
          </button>
          <button onClick={handleSave} className="text-sm bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

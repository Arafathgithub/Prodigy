
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { ChatPanel } from './components/ChatPanel';
import { ProcessVisualizer } from './components/ProcessVisualizer';
import type { ProcessFlow, ChatMessage, LoadingStates, Step, Task, AiConfig } from './types';
import { generateInitialFlow, refineFlowWithChat, generateFinalDocument, enrichStepAndReturnFullFlow } from './services/aiService';
import { SAMPLE_SOP } from './constants';
import { Icons } from './components/Icons';
import useLocalStorage from './hooks/useLocalStorage';
import { SettingsModal } from './components/SettingsModal';

type ActiveTab = 'input' | 'chat';

const App: React.FC = () => {
  const [processFlow, setProcessFlow] = useState<ProcessFlow | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({ flow: false, chat: false, doc: false });
  const [finalDocument, setFinalDocument] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('input');

  const [aiConfig, setAiConfig] = useLocalStorage<AiConfig>('ai-config', {
    provider: 'gemini',
    azure: { endpoint: '', deployment: '', apiKey: '' },
    ollama: { baseUrl: 'http://localhost:11434', model: '' }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleAnalyze = useCallback(async (source: { text?: string; file?: { mimeType: string; data: string; } }) => {
    setLoadingStates(prev => ({ ...prev, flow: true }));
    setProcessFlow(null);
    setChatHistory([]);
    setFinalDocument(null);
    try {
      const initialFlow = await generateInitialFlow(source, aiConfig);
      setProcessFlow(initialFlow);
      setChatHistory([{
        role: 'model',
        content: "I've analyzed the document and created an initial process flow. You can now review it and use this chat to make refinements or ask me to fill in any gaps."
      }]);
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      setChatHistory([{ role: 'model', content: `I'm sorry, I encountered an error while analyzing the document: ${error.message}. Please check your AI provider settings or the console for details.` }]);
    } finally {
      setLoadingStates(prev => ({ ...prev, flow: false }));
      setActiveTab('chat');
    }
  }, [aiConfig]);

  const handleSendMessage = useCallback(async (message: string) => {
    const userMessage: ChatMessage = { role: 'user', content: message };
    const newChatHistory = [...chatHistory, userMessage];
    setChatHistory(newChatHistory);
    setLoadingStates(prev => ({ ...prev, chat: true }));

    try {
      if (!processFlow) {
        throw new Error("Cannot refine flow, process is not initialized.");
      }
      const { updatedFlow, aiResponse } = await refineFlowWithChat(newChatHistory, processFlow, aiConfig);
      setProcessFlow(updatedFlow);
      setChatHistory(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error: any) {
      console.error("Error refining flow with chat:", error);
      setChatHistory(prev => [...prev, { role: 'model', content: `Sorry, I had trouble processing that: ${error.message}. Let's try again.` }]);
    } finally {
      setLoadingStates(prev => ({ ...prev, chat: false }));
    }
  }, [chatHistory, processFlow, aiConfig]);
  
  const handleGenerateDocument = useCallback(async () => {
    if (!processFlow) return;
    setLoadingStates(prev => ({ ...prev, doc: true }));
    try {
        const doc = await generateFinalDocument(processFlow, aiConfig);
        setFinalDocument(doc);
    } catch (error: any) {
        console.error("Error generating document:", error);
        setChatHistory(prev => [...prev, { role: 'model', content: `An error occurred while generating the final document: ${error.message}.` }]);
    } finally {
        setLoadingStates(prev => ({ ...prev, doc: false }));
    }
  }, [processFlow, aiConfig]);
  
  const handleAddNewStep = useCallback(async (taskId: string, stepDescription: string) => {
    if (!processFlow) return;

    setLoadingStates(prev => ({ ...prev, chat: true })); // Reuse chat loading state for simplicity
    try {
      const updatedFlow = await enrichStepAndReturnFullFlow(processFlow, taskId, stepDescription, aiConfig);
      setProcessFlow(updatedFlow);
      setChatHistory(prev => [...prev, { role: 'model', content: "I've added the new step you requested to the process flow." }]);
    } catch (error: any) {
      console.error("Error enriching new step:", error);
      setChatHistory(prev => [...prev, { role: 'model', content: `I'm sorry, I had trouble adding that step: ${error.message}. Please try again.` }]);
    } finally {
      setLoadingStates(prev => ({ ...prev, chat: false }));
    }
  }, [processFlow, aiConfig]);
  
  const handleUpdateStep = useCallback((updatedStep: Step) => {
    if (!processFlow) return;

    const newProcessFlow = {
      ...processFlow,
      sub_processes: processFlow.sub_processes.map(sp => ({
        ...sp,
        tasks: sp.tasks.map(task => ({
          ...task,
          steps: task.steps.map(step => (step.id === updatedStep.id ? updatedStep : step)),
        })),
      })),
    };
    
    setProcessFlow(newProcessFlow);
    setChatHistory(prev => [...prev, { role: 'model', content: `I've updated the step: "${updatedStep.name}". You can review the changes in the visualizer.` }]);
  }, [processFlow]);

  const handleReorderItems = useCallback((
    source: { parentId: string; index: number },
    destination: { parentId: string; index: number },
    type: 'task' | 'step'
  ) => {
    if (!processFlow || source.parentId !== destination.parentId) return;

    // Use a deep copy to ensure immutability
    const newProcessFlow = JSON.parse(JSON.stringify(processFlow));

    if (type === 'task') {
        const subProcess = newProcessFlow.sub_processes.find((sp: { id: string; }) => sp.id === source.parentId);
        if (!subProcess) return;
        const [removed] = subProcess.tasks.splice(source.index, 1);
        subProcess.tasks.splice(destination.index, 0, removed);
    } else if (type === 'step') {
        let task: Task | undefined;
        for (const sp of newProcessFlow.sub_processes) {
            task = sp.tasks.find((t: { id: string; }) => t.id === source.parentId);
            if (task) break;
        }
        if (!task) return;
        const [removed] = task.steps.splice(source.index, 1);
        task.steps.splice(destination.index, 0, removed);
    }

    setProcessFlow(newProcessFlow);
    setChatHistory(prev => [...prev, { role: 'model', content: `I've reordered the items in the process flow.` }]);
  }, [processFlow]);


  useEffect(() => {
    handleAnalyze({ text: SAMPLE_SOP });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TabButton: React.FC<{ tab: ActiveTab; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 ${
        activeTab === tab
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`}
      aria-selected={activeTab === tab}
      role="tab"
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen font-sans bg-gray-100">
      <Header onSettingsClick={() => setIsSettingsOpen(true)} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col overflow-hidden bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex-shrink-0 flex border-b border-gray-200" role="tablist">
            <TabButton tab="input" label="Document Input" icon={<Icons.FileText className="w-5 h-5"/>} />
            <TabButton tab="chat" label="SME Chat" icon={<Icons.MessageSquare className="w-5 h-5"/>} />
          </div>
          
          <div className="flex-grow p-4 flex flex-col min-h-0 overflow-y-auto">
            {activeTab === 'input' && (
              <InputPanel 
                onAnalyze={handleAnalyze} 
                isLoading={loadingStates.flow} 
                initialValue={SAMPLE_SOP} 
              />
            )}
            {activeTab === 'chat' && (
              <ChatPanel 
                chatHistory={chatHistory} 
                onSendMessage={handleSendMessage} 
                isLoading={loadingStates.chat} 
                isReady={!!processFlow}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 overflow-y-auto bg-white rounded-lg shadow-md border border-gray-200">
          <ProcessVisualizer 
            processFlow={processFlow} 
            isLoading={loadingStates.flow}
            onGenerateDocument={handleGenerateDocument}
            isDocLoading={loadingStates.doc}
            finalDocument={finalDocument}
            onCloseDocument={() => setFinalDocument(null)}
            onAddStep={handleAddNewStep}
            onUpdateStep={handleUpdateStep}
            onReorderItems={handleReorderItems}
          />
        </div>
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        provider={aiConfig.provider}
        onProviderChange={provider => setAiConfig(c => ({...c, provider}))}
        azureConfig={aiConfig.azure}
        onAzureConfigChange={azure => setAiConfig(c => ({...c, azure}))}
        ollamaConfig={aiConfig.ollama}
        onOllamaConfigChange={ollama => setAiConfig(c => ({...c, ollama}))}
        onSave={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
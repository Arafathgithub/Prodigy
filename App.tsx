
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { ChatPanel } from './components/ChatPanel';
import { ProcessVisualizer } from './components/ProcessVisualizer';
import type { ProcessFlow, ChatMessage, LoadingStates, Step } from './types';
import { generateInitialFlow, refineFlowWithChat, generateFinalDocument, enrichStepAndReturnFullFlow } from './services/geminiService';
import { SAMPLE_SOP } from './constants';

const App: React.FC = () => {
  const [processFlow, setProcessFlow] = useState<ProcessFlow | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({ flow: false, chat: false, doc: false });
  const [finalDocument, setFinalDocument] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (documentText: string) => {
    setLoadingStates(prev => ({ ...prev, flow: true }));
    setProcessFlow(null);
    setChatHistory([]);
    setFinalDocument(null);
    try {
      const initialFlow = await generateInitialFlow(documentText);
      setProcessFlow(initialFlow);
      setChatHistory([{
        role: 'model',
        content: "I've analyzed the document and created an initial process flow. You can now review it and use this chat to make refinements or ask me to fill in any gaps."
      }]);
    } catch (error) {
      console.error("Error analyzing document:", error);
      setChatHistory([{ role: 'model', content: "I'm sorry, I encountered an error while analyzing the document. Please check the console for details and try again." }]);
    } finally {
      setLoadingStates(prev => ({ ...prev, flow: false }));
    }
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    const userMessage: ChatMessage = { role: 'user', content: message };
    const newChatHistory = [...chatHistory, userMessage];
    setChatHistory(newChatHistory);
    setLoadingStates(prev => ({ ...prev, chat: true }));

    try {
      if (!processFlow) {
        throw new Error("Cannot refine flow, process is not initialized.");
      }
      const { updatedFlow, aiResponse } = await refineFlowWithChat(newChatHistory, processFlow);
      setProcessFlow(updatedFlow);
      setChatHistory(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      console.error("Error refining flow with chat:", error);
      setChatHistory(prev => [...prev, { role: 'model', content: "Sorry, I had trouble processing that. Let's try again." }]);
    } finally {
      setLoadingStates(prev => ({ ...prev, chat: false }));
    }
  }, [chatHistory, processFlow]);
  
  const handleGenerateDocument = useCallback(async () => {
    if (!processFlow) return;
    setLoadingStates(prev => ({ ...prev, doc: true }));
    try {
        const doc = await generateFinalDocument(processFlow);
        setFinalDocument(doc);
    } catch (error) {
        console.error("Error generating document:", error);
        setChatHistory(prev => [...prev, { role: 'model', content: "An error occurred while generating the final document." }]);
    } finally {
        setLoadingStates(prev => ({ ...prev, doc: false }));
    }
  }, [processFlow]);
  
  const handleAddNewStep = useCallback(async (taskId: string, stepDescription: string) => {
    if (!processFlow) return;

    setLoadingStates(prev => ({ ...prev, chat: true })); // Reuse chat loading state for simplicity
    try {
      const updatedFlow = await enrichStepAndReturnFullFlow(processFlow, taskId, stepDescription);
      setProcessFlow(updatedFlow);
      setChatHistory(prev => [...prev, { role: 'model', content: "I've added the new step you requested to the process flow." }]);
    // FIX: Added opening curly brace to the catch block to fix a syntax error that was causing subsequent errors.
    } catch (error) {
      console.error("Error enriching new step:", error);
      setChatHistory(prev => [...prev, { role: 'model', content: "I'm sorry, I had trouble adding that step. Please try again." }]);
    } finally {
      setLoadingStates(prev => ({ ...prev, chat: false }));
    }
  }, [processFlow]);
  
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


  useEffect(() => {
    handleAnalyze(SAMPLE_SOP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="flex flex-col h-screen font-sans bg-gray-100">
      <Header />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 overflow-y-auto">
          <InputPanel onAnalyze={handleAnalyze} isLoading={loadingStates.flow} initialValue={SAMPLE_SOP} />
          <ChatPanel 
            chatHistory={chatHistory} 
            onSendMessage={handleSendMessage} 
            isLoading={loadingStates.chat} 
            isReady={!!processFlow}
          />
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
          />
        </div>
      </main>
    </div>
  );
};

export default App;

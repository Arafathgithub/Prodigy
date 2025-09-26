
import React from 'react';
import type { ProcessFlow, SubProcess, Task, Step } from '../types';
import { Icons } from './Icons';
import { ProcessNode } from './ProcessNode';

interface ProcessVisualizerProps {
  processFlow: ProcessFlow | null;
  isLoading: boolean;
  onGenerateDocument: () => void;
  isDocLoading: boolean;
  finalDocument: string | null;
  onCloseDocument: () => void;
}

export const ProcessVisualizer: React.FC<ProcessVisualizerProps> = ({ processFlow, isLoading, onGenerateDocument, isDocLoading, finalDocument, onCloseDocument }) => {

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Icons.Loader className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="text-lg font-medium">Codifying Knowledge...</p>
        <p>The AI is analyzing the document to build the initial process flow.</p>
      </div>
    );
  }

  if (!processFlow) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
        <Icons.Workflow className="w-16 h-16 mb-4 text-gray-300" />
        <h2 className="text-xl font-bold mb-2">Process Visualization</h2>
        <p>Your digitized process flow will appear here.</p>
        <p className="mt-2 text-sm">To get started, paste an SOP or process document into the input panel and click "Analyze & Visualize".</p>
      </div>
    );
  }

  if(finalDocument) {
    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Generated SOP Document</h2>
                <button onClick={onCloseDocument} className="text-gray-500 hover:text-gray-800">
                    <Icons.X className="w-6 h-6" />
                </button>
            </div>
            <div className="prose prose-indigo max-w-none flex-grow overflow-y-auto bg-gray-50 p-4 rounded-md border">
                <pre className="whitespace-pre-wrap font-sans text-sm">{finalDocument}</pre>
            </div>
        </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex-shrink-0 flex justify-between items-start pb-4 border-b border-gray-200 mb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">{processFlow.process_name}</h2>
            <p className="text-gray-600">{processFlow.description}</p>
            <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded-full mt-2 inline-block">v{processFlow.version}</span>
        </div>
        <button 
            onClick={onGenerateDocument}
            disabled={isDocLoading}
            className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-green-300 transition-colors"
        >
            {isDocLoading ? <Icons.Loader className="w-5 h-5 animate-spin" /> : <Icons.Download className="w-5 h-5" />}
            <span>Generate Document</span>
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {processFlow.sub_processes.map((subProcess, index) => (
          <ProcessNode key={subProcess.id} type="subprocess" data={subProcess} index={index}>
            {subProcess.tasks.map((task, taskIndex) => (
              <ProcessNode key={task.id} type="task" data={task} index={taskIndex}>
                {task.steps.map((step, stepIndex) => (
                  <ProcessNode key={step.id} type="step" data={step} index={stepIndex} />
                ))}
              </ProcessNode>
            ))}
          </ProcessNode>
        ))}
      </div>
    </div>
  );
};

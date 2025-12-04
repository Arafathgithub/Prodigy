import React, { useState, useMemo, useEffect } from 'react';
import type { ProcessFlow, SubProcess, Task, Step } from '../types';
import { Icons } from './Icons';
import { ProcessNode } from './ProcessNode';
import { FilterBar } from './FilterBar';

interface ProcessVisualizerProps {
  processFlow: ProcessFlow | null;
  isLoading: boolean;
  onGenerateDocument: () => void;
  isDocLoading: boolean;
  finalDocument: string | null;
  onCloseDocument: () => void;
  onAddStep: (taskId: string, stepDescription: string) => Promise<void>;
  onUpdateStep: (updatedStep: Step) => void;
  onReorderItems: (source: { parentId: string; index: number }, destination: { parentId: string; index: number }, type: 'task' | 'step') => void;
}

const automationPotentials: Array<Step['automation_potential']> = ['High', 'Medium', 'Low', 'None'];

export const ProcessVisualizer: React.FC<ProcessVisualizerProps> = ({ processFlow, isLoading, onGenerateDocument, isDocLoading, finalDocument, onCloseDocument, onAddStep, onUpdateStep, onReorderItems }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedPotentials, setSelectedPotentials] = useState<string[]>([]);
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // When a new process flow is loaded, expand all nodes by default.
    if (processFlow) {
      const allIds = new Set<string>();
      processFlow.sub_processes.forEach(sp => {
        allIds.add(sp.id);
        sp.tasks.forEach(task => {
          allIds.add(task.id);
        });
      });
      setOpenNodeIds(allIds);
    }
  }, [processFlow]);

  const uniqueRoles = useMemo(() => {
    if (!processFlow) return [];
    const roles = new Set<string>();
    processFlow.sub_processes.forEach(sp => {
      sp.tasks.forEach(task => {
        task.steps.forEach(step => {
          if (step.responsible_role) {
            roles.add(step.responsible_role);
          }
        });
      });
    });
    return Array.from(roles).sort();
  }, [processFlow]);

  const filteredProcessFlow = useMemo(() => {
    if (!processFlow) return null;
    if (!searchQuery && selectedRole === 'all' && selectedPotentials.length === 0) {
      return processFlow;
    }

    const query = searchQuery.toLowerCase();

    const checkStep = (step: Step) => {
      const queryMatch =
        step.name.toLowerCase().includes(query) ||
        step.description.toLowerCase().includes(query) ||
        (step.automation_suggestion || '').toLowerCase().includes(query);

      const roleMatch = selectedRole === 'all' || step.responsible_role === selectedRole;

      const potentialMatch = selectedPotentials.length === 0 || selectedPotentials.includes(step.automation_potential);

      return queryMatch && roleMatch && potentialMatch;
    };

    const filteredSubProcesses = processFlow.sub_processes.map(subProcess => {
      const filteredTasks = subProcess.tasks.map(task => {
        const filteredSteps = task.steps.filter(checkStep);

        // Keep task if its details match or if it has matching steps
        if (
          (task.name.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)) && 
          selectedRole === 'all' && selectedPotentials.length === 0
        ) {
          // If a task text matches but has no matching children, we show all children
          return { ...task };
        }
        
        if (filteredSteps.length > 0) {
            return { ...task, steps: filteredSteps };
        }

        return null;
      }).filter((t): t is Task => t !== null);

      if (
        (subProcess.name.toLowerCase().includes(query) ||
         subProcess.description.toLowerCase().includes(query)) &&
         selectedRole === 'all' && selectedPotentials.length === 0
      ) {
         // If a subprocess text matches but has no matching children, we show all children
         return { ...subProcess };
      }

      if (filteredTasks.length > 0) {
        return { ...subProcess, tasks: filteredTasks };
      }
      return null;
    }).filter((sp): sp is SubProcess => sp !== null);

    return { ...processFlow, sub_processes: filteredSubProcesses };

  }, [processFlow, searchQuery, selectedRole, selectedPotentials]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedPotentials([]);
  };

  const handleToggleNode = (nodeId: string) => {
    setOpenNodeIds(prevIds => {
      const newIds = new Set(prevIds);
      if (newIds.has(nodeId)) {
        newIds.delete(nodeId);
      } else {
        newIds.add(nodeId);
      }
      return newIds;
    });
  };

  const handleExpandAll = () => {
    if (!processFlow) return;
    const allIds = new Set<string>();
    processFlow.sub_processes.forEach(sp => {
      allIds.add(sp.id);
      sp.tasks.forEach(task => {
        allIds.add(task.id);
      });
    });
    setOpenNodeIds(allIds);
  };
  
  const handleCollapseAll = () => {
    setOpenNodeIds(new Set());
  };

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
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex justify-between items-start p-6 pb-4 border-b border-gray-200">
        <div>
            <div className="flex items-baseline gap-3">
                <h2 className="text-2xl font-bold text-gray-800">{processFlow.process_name}</h2>
                <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded-full">v{processFlow.version}</span>
            </div>
            <p className="text-gray-600 mt-1">{processFlow.description}</p>
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
      
      <FilterBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        roles={uniqueRoles}
        selectedRole={selectedRole}
        onSelectedRoleChange={setSelectedRole}
        potentials={automationPotentials}
        selectedPotentials={selectedPotentials}
        onSelectedPotentialsChange={setSelectedPotentials}
        onClearFilters={handleClearFilters}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
      />
      
      <div className="flex-grow overflow-y-auto p-6">
        {filteredProcessFlow && filteredProcessFlow.sub_processes.length > 0 ? (
          filteredProcessFlow.sub_processes.map((subProcess, index) => (
            <ProcessNode key={subProcess.id} type="subprocess" data={subProcess} index={index} isOpen={openNodeIds.has(subProcess.id)} onToggle={() => handleToggleNode(subProcess.id)} parentId="" onReorderItems={onReorderItems}>
              {subProcess.tasks.map((task, taskIndex) => (
                <ProcessNode key={task.id} type="task" data={task} index={taskIndex} onAddStep={onAddStep} isOpen={openNodeIds.has(task.id)} onToggle={() => handleToggleNode(task.id)} parentId={subProcess.id} onReorderItems={onReorderItems}>
                  {task.steps.map((step, stepIndex) => (
                    <ProcessNode key={step.id} type="step" data={step} index={stepIndex} onUpdateStep={onUpdateStep} parentId={task.id} onReorderItems={onReorderItems} />
                  ))}
                </ProcessNode>
              ))}
            </ProcessNode>
          ))
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
            <Icons.Search className="w-16 h-16 mb-4 text-gray-300" />
            <h2 className="text-xl font-bold mb-2">No Results Found</h2>
            <p>Try adjusting your search query or clearing the filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
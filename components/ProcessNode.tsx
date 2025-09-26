
import React, { useState } from 'react';
import type { SubProcess, Task, Step } from '../types';
import { Icons } from './Icons';

type NodeData = SubProcess | Task | Step;
type NodeType = 'subprocess' | 'task' | 'step';

interface ProcessNodeProps {
  type: NodeType;
  data: NodeData;
  index: number;
  children?: React.ReactNode;
}

const getIcon = (type: NodeType) => {
  switch (type) {
    case 'subprocess': return <Icons.Layers className="w-5 h-5" />;
    case 'task': return <Icons.Target className="w-5 h-5" />;
    case 'step': return <Icons.CheckCircle className="w-5 h-5" />;
    default: return null;
  }
};

const getBackgroundColor = (type: NodeType) => {
    switch(type) {
        case 'subprocess': return 'bg-indigo-50 border-indigo-200';
        case 'task': return 'bg-blue-50 border-blue-200';
        case 'step': return 'bg-white border-gray-200';
    }
}

const getAutomationChip = (potential: 'High' | 'Medium' | 'Low' | 'None') => {
    switch(potential) {
        case 'High': return 'bg-green-100 text-green-800';
        case 'Medium': return 'bg-yellow-100 text-yellow-800';
        case 'Low': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

export const ProcessNode: React.FC<ProcessNodeProps> = ({ type, data, index, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className="ml-6 relative pt-4">
        <div className="absolute left-[-1.5rem] top-0 w-6 h-full">
            <div className="h-full w-px bg-gray-300 mx-auto"></div>
            {/* Horizontal line */}
            <div className="absolute top-[2.25rem] h-px w-6 bg-gray-300"></div>
        </div>
      
      <div className={`relative border rounded-lg shadow-sm ${getBackgroundColor(type)}`}>
        <div 
          className="p-4 flex items-start gap-4 cursor-pointer"
          onClick={() => hasChildren && setIsOpen(!isOpen)}
        >
           <div className="absolute left-[-1.5rem] top-[1.65rem] w-6 h-6 bg-gray-100 flex items-center justify-center">
            <span className={`flex items-center justify-center w-5 h-5 rounded-full ${type === 'subprocess' ? 'bg-indigo-600' : 'bg-blue-500'} text-white text-xs font-bold`}>
                {getIcon(type)}
            </span>
           </div>

          <div className="flex-grow">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-gray-900">{data.name}</h3>
                    {'description' in data && <p className="text-sm text-gray-600 mt-1">{data.description}</p>}
                </div>
                {hasChildren && (
                    <button className="text-gray-500 hover:text-gray-800">
                        {isOpen ? <Icons.ChevronUp className="w-5 h-5" /> : <Icons.ChevronDown className="w-5 h-5" />}
                    </button>
                )}
            </div>

            {type === 'step' && 'automation_potential' in data && (
                <div className="mt-3 flex flex-wrap gap-2 items-center text-xs">
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                        <Icons.User className="w-3 h-3 text-gray-600"/>
                        <span className="font-medium text-gray-700">{data.responsible_role}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getAutomationChip(data.automation_potential)}`}>
                        <Icons.Zap className="w-3 h-3"/>
                        <span className="font-medium">Automation: {data.automation_potential}</span>
                    </div>
                    {data.automation_suggestion && (
                         <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            <Icons.Lightbulb className="w-3 h-3"/>
                            <span className="font-medium">{data.automation_suggestion}</span>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
        {hasChildren && isOpen && (
          <div className="pl-4 pb-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

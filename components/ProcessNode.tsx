import React, { useState, useEffect, useRef } from 'react';
import type { SubProcess, Task, Step } from '../types';
import { Icons } from './Icons';

type NodeData = SubProcess | Task | Step;
type NodeType = 'subprocess' | 'task' | 'step';

interface ProcessNodeProps {
  type: NodeType;
  data: NodeData;
  index: number;
  parentId: string;
  onReorderItems: (source: { parentId: string; index: number }, destination: { parentId: string; index: number }, type: 'task' | 'step') => void;
  children?: React.ReactNode;
  onAddStep?: (taskId: string, stepDescription: string) => Promise<void>;
  onUpdateStep?: (updatedStep: Step) => void;
  isOpen?: boolean;
  onToggle?: () => void;
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

export const ProcessNode: React.FC<ProcessNodeProps> = ({ type, data, index, parentId, onReorderItems, children, onAddStep, onUpdateStep, isOpen, onToggle }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newStepText, setNewStepText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<NodeData>(data);
  const [dropIndicator, setDropIndicator] = useState<'top' | 'bottom' | null>(null);
  const nodeContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setEditedData(data);
  }, [data]);

  const hasChildren = React.Children.count(children) > 0;
  const isCollapsible = hasChildren || type === 'task';
  const isDraggable = type === 'task' || type === 'step';


  const handleSaveStep = async () => {
    if (!newStepText.trim() || !onAddStep) return;
    setIsSaving(true);
    try {
      await onAddStep((data as Task).id, newStepText);
      setIsAdding(false);
      setNewStepText('');
    } catch (error) {
      console.error("Failed to save new step", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStep = () => {
    if (!onUpdateStep || type !== 'step') return;
    onUpdateStep(editedData as Step);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedData(data);
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedData(prev => ({ ...prev, [name]: value }));
  };
  
  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ 
        type, 
        id: data.id,
        parentId,
        index,
    }));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        nodeContentRef.current?.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = () => {
    nodeContentRef.current?.classList.remove('dragging');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    try {
        const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
        if (dragData.type !== type || dragData.parentId !== parentId) {
            setDropIndicator(null);
            return;
        }
        
        const rect = nodeContentRef.current!.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
            setDropIndicator('top');
        } else {
            setDropIndicator('bottom');
        }
    } catch (err) {
        // Could fail if dragging from outside
    }
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropIndicator(null);
    const sourceData = JSON.parse(e.dataTransfer.getData('application/json'));
    
    if (sourceData.type !== type || sourceData.parentId !== parentId) {
        return;
    }
    
    // Don't drop on itself
    if (sourceData.id === data.id) return;
    
    let destinationIndex = index;
    if (dropIndicator === 'bottom') {
        destinationIndex += 1;
    }
    
    // Fix: Add a type guard because onReorderItems only accepts 'task' or 'step' types.
    // Although `isDraggable` prevents this handler from being called for 'subprocess',
    // TypeScript doesn't infer this within the function's scope.
    if (type === 'subprocess') {
      return;
    }

    onReorderItems(
        { parentId: sourceData.parentId, index: sourceData.index },
        { parentId: parentId, index: destinationIndex },
        type
    );
  };


  if (type === 'step' && isEditing) {
    const stepData = editedData as Step;
    return (
      <div className="ml-6 relative pt-4">
        <div className="absolute left-[-1.5rem] top-0 w-6 h-full">
          <div className="h-full w-px bg-gray-300 mx-auto"></div>
          <div className="absolute top-[2.25rem] h-px w-6 bg-gray-300"></div>
        </div>
        <div className="relative border-2 border-indigo-500 rounded-lg shadow-lg bg-white p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor={`name-${stepData.id}`} className="block text-sm font-medium text-gray-700">Step Name</label>
            <input type="text" name="name" id={`name-${stepData.id}`} value={stepData.name} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`description-${stepData.id}`} className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" id={`description-${stepData.id}`} value={stepData.description} onChange={handleInputChange} rows={3} className="w-full p-2 border border-gray-300 rounded-md resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`responsible_role-${stepData.id}`} className="block text-sm font-medium text-gray-700">Responsible Role</label>
            <input type="text" name="responsible_role" id={`responsible_role-${stepData.id}`} value={stepData.responsible_role || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor={`automation_potential-${stepData.id}`} className="block text-sm font-medium text-gray-700">Automation Potential</label>
            <select name="automation_potential" id={`automation_potential-${stepData.id}`} value={stepData.automation_potential} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm bg-white">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="None">None</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={handleCancelEdit} className="text-sm font-semibold text-gray-600 py-1.5 px-3 rounded-md hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleUpdateStep} className="text-sm bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-700 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-6 relative pt-4">
        <div className="absolute left-[-1.5rem] top-0 w-6 h-full">
            <div className="h-full w-px bg-gray-300 mx-auto"></div>
            {/* Horizontal line */}
            <div className="absolute top-[2.25rem] h-px w-6 bg-gray-300"></div>
        </div>
      
      <div 
        ref={nodeContentRef} 
        className={`relative border rounded-lg shadow-sm transition-shadow ${getBackgroundColor(type)}`}
        onDragOver={isDraggable ? handleDragOver : undefined}
        onDragLeave={isDraggable ? handleDragLeave : undefined}
        onDrop={isDraggable ? handleDrop : undefined}
      >
        {isDraggable && (
            <>
                {dropIndicator === 'top' && <div className="absolute top-0 left-4 right-4 h-1 bg-indigo-500 rounded-full -translate-y-1/2 z-10" />}
                {dropIndicator === 'bottom' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-indigo-500 rounded-full translate-y-1/2 z-10" />}
            </>
        )}
        <div className="p-4 flex items-start gap-4">
           <div className="absolute left-[-1.5rem] top-[1.65rem] w-6 h-6 bg-gray-100 flex items-center justify-center">
            <span className={`flex items-center justify-center w-5 h-5 rounded-full ${type === 'subprocess' ? 'bg-indigo-600' : 'bg-blue-500'} text-white text-xs font-bold`}>
                {getIcon(type)}
            </span>
           </div>

          <div className="flex-grow">
            <div className="flex justify-between items-start">
                <div 
                  className={isCollapsible ? 'cursor-pointer flex-grow' : 'flex-grow'}
                  onClick={() => isCollapsible && onToggle ? onToggle() : undefined}
                >
                    <h3 className="font-semibold text-gray-900">{data.name}</h3>
                    {'description' in data && <p className="text-sm text-gray-600 mt-1">{data.description}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                   {isDraggable && (
                    <div 
                      draggable 
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      className="cursor-move p-1 text-gray-400 hover:text-gray-700"
                      aria-label="Drag to reorder"
                    >
                      <Icons.GripVertical className="w-5 h-5" />
                    </div>
                  )}
                   {type === 'step' && onUpdateStep && (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                      aria-label="Edit step"
                    >
                      <Icons.Edit className="w-4 h-4" />
                    </button>
                  )}
                  {isCollapsible && (
                    <button 
                      onClick={() => onToggle ? onToggle() : undefined} 
                      className="p-1 rounded-md text-gray-500 hover:text-gray-800 transition-colors"
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                    >
                      {isOpen ? <Icons.ChevronUp className="w-5 h-5" /> : <Icons.ChevronDown className="w-5 h-5" />}
                    </button>
                  )}
                </div>
            </div>

            {type === 'step' && 'automation_potential' in data && (
                <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                            <Icons.User className="w-3 h-3 text-gray-600"/>
                            <span className="font-medium text-gray-700">{data.responsible_role}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getAutomationChip(data.automation_potential)}`}>
                            <Icons.Zap className="w-3 h-3"/>
                            <span className="font-medium">Automation: {data.automation_potential}</span>
                        </div>
                    </div>
                    {data.automation_suggestion && (
                         <div className="flex items-start gap-2 text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                            <Icons.Lightbulb className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0"/>
                            <div>
                                <span className="font-semibold">Suggestion: </span>
                                <span>{data.automation_suggestion}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
        {isOpen && (
          <div className="pl-4 pb-2">
            {children}

            {type === 'task' && onAddStep && (
              <div className="ml-6 pt-4">
                {isAdding ? (
                  <div className="p-3 bg-white rounded-md border border-gray-300">
                    <label htmlFor={`add-step-${data.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      New Step Description
                    </label>
                    <textarea
                      id={`add-step-${data.id}`}
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                      placeholder="e.g., 'Submit expense report through Concur'"
                      className="w-full p-2 border border-gray-300 rounded-md resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm min-h-[60px]"
                      disabled={isSaving}
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button
                        onClick={() => { setIsAdding(false); setNewStepText(''); }}
                        disabled={isSaving}
                        className="text-sm font-semibold text-gray-600 py-1.5 px-3 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveStep}
                        disabled={!newStepText.trim() || isSaving}
                        className="flex items-center justify-center gap-1.5 text-sm bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <Icons.Loader className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Step"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Icons.PlusCircle className="w-4 h-4" />
                    <span>Add a new step</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

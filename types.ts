
export interface Step {
  id: string;
  name: string;
  description: string;
  automation_potential: 'High' | 'Medium' | 'Low' | 'None';
  automation_suggestion?: string;
  responsible_role?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  steps: Step[];
}

export interface SubProcess {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
}

export interface ProcessFlow {
  process_name: string;
  description: string;
  version: string;
  sub_processes: SubProcess[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface LoadingStates {
  flow: boolean;
  chat: boolean;
  doc: boolean;
}

export type AiProvider = 'gemini' | 'azure' | 'ollama';

export interface AzureConfig {
  endpoint: string;
  deployment: string;
  apiKey: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface AiConfig {
    provider: AiProvider;
    azure: AzureConfig;
    ollama: OllamaConfig;
}

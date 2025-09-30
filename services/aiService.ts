import type { ChatMessage, ProcessFlow, AiConfig } from '../types';
import * as gemini from './geminiService';
import * as azure from './azureService';
import * as ollama from './ollamaService';

type AiProviderService = typeof gemini;

const getProvider = (config: AiConfig): AiProviderService => {
    switch (config.provider) {
        case 'azure':
            return azure;
        case 'ollama':
            return ollama;
        case 'gemini':
        default:
            return gemini;
    }
}

export const generateInitialFlow = (
    source: { text?: string; file?: { mimeType: string; data: string; } }, 
    config: AiConfig
): Promise<ProcessFlow> => {
    if (source.file && config.provider !== 'gemini') {
        return Promise.reject(new Error(`File uploads are only supported by the Gemini provider.`));
    }
    return getProvider(config).generateInitialFlow(source, config);
};

export const refineFlowWithChat = (
    chatHistory: ChatMessage[], 
    currentProcessFlow: ProcessFlow, 
    config: AiConfig
): Promise<{ updatedFlow: ProcessFlow, aiResponse: string }> => {
    return getProvider(config).refineFlowWithChat(chatHistory, currentProcessFlow, config);
};

export const enrichStepAndReturnFullFlow = (
    currentProcessFlow: ProcessFlow,
    taskId: string,
    stepDescription: string,
    config: AiConfig,
): Promise<ProcessFlow> => {
    return getProvider(config).enrichStepAndReturnFullFlow(currentProcessFlow, taskId, stepDescription, config);
};

export const generateFinalDocument = (
    processFlow: ProcessFlow, 
    config: AiConfig
): Promise<string> => {
    return getProvider(config).generateFinalDocument(processFlow, config);
};

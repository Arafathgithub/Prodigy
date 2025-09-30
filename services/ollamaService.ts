import type { ChatMessage, ProcessFlow, AiConfig } from '../types';
import { processFlowSchemaForPrompt, chatRefinementSchemaForPrompt } from './schemas';

const getApiUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}/api/chat`;

const parseJsonResponse = (jsonText: string) => {
    const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    const extractedJson = match ? match[1] : jsonText;
    try {
        return JSON.parse(extractedJson);
    } catch (e) {
        console.error("Failed to parse JSON from Ollama response:", extractedJson);
        throw new Error("Could not parse the JSON from the model's response.");
    }
}

async function makeOllamaRequest(config: AiConfig, system: string, user: string, useJsonFormat: boolean = true) {
    const { ollama } = config;
    if (!ollama.baseUrl || !ollama.model) {
        throw new Error("Ollama is not configured. Please check settings.");
    }

    const response = await fetch(getApiUrl(ollama.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: ollama.model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            format: useJsonFormat ? 'json' : undefined,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data.message.content;
}

export const generateInitialFlow = async (source: { text?: string }, config: AiConfig): Promise<ProcessFlow> => {
    const systemInstruction = `You are a business process analyst. Your task is to analyze the provided document and convert it into a structured JSON object that adheres to the provided JSON schema. Your entire response must be a single, valid JSON object, with no other text.`;
    const userPrompt = `
JSON Schema to follow:
\`\`\`json
${JSON.stringify(processFlowSchemaForPrompt, null, 2)}
\`\`\`

Document to analyze:
---
${source.text}
---

Generate the JSON object now.`;
    
    const jsonText = await makeOllamaRequest(config, systemInstruction, userPrompt);
    return parseJsonResponse(jsonText);
};

export const refineFlowWithChat = async (chatHistory: ChatMessage[], currentProcessFlow: ProcessFlow, config: AiConfig): Promise<{ updatedFlow: ProcessFlow, aiResponse: string }> => {
    const systemInstruction = `You are a helpful business process analyst refining a process flow based on a chat with an expert.
- You will be given the current process flow JSON and the chat history.
- Analyze the user's latest message and update the JSON object accordingly, returning the *entire* valid JSON object.
- Also provide a conversational response to the user.
- Your final output must be a single JSON object with two keys: "updatedFlow" (the complete, modified process flow) and "aiResponse" (your text response to the user).`;
    
    const formattedHistory = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');

    const userPrompt = `
Your required output format is this JSON schema:
\`\`\`json
${JSON.stringify(chatRefinementSchemaForPrompt, null, 2)}
\`\`\`

Current Process Flow JSON:
---
${JSON.stringify(currentProcessFlow, null, 2)}
---

Chat History:
---
${formattedHistory}
---

Based on the last user message, generate the required JSON object with the updated flow and your AI response.`;

    const jsonText = await makeOllamaRequest(config, systemInstruction, userPrompt);
    return parseJsonResponse(jsonText);
};

export const enrichStepAndReturnFullFlow = async (currentProcessFlow: ProcessFlow, taskId: string, stepDescription: string, config: AiConfig): Promise<ProcessFlow> => {
    const systemInstruction = `You are a business process analyst AI. Your task is to update a process flow JSON object by adding a new step to a specific task and returning the complete, updated flow. Your entire response must be a single, valid JSON object.`;

    const userPrompt = `
Current Process Flow JSON:
---
${JSON.stringify(currentProcessFlow, null, 2)}
---

Task to modify:
- Task ID: "${taskId}"

New step to add:
- Step Description: "${stepDescription}"

Instructions:
1. Create a complete JSON object for the new step. Infer the 'name' (a short title), 'responsible_role', and 'automation_potential' based on the description and context.
2. Generate a new unique ID for the step.
3. Add this new step to the "steps" array within the task with ID "${taskId}".
4. Return the *entire*, updated JSON object for the process flow.`;

    const jsonText = await makeOllamaRequest(config, systemInstruction, userPrompt);
    return parseJsonResponse(jsonText);
};

export const generateFinalDocument = async (processFlow: ProcessFlow, config: AiConfig): Promise<string> => {
    const systemInstruction = `You are an expert technical writer.`;
    const userPrompt = `Based on the following JSON process flow, generate a comprehensive, well-structured Standard Operating Procedure (SOP) document in Markdown format. The document should be professional, clear, and easy to follow. Include all details such as process name, description, sub-processes, tasks, steps, responsible roles, and automation notes.

Process Flow JSON:
---
${JSON.stringify(processFlow, null, 2)}
---
`;
    return makeOllamaRequest(config, systemInstruction, userPrompt, false);
};

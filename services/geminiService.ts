
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, ProcessFlow, AiConfig } from '../types';
import { processFlowSchemaForGemini, chatRefinementSchemaForGemini } from "./schemas";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


export const generateInitialFlow = async (source: { text?: string; file?: { mimeType: string; data: string; } }, _config: AiConfig): Promise<ProcessFlow> => {
    let contents: any;

    if (source.file) {
        // Files are not supported by other providers in this implementation, so this remains Gemini-specific logic
        const filePart = {
            inlineData: {
                mimeType: source.file.mimeType,
                data: source.file.data,
            },
        };
        const textPart = {
            text: `Analyze the provided document and convert it into a structured JSON object representing the process flow. Identify all sub-processes, tasks, and individual steps. For each step, determine the responsible role and assess its potential for automation. The document can be of various formats like TXT, PDF, or DOCX. Extract the content and perform the analysis.`
        };
        contents = { parts: [textPart, filePart] };
    } else if (source.text) {
        contents = `Analyze the provided Standard Operating Procedure (SOP) document and convert it into a structured JSON object representing the process flow. Identify all sub-processes, tasks, and individual steps. For each step, determine the responsible role and assess its potential for automation.

Document:
---
${source.text}
---
`;
    } else {
        throw new Error("No document source provided.");
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: processFlowSchemaForGemini,
        },
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText) as ProcessFlow;
    } catch (e) {
        console.error("Failed to parse initial flow JSON:", jsonText);
        throw new Error("Could not parse the process flow from the model's response.");
    }
};

export const refineFlowWithChat = async (chatHistory: ChatMessage[], currentProcessFlow: ProcessFlow, _config: AiConfig): Promise<{ updatedFlow: ProcessFlow, aiResponse: string }> => {
    const systemInstruction = `You are a helpful and brilliant business process analyst. Your goal is to refine a JSON representation of a business process based on a conversation with a Subject Matter Expert (SME).
- You will be given the current process flow as a JSON object and the recent chat history.
- Analyze the user's latest message in the context of the chat history and the current process flow.
- If the user provides new information or a correction, update the JSON object accordingly. Ensure you return the *entire*, valid JSON object.
- If the user's request is ambiguous or you identify a gap, ask a specific, targeted clarifying question.
- Always provide a conversational response to the SME to confirm your changes or to ask your question.
- Do not change any 'id' fields. You may add new items with new unique ids.`;
    
    const formattedHistory = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `
Current Process Flow JSON:
---
${JSON.stringify(currentProcessFlow, null, 2)}
---

Chat History:
---
${formattedHistory}
---

Based on the last user message, update the process flow JSON and provide a response to the user.
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: chatRefinementSchemaForGemini,
        },
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse chat refinement JSON:", jsonText);
        throw new Error("Could not parse the refinement from the model's response.");
    }
};

export const enrichStepAndReturnFullFlow = async (
    currentProcessFlow: ProcessFlow,
    taskId: string,
    stepDescription: string,
    _config: AiConfig,
): Promise<ProcessFlow> => {
    const prompt = `
You are a business process analyst AI. Your task is to update a process flow JSON object by adding a new step to a specific task.

Current Process Flow JSON:
---
${JSON.stringify(currentProcessFlow, null, 2)}
---

Task to modify:
- Task ID: "${taskId}"

New step to add:
- Step Description: "${stepDescription}"

Instructions:
1.  Create a complete JSON object for the new step. Infer the 'name' (a short title), 'responsible_role', and 'automation_potential' based on the provided description and the context of the other steps in the task.
2.  Generate a new unique ID for the step (e.g., if the last step was 'step_x_y_z', the new one could be 'step_x_y_{z+1}').
3.  Add this new step object to the end of the "steps" array within the task that has the ID "${taskId}".
4.  Return the *entire*, updated JSON object for the process flow. The returned JSON must be valid and adhere to the schema. Do not change any other part of the process flow.
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: processFlowSchemaForGemini,
        },
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText) as ProcessFlow;
    } catch (e) {
        console.error("Failed to parse enriched step flow JSON:", jsonText);
        throw new Error("Could not parse the updated process flow from the model's response.");
    }
};

export const generateFinalDocument = async (processFlow: ProcessFlow, _config: AiConfig): Promise<string> => {
    const prompt = `Based on the following JSON process flow, generate a comprehensive, well-structured Standard Operating Procedure (SOP) document in Markdown format. The document should be professional, clear, and easy to follow. Include all details such as process name, description, sub-processes, tasks, steps, responsible roles, and automation notes.

Process Flow JSON:
---
${JSON.stringify(processFlow, null, 2)}
---
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });

    return response.text;
};

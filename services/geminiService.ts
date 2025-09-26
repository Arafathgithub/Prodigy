import { GoogleGenAI, Type } from "@google/genai";
import type { ChatMessage, ProcessFlow } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const processFlowSchema = {
    type: Type.OBJECT,
    properties: {
        process_name: { type: Type.STRING, description: "The overall name of the business process." },
        description: { type: Type.STRING, description: "A brief, one-sentence summary of the process's objective." },
        version: { type: Type.STRING, description: "The version number of the document, if available." },
        sub_processes: {
            type: Type.ARRAY,
            description: "An array of the main phases or sub-processes within the overall process.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique identifier for the sub-process (e.g., 'sub_1')." },
                    name: { type: Type.STRING, description: "The name of this sub-process or phase." },
                    description: { type: Type.STRING, description: "A brief description of this sub-process." },
                    tasks: {
                        type: Type.ARRAY,
                        description: "An array of distinct tasks within this sub-process.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING, description: "A unique identifier for the task (e.g., 'task_1_1')." },
                                name: { type: Type.STRING, description: "The name of the task." },
                                description: { type: Type.STRING, description: "A brief description of the task." },
                                steps: {
                                    type: Type.ARRAY,
                                    description: "An array of individual steps to complete the task.",
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING, description: "A unique identifier for the step (e.g., 'step_1_1_1')." },
                                            name: { type: Type.STRING, description: "A short name for the step, like a heading." },
                                            description: { type: Type.STRING, description: "A detailed description of the action to be taken in this step." },
                                            automation_potential: {
                                                type: Type.STRING,
                                                enum: ['High', 'Medium', 'Low', 'None'],
                                                description: "An assessment of how easily this step could be automated."
                                            },
                                            automation_suggestion: { type: Type.STRING, description: "If automation potential is High or Medium, a brief suggestion on how (e.g., 'Automated email notification', 'RPA bot for data entry')." },
                                            responsible_role: { type: Type.STRING, description: "The job title or role responsible for this step (e.g., 'HR Coordinator', 'IT Technician')." }
                                        },
                                        required: ["id", "name", "description", "automation_potential", "responsible_role"],
                                    },
                                },
                            },
                            required: ["id", "name", "description", "steps"],
                        },
                    },
                },
                required: ["id", "name", "description", "tasks"],
            },
        },
    },
    required: ["process_name", "description", "sub_processes"],
};


export const generateInitialFlow = async (documentText: string): Promise<ProcessFlow> => {
    const prompt = `Analyze the provided Standard Operating Procedure (SOP) document and convert it into a structured JSON object representing the process flow. Identify all sub-processes, tasks, and individual steps. For each step, determine the responsible role and assess its potential for automation.

Document:
---
${documentText}
---
`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: processFlowSchema,
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

const chatRefinementSchema = {
    type: Type.OBJECT,
    properties: {
        updatedFlow: processFlowSchema,
        aiResponse: { type: Type.STRING, description: "A conversational, friendly response to the user explaining the changes made to the flow or asking a clarifying question." }
    },
    required: ["updatedFlow", "aiResponse"],
};

export const refineFlowWithChat = async (chatHistory: ChatMessage[], currentProcessFlow: ProcessFlow): Promise<{ updatedFlow: ProcessFlow, aiResponse: string }> => {
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
            responseSchema: chatRefinementSchema,
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
    stepDescription: string
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
            responseSchema: processFlowSchema,
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

export const generateFinalDocument = async (processFlow: ProcessFlow): Promise<string> => {
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
import { Type } from "@google/genai";

const commonProperties = {
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
};

// For Gemini API with specific types
export const processFlowSchemaForGemini = {
    type: Type.OBJECT,
    properties: commonProperties,
    required: ["process_name", "description", "sub_processes"],
};

export const chatRefinementSchemaForGemini = {
    type: Type.OBJECT,
    properties: {
        updatedFlow: processFlowSchemaForGemini,
        aiResponse: { type: Type.STRING, description: "A conversational, friendly response to the user explaining the changes made to the flow or asking a clarifying question." }
    },
    required: ["updatedFlow", "aiResponse"],
};

// For general prompts to other LLMs
const convertSchemaForPrompt = (schema: any): any => {
    if (typeof schema !== 'object' || schema === null) {
        return schema;
    }
    const newSchema: { [key: string]: any } = {};
    for (const key in schema) {
        if (key === 'type') {
            newSchema[key] = schema[key].toLowerCase();
        } else if (key === 'items' || key === 'properties') {
            newSchema[key] = convertSchemaForPrompt(schema[key]);
        } else if (Array.isArray(schema[key])) {
             newSchema[key] = schema[key].map((item: any) => convertSchemaForPrompt(item));
        }
         else {
            if (key !== 'description') { // descriptions are for the model, but not part of standard JSON schema output
                 newSchema[key] = schema[key];
            }
        }
    }
    return newSchema;
}

const commonPropertiesForPrompt = JSON.parse(JSON.stringify(commonProperties));
delete (commonPropertiesForPrompt as any).process_name.description;
delete (commonPropertiesForPrompt as any).description.description;
// Descriptions are useful for the model, so we won't delete them all, but the Gemini `Type` enum needs to be removed.
// A simple string replace is easiest for this deep object.
const schemaString = JSON.stringify(commonProperties);
const promptSchemaString = schemaString.replace(/"(STRING|ARRAY|OBJECT|NUMBER|INTEGER|BOOLEAN)"/g, (match) => `"${match.slice(1,-1).toLowerCase()}"`);

export const processFlowSchemaForPrompt = {
    type: "object",
    properties: JSON.parse(promptSchemaString),
    required: ["process_name", "description", "sub_processes"],
}

export const chatRefinementSchemaForPrompt = {
    type: "object",
    properties: {
        updatedFlow: processFlowSchemaForPrompt,
        aiResponse: { type: "string" }
    },
    required: ["updatedFlow", "aiResponse"],
};

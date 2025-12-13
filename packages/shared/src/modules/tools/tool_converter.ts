import { Tool as AnthropicTool } from '@anthropic-ai/sdk/resources/index'
import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'

export function convertToAnthropicTool  (tool: OpenAITool): AnthropicTool {
    const properties: Record<string, any> = {}
    const required: string[] = []

    if (tool.type === 'function' && tool.function?.parameters?.properties) {
        const requiredArray = Array.isArray(tool.function.parameters.required) 
            ? tool.function.parameters.required 
            : []
        const requiredParams = new Set(requiredArray)
        for (const [paramName, param] of Object.entries(tool.function.parameters.properties)) {
            if (requiredParams.has(paramName)) {
                required.push(paramName)
            }
            const typedParam = param as any
            const paramType: string = typedParam.type || "string"

            const paramSchema: any = {
                type: paramType,
                description: typedParam.description,
            }

            if (paramType === "array" && typedParam.items) {
                paramSchema.items = typedParam.items
            }

            if (paramType === "object" && typedParam.properties) {
                paramSchema.properties = typedParam.properties
            }

            const reservedKeys = new Set([
                "name",
                "required",
                "instruction",
                "usage",
                "dependencies",
                "description",
                "contextRequirements",
                "type",
                "items",
                "properties",
            ])
            for (const key in typedParam) {
                if (!reservedKeys.has(key) && typedParam[key] !== undefined) {
                    paramSchema[key] = typedParam[key]
                }
            }
            properties[paramName] = paramSchema
        }
    }

    const toolInputSchema: AnthropicTool = {
        name: tool.type === 'function' ? tool.function.name : '',
        description: tool.type === 'function' ? tool.function.description : '',
        input_schema: {
            type: "object",
            properties,
            required,
        },
    }

    return toolInputSchema
}

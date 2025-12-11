import { Tool as AnthropicTool } from '@anthropic-ai/sdk/resources/index'
import { FunctionDeclaration as GoogleTool } from '@google/genai'
import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ApiStreamToolCall } from '../providers/stream'
import ReplaceToolHandler from './replace_in_file'
import WriteFileToolHandler from './write_to_file'
import { TaskContext } from '../task'
import { TodoToolHandler } from "./update_todo_list";
import { WebSearchToolHandler } from "./web_search";

export type AbstractTool = OpenAITool | AnthropicTool | GoogleTool

// Define available tool ids
export enum AbstractDefaultTool {
  ASK = 'ask_followup_question',
  ATTEMPT = 'attempt_completion',
  BASH = 'execute_command',
  FILE_EDIT = 'replace_in_file',
  FILE_READ = 'read_file',
  FILE_NEW = 'write_to_file',
  SEARCH = 'search_files',
  LIST_FILES = 'list_files',
  LIST_CODE_DEF = 'list_code_definition_names',
  BROWSER = 'browser_action',
  MCP_USE = 'use_mcp_tool',
  MCP_ACCESS = 'access_mcp_resource',
  MCP_DOCS = 'load_mcp_documentation',
  NEW_TASK = 'new_task',
  PLAN_MODE = 'plan_mode_respond',
  TODO = 'focus_chain',
  WEB_FETCH = 'web_fetch',
  CONDENSE = 'condense',
  SUMMARIZE_TASK = 'summarize_task',
  REPORT_BUG = 'report_bug',
  NEW_RULE = 'new_rule',
  APPLY_PATCH = 'apply_patch',
}

export const toolUseNames = Object.values(
  AbstractDefaultTool,
) as AbstractDefaultTool[]

export interface ToolHandler {
  tool(): OpenAITool
  setContext?(context: TaskContext): void
  execute(tool: ApiStreamToolCall, context?: TaskContext): Promise<string>
}

/**
 * Converts a ClineToolSpec into an Anthropic Tool definition
 */
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
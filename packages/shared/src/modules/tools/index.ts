import { Tool as AnthropicTool } from '@anthropic-ai/sdk/resources/index'
import { FunctionDeclaration as GoogleTool } from '@google/genai'
import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ApiStreamToolCall } from '../providers/stream'
import ReplaceToolHandler, { ReplaceTool } from './replace_in_file'
import WriteFileToolHandler, { WriteFileTool } from './write_to_file'
import { TaskContext } from '@/task'

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

// Array of all tool names for compatibility
// Automatically generated from the enum values
export const toolUseNames = Object.values(
  AbstractDefaultTool,
) as AbstractDefaultTool[]

export interface ToolHandler {
  setContext?(context: TaskContext): void
  execute(tool: ApiStreamToolCall, context?: TaskContext): Promise<string>
}

export function getToolHandler(toolName: string): ToolHandler | undefined {
  switch (toolName) {
    case 'replace_in_file':
      return new ReplaceToolHandler()
    case 'write_to_file':
      return new WriteFileToolHandler()
    default:
      return undefined
  }
}

export function getTools(): AbstractTool[] {
  return [ReplaceTool, WriteFileTool]
}

/**
 * Converts a ClineToolSpec into an Anthropic Tool definition
 */
export function convertToAnthropicTool  (tool: OpenAITool): AnthropicTool {
    // Build the properties object for parameters
    const properties: Record<string, any> = {}
    const required: string[] = []

    if (tool.function?.parameters?.properties) {
        const requiredArray = Array.isArray(tool.function.parameters.required) 
            ? tool.function.parameters.required 
            : []
        const requiredParams = new Set(requiredArray)
        for (const [paramName, param] of Object.entries(tool.function.parameters.properties)) {
            if (requiredParams.has(paramName)) {
                required.push(paramName)
            }
            const paramType: string = param.type || "string"

            const paramSchema: any = {
                type: paramType,
                description: param.description,
            }

            // Add items for array types
            if (paramType === "array" && param.items) {
                paramSchema.items = param.items
            }

            // Add properties for object types
            if (paramType === "object" && param.properties) {
                paramSchema.properties = param.properties
            }

            // Preserve any additional JSON Schema fields from MCP tools
            // (e.g., enum, format, minimum, maximum, etc.)
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
            for (const key in param) {
                if (!reservedKeys.has(key) && param[key] !== undefined) {
                    paramSchema[key] = param[key]
                }
            }
            properties[paramName] = paramSchema
        }
    }

    // Build the Tool object
    const toolInputSchema: AnthropicTool = {
        name: tool.function.name,
        description: tool.function.description,
        input_schema: {
            type: "object",
            properties,
            required,
        },
    }

    return toolInputSchema
}
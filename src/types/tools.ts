import { Tool as AnthropicTool } from '@anthropic-ai/sdk/resources/index'
import { FunctionDeclaration as GoogleTool } from '@google/genai'
import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ApiStreamToolCall } from './stream'
import { TaskContext, ToolContext } from './context'

export type AbstractTool = OpenAITool | AnthropicTool | GoogleTool

export interface ToolConfig {
  humanInLoop?: boolean
  displayName?: string
}

export interface ToolHandler {
  getConfig(): ToolConfig
  tool(): OpenAITool
  setContext?(context: TaskContext): void
  execute(tool: ApiStreamToolCall, context?: ToolContext): Promise<string>
}
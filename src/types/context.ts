import { ModelConfig } from './common'
import { ISystemPromptBuilder } from './prompt'
import { ToolHandler } from './tools'

export interface TaskContext {
  modelConfig?: ModelConfig
  variables?: Record<string, string>
  systemPromptBuilder?: ISystemPromptBuilder
  tools?: ToolHandler[]
  workspacePath?: string
}

export interface ToolContext {
  taskContext: TaskContext
  isPartial: boolean
}


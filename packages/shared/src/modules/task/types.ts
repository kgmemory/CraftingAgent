import {ISystemPromptBuilder} from "../prompt";
import { ToolHandler } from "../tools";

export interface TaskContext {
  modelConfig?: ModelConfig
  variables?: Record<string, string>
  systemPromptBuilder?: ISystemPromptBuilder
  tools?: ToolHandler[]
}

/*
db schema
*/

export interface Task {
  id?: string
  projectId?: string
  name?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ContentBlock {
  type?: string
  text?: string
  image_url?: { url: string }
  tool_use_id?: string
  name?: string
  input?: Record<string, any>
  content?: string | ContentBlock[]
}

export interface ChatMessage {
  id?: string
  projectId?: string
  taskId?: string
  conversationRound?: number
  messageOrder?: number
  role?: string
  content?: ContentBlock[]
  createdAt?: Date
  updatedAt?: Date
}

export interface Project {
  id?: string
  name?: string
  settings?: Record<string, any>
  modelConfig?: ModelConfig
  createdAt?: Date
  updatedAt?: Date
}

export interface Config {
  id?: string
  category?: string
  key?: string
  val?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ModelConfig {
  agentModel?: ProviderConfig
}

export interface ProviderConfig {
  provider?: 'minimax' | 'doubao' | 'openrouter' | 'google'
  apiKey?: string
  baseUrl?: string
  modelName?: string
  maxTokens?: number
}

export interface UserInstruction {
    type?: string
    text?: string
}
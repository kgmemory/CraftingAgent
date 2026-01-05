import Anthropic from '@anthropic-ai/sdk'
import { AbstractTool } from './tools'

export type ApiStream = AsyncGenerator<ApiStreamChunk>
export type ApiStreamChunk =
  | ApiStreamTextChunk
  | ApiStreamReasoningChunk
  | ApiStreamAnthropicThinkingChunk
  | ApiStreamAnthropicRedactedThinkingChunk
  | ApiStreamUsageChunk
  | ApiStreamToolCallsChunk
  | ApiStreamImageChunk

export interface ApiStreamTextChunk {
  type: 'text'
  text: string
}

export interface ApiStreamImageChunk {
  type: 'image'
  data: string[] | undefined
  text: string | undefined
  thinking: string | undefined
}

export interface ApiStreamReasoningChunk {
  type: 'reasoning'
  reasoning: string
}

export interface ApiStreamAnthropicThinkingChunk {
  type: 'ant_thinking'
  thinking: string
  signature: string
}

export interface ApiStreamAnthropicRedactedThinkingChunk {
  type: 'ant_redacted_thinking'
  data: string
}

export interface ApiStreamUsageChunk {
  type: 'usage'
  inputTokens: number
  outputTokens: number
  cacheWriteTokens?: number
  cacheReadTokens?: number
  thoughtsTokenCount?: number
  totalCost?: number
}

export interface ApiStreamToolCallsChunk {
  type: 'tool_calls'
  tool_call: ApiStreamToolCall
}

export interface ApiStreamToolCall {
  call_id?: string
  function: {
    id?: string
    name?: string
    arguments?: any
  }
}

export interface ApiHandler {
  chatCompletion: (
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
    tools?: AbstractTool[],
  ) => ApiStream
}

export interface GenerateApiHandler {
  generateContent: (
    userInstruction: string,
    messages: Anthropic.Messages.MessageParam[],
    config: AgentImageConfig,
  ) => Promise<ApiStreamImageChunk>
}

export type AgentImageConfig = {
  aspectRatio?: string
  imageSize?: string
  googleSearch?: boolean
}


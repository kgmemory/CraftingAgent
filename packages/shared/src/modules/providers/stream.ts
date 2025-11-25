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
  data: string | undefined
  text: string | undefined
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
  thoughtsTokenCount?: number // openrouter
  totalCost?: number // openrouter
}

export interface ApiStreamToolCallsChunk {
  type: 'tool_calls'
  tool_call: ApiStreamToolCall
}

export interface ApiStreamToolCall {
  call_id?: string // The call / request ID associated with this tool call
  // Information about the tool being called
  function: {
    id?: string // The tool call ID
    name?: string
    arguments?: any
  }
}


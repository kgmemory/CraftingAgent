import { ApiHandler, ApiStream } from './index'
import { ProviderConfig, AbstractTool } from '../types'
import { convertToAnthropicTool } from '../tools/index'
import Anthropic from '@anthropic-ai/sdk'
import { Stream } from '@anthropic-ai/sdk/core/streaming'
import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'

export class MinimaxHandler implements ApiHandler {
  private client: Anthropic | undefined

  constructor(private readonly minimaxConfig: ProviderConfig) {}

  private ensureClient(): Anthropic {
    if (!this.client) {
      if (!this.minimaxConfig.apiKey) {
        throw new Error('MiniMax API key is required')
      }
      try {
        this.client = new Anthropic({
          baseURL: 'https://api.minimaxi.com/anthropic',
          apiKey: this.minimaxConfig.apiKey,
          dangerouslyAllowBrowser: true,
          fetch: async (url, init) => {
            // 移除所有 Stainless 相关的请求头
            if (init?.headers) {
              const headers = new Headers(init.headers)
              const stainlessHeaders = [
                'x-stainless-arch',
                'x-stainless-lang',
                'x-stainless-os',
                'x-stainless-package-version',
                'x-stainless-retry-count',
                'x-stainless-runtime',
                'x-stainless-runtime-version',
                'x-stainless-timeout',
              ]
              stainlessHeaders.forEach(header => headers.delete(header))
              init = { ...init, headers }
            }
            return fetch(url, init)
          },
        })
        } catch (error: any) {
        throw new Error(`Error creating MiniMax client: ${error.message}`)
      }
    }
    return this.client
  }

  async *chatCompletion(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
    tools?: AbstractTool[],
  ): ApiStream {
    const client = this.ensureClient()
    const anthropicTools =   tools?.map(tool =>
        convertToAnthropicTool(tool as OpenAITool))
    const stream: Stream<Anthropic.RawMessageStreamEvent> =
      await client.messages.create({
        model: this.minimaxConfig.modelName || '',
        max_tokens: this.minimaxConfig.maxTokens || 8192,
        temperature: 1.0,
        system: systemPrompt,
        messages: messages,
        stream: true,
        tools: anthropicTools || undefined,
        tool_choice: { type: 'any' },
      })

    const lastStartedToolCall = { id: '', name: '', arguments: '' }
    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'message_start':
          const usage = chunk.message.usage
          yield {
            type: 'usage',
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            cacheReadTokens: usage.cache_creation_input_tokens || 0,
            cacheWriteTokens: usage.cache_read_input_tokens || 0,
          }
          break
        case 'content_block_start':
          switch (chunk.content_block.type) {
            case 'thinking':
              yield {
                type: 'reasoning',
                reasoning: chunk.content_block.thinking || '',
              }
              break
            case 'tool_use':
              if (chunk.content_block.id && chunk.content_block.name) {
                lastStartedToolCall.id = chunk.content_block.id
                lastStartedToolCall.name = chunk.content_block.name
                lastStartedToolCall.arguments = ''
              }
              break
            case 'text':
              yield {
                type: 'text',
                text: chunk.content_block.text,
              }
              break
          }
          break
        case 'content_block_delta':
          switch (chunk.delta.type) {
            case 'thinking_delta':
              yield {
                type: 'reasoning',
                reasoning: chunk.delta.thinking,
              }
              break
            case 'input_json_delta':
              if (chunk.delta.partial_json) {
                yield {
                  type: 'tool_calls',
                  tool_call: {
                    function: {
                      id: lastStartedToolCall.id,
                      name: lastStartedToolCall.name,
                      arguments:
                        lastStartedToolCall.arguments +
                        chunk.delta.partial_json,
                    },
                  },
                }
              }
              break
            case 'text_delta':
              yield {
                type: 'text',
                text: chunk.delta.text,
              }
              break
          }
          break
        case 'content_block_stop':
          lastStartedToolCall.id = ''
          lastStartedToolCall.name = ''
          lastStartedToolCall.arguments = ''
          break
      }
    }
  }
}

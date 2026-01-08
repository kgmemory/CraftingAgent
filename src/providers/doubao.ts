import { ApiHandler, ApiStream } from './index'
import { ProviderConfig, AbstractTool } from '../types'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { convertToOpenAiMessages } from './message_converer'
import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'

export class DoubaoHandler implements ApiHandler {
  private client: OpenAI | undefined

  constructor(private readonly doubaoConfig: ProviderConfig) {}

  private ensureClient(): OpenAI {
    if (!this.client) {
      if (!this.doubaoConfig.apiKey) {
        throw new Error('Doubao API key is required')
      }
      try {
        this.client = new OpenAI({
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3/',
          apiKey: this.doubaoConfig.apiKey,
          dangerouslyAllowBrowser: true,
        })
      } catch (error: any) {
        throw new Error(`Error creating Doubao client: ${error.message}`)
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

    const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...convertToOpenAiMessages(messages),
    ]

    const stream = await client.chat.completions.create({
      model: this.doubaoConfig.modelName || '',
      messages: openAiMessages,
      max_tokens: this.doubaoConfig.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0,
      tools: (tools as OpenAITool[]) || undefined,
    })


    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (delta?.content) {
        yield {
          type: 'text',
          text: delta.content,
        }
      }

      if (delta && 'reasoning_content' in delta && delta.reasoning_content) {
        yield {
          type: 'reasoning',
          reasoning: (delta.reasoning_content as string | undefined) || '',
        }
      }

      if (delta?.tool_calls) {
      }

      if (chunk.usage) {
        yield {
          type: 'usage',
          inputTokens: chunk.usage.prompt_tokens || 0,
          outputTokens: chunk.usage.completion_tokens || 0,
          // @ts-expect-error-next-line
          cacheReadTokens: chunk.usage.prompt_cache_hit_tokens || 0,
          // @ts-expect-error-next-line
          cacheWriteTokens: chunk.usage.prompt_cache_miss_tokens || 0,
        }
      }
    }
  }
}

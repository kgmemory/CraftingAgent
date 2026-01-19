import { ApiHandler, ApiStream } from './index'
import { ProviderConfig, AbstractTool } from '../types'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { convertToOpenAiMessages, processOpenAIStream } from './message_converer'
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

    yield* processOpenAIStream(stream, {
        enableErrorHandling: true,
        enableToolCalls: true,
        enableReasoning: true,
    })
  }
}

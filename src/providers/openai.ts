import {ApiHandler, GenerateApiHandler, AgentImageConfig, ApiStream, ApiStreamImageChunk} from './index'
import { ProviderConfig, AbstractTool } from '../types'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import {convertToOpenAiMessages} from './message_converer'

export class OpenAIHandler implements ApiHandler, GenerateApiHandler {
  private providerConfig: ProviderConfig
  private client: OpenAI | undefined
  private lastGenerationId: string | null = null

  constructor(providerConfig: ProviderConfig) {
    this.providerConfig = providerConfig
  }

  createOpenaiClient(): OpenAI {
    if (this.client) {
      return this.client
    }
    try {
      this.client = new OpenAI({
        baseURL: this.providerConfig.baseUrl,
        apiKey: this.providerConfig.apiKey,
      })
    } catch (error: any) {
      throw new Error(`openai: error create client: ${error.message}`)
    }
    return this.client
  }

  async *chatCompletion(
    systemPormpt: string,
    messages: Anthropic.Messages.MessageParam[],
    tools?: AbstractTool[],
  ): ApiStream {
    const client = this.createOpenaiClient()
    const stream = await this.createOpenAIStream(
      client,
      systemPormpt,
      messages,
      tools,
    )

    let didOutputUsage = false
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0]
      if ((choice?.finish_reason as string) === 'error') {
        const choiceWithError = choice as any
        if (choiceWithError.error) {
          const error = choiceWithError.error
          console.error(
            `OpenAI Mid-Stream Error: ${error?.code || 'Unknown'} - ${error?.message || 'Unknown error'}`,
          )
          const errorDetails =
            typeof error === 'object'
              ? JSON.stringify(error, null, 2)
              : String(error)
          throw new Error(`OpenAI Mid-Stream Error: ${errorDetails}`)
        } else {
          throw new Error(
            `OpenAI Mid-Stream Error: Stream terminated with error status but no error details provided`,
          )
        }
      }

      if (!this.lastGenerationId && chunk.id) {
        this.lastGenerationId = chunk.id
      }

      const delta = chunk.choices[0]?.delta
      if (delta?.content) {
        yield {
          type: 'text',
          text: delta.content,
        }
      }

      if (!didOutputUsage && chunk.usage) {
        yield {
          type: 'usage',
          cacheWriteTokens: 0,
          cacheReadTokens:
            chunk.usage.prompt_tokens_details?.cached_tokens || 0,
          inputTokens:
            (chunk.usage.prompt_tokens || 0) -
            (chunk.usage.prompt_tokens_details?.cached_tokens || 0),
          outputTokens: chunk.usage.completion_tokens || 0,
          totalCost: chunk.usage.total_tokens || 0,
        }
        didOutputUsage = true
      }
    }
  }

  async createOpenAIStream(
    client: OpenAI,
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
    tools?: AbstractTool[],
  ) {
    const openapiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...convertToOpenAiMessages(messages),
    ]

    return client.chat.completions.create({
        model: this.providerConfig.modelName || '',
        messages: openapiMessages,
        stream: true,
        tools: tools as any,
        stream_options: { include_usage: true },
    });
  }

  async generateContent(
    userInstruction: string,
    messages: Anthropic.Messages.MessageParam[],
    config: AgentImageConfig,
  ): Promise<ApiStreamImageChunk> {
    void config
    const preparedMessages = await this.resolveImageSources(messages)
    const openaiMessages = convertToOpenAiMessages(preparedMessages)

    if (userInstruction) {
      openaiMessages.unshift({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userInstruction,
          },
        ],
      } as OpenAI.Chat.ChatCompletionUserMessageParam)
    }

    const response = await fetch(`${this.providerConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.providerConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.providerConfig.modelName || '',
        messages: openaiMessages,
        modalities: ['image', 'text'],
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.imageSize,
        },
      }),
    })

    if (!response.ok) {
      const errorPayload = await response.text()
      throw new Error(
        `openai: generateContent failed with status ${response.status}: ${errorPayload}`,
      )
    }

    const data: any = await response.json()
    const result: ApiStreamImageChunk = {
      type: 'image',
      data: [],
      text: undefined,
      thinking: undefined,
    }
    const content = data?.choices?.[0]?.message?.content
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'text' && part.text) {
          result.text = result.text ? `${result.text}\n${part.text}` : part.text
        } else if (part.type === 'image_url' && part.image_url?.url) {
          result.data!.push(part.image_url.url)
        }
      }
    } else if (typeof content === 'string') {
      result.text = content
      result.thinking =  data?.choices?.[0]?.message?.reasoning
    }
    const images = data?.choices?.[0]?.message?.images
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img?.image_url?.url) {
          result.data!.push(img.image_url.url)
        }
      }
    }

    return result
  }

  private async resolveImageSources(
    messages: Anthropic.Messages.MessageParam[],
  ): Promise<Anthropic.Messages.MessageParam[]> {
    return Promise.all(
      messages.map(async (message) => {
        if (!Array.isArray(message.content)) {
          return message
        }
        const resolvedContent = await Promise.all(
          message.content.map(async (part) => {
            if (
              part.type !== 'image' ||
              !part.source ||
              (part.source as any).type !== 'path'
            ) {
              return part
            }
            return part
          }),
        )
        return {
          ...message,
          content: resolvedContent,
        }
      }),
    )
  }
}


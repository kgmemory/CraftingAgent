import {ApiHandler, GenerateApiHandler, AgentImageConfig, ApiStream, ApiStreamImageChunk} from './index'
import { ProviderConfig, AbstractTool } from '../types'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import {convertToOpenAiMessages, processOpenAIStream} from './message_converer'

export class OpenAIHandler implements ApiHandler, GenerateApiHandler {
  private providerConfig: ProviderConfig
  private client: OpenAI | undefined

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
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'x-stainless-arch': null,
          'x-stainless-lang': null,
          'x-stainless-os': null,
          'x-stainless-package-version': null,
          'x-stainless-retry-count': null,
          'x-stainless-runtime': null,
          'x-stainless-runtime-version': null,
          'x-stainless-timeout': null,
        },
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

    yield* processOpenAIStream(stream, {
      enableErrorHandling: true,
      enableToolCalls: true,
      enableReasoning: true,
    })
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


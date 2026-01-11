import { DoubaoHandler } from '../doubao'
import { ProviderConfig } from '../../types'
import Anthropic from '@anthropic-ai/sdk'
import { TodoToolHandler } from "../../tools";

describe('DoubaoHandler', () => {
  let handler: DoubaoHandler
  let config: ProviderConfig

  beforeEach(() => {
    config = {
      provider: 'doubao',
      apiKey: process.env.DOUBAO_API_KEY || '',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      modelName: 'doubao-1-5-pro-32k-250115',
    }
  })

  describe('chatCompletion', () => {
    it('normal test', async () => {
      const handler = new DoubaoHandler(config)

      const messages: Anthropic.Messages.MessageParam[] = [
        { role: 'user', content: '帮我列一个出门旅游计划，100字以内' },
      ]

      const stream = handler.chatCompletion(
        'You are a helpful assistant',
        messages,
        [new TodoToolHandler()].map((tool) => tool.tool()),
      )

      for await (const chunk of stream) {
        console.log(chunk)
      }
    })
  })
})

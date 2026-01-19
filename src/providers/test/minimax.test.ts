import { MinimaxHandler } from '../minimax'
import { ProviderConfig } from '../../types'
import Anthropic from '@anthropic-ai/sdk'

describe('MinimaxHandler', () => {
  let handler: MinimaxHandler
  let config: ProviderConfig

  beforeEach(() => {
    config = {
      provider: 'minimax',
      apiKey:
        '',
      modelName: 'MiniMax-M2-Stable',
    }
  })

  describe('chatCompletion', () => {
    it('normal test', async () => {
      const handler = new MinimaxHandler(config)

      const messages: Anthropic.Messages.MessageParam[] = [
        { role: 'user', content: 'Hello' },
      ]

      const properties: Record<string, any> = {}

      const stream = handler.chatCompletion(
        'You are a helpful assistant',
        messages,
      )

      for await (const chunk of stream) {
        console.log(chunk)
      }
    })
  })
})

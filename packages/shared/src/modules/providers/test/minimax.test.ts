import { MinimaxHandler } from '../minimax'
import { ProviderConfig } from '../../task/types'
import Anthropic from '@anthropic-ai/sdk'
import { Tool } from '@anthropic-ai/sdk/src/resources/messages/messages'

describe('MinimaxHandler', () => {
  let handler: MinimaxHandler
  let config: ProviderConfig

  beforeEach(() => {
    config = {
      provider: 'minimax',
      apiKey:
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLmna3lt57ngbXni5DmnKrmnaXnvZHnu5znp5HmioDmnInpmZDlhazlj7giLCJVc2VyTmFtZSI6IuabueW6huS6kSIsIkFjY291bnQiOiIiLCJTdWJqZWN0SUQiOiIxOTU1NDU1NDgwNTc4OTc0MzAzIiwiUGhvbmUiOiIxMzE3MzYxNzk1MSIsIkdyb3VwSUQiOiIxOTU1NDU1NDgwNTc0Nzc5OTk5IiwiUGFnZU5hbWUiOiIiLCJNYWlsIjoic2FfcmVnaXN0ZXJAdm9pY2Vmb3guY24iLCJDcmVhdGVUaW1lIjoiMjAyNS0wOC0yMCAxMDoxNDowNSIsIlRva2VuVHlwZSI6MSwiaXNzIjoibWluaW1heCJ9.iK-__GnpiLjPkV7YLbOsAy4NP0kMDT1El3Lmxv4Es9MKsiXPrtv36WtUi3-i_2wCrd0U7qNsaGFf4zpx0WnYXZ4ipnWV7Tb1IEC6ujcOrKLNwvXkCFbXm8uy8KnBJf7lkzkvj2BvVP14pdkwigzrApL7b3fIHoa1lFVJMK5HH8Kr_PIwUocl0lzbeKITAf_jDJswgaWEVKJ3t8cFRqI-sQbldjrlYOhJDX2XCrk2BY-H_lxemxy5yhyClTHaei3NPh6cglO3Zndjgu30K7xQn6JAd_nnvO3cs5RKOrAOgoTWAtUwFN8QGbRhO7ZQDBbuHjuPH3psU1hi3kb_2AShwQ',
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
      const tools: Anthropic.Tool[] = [
        {
          name: 'replace_in_file',
          description: '',
          input_schema: {
            type: 'object',
            properties,
            required: ['name'],
          },
        },
      ]
      const stream = handler.chatCompletion(
        'You are a helpful assistant',
        messages,
        tools,
      )

      for await (const chunk of stream) {
        console.log(chunk)
      }
    })
  })
})

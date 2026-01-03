import { ProviderConfig, GenerateApiHandler, AgentImageConfig, ApiStreamImageChunk } from '../types'
import { GoogleHandler } from '../providers/google'
import { OpenRouterHandler } from '../providers/openrouter'
import Anthropic from '@anthropic-ai/sdk'

function buildGenerateApiHandler(providerConfig?: ProviderConfig): GenerateApiHandler {
    if (!providerConfig?.provider) {
      throw new Error('Provider configuration is missing or incomplete')
    }

    switch (providerConfig.provider) {
      case 'google':
        return new GoogleHandler(providerConfig)
      case 'openrouter':
        return new OpenRouterHandler(providerConfig)
      default:
        throw new Error(`Unsupported generator provider: ${providerConfig.provider}`)
    }
}

export async function generateImage(
  userInstruction: string,
  messages: Anthropic.Messages.MessageParam[],
  config: AgentImageConfig,
  providerConfig?: ProviderConfig
): Promise<ApiStreamImageChunk> {
    const generateApiHandler = buildGenerateApiHandler(providerConfig)
    return await generateApiHandler.generateContent(userInstruction, messages, config)
}
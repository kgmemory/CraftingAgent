import { ProviderConfig } from '../task/types'
import { GoogleHandler } from '../providers/google'
import { OpenRouterHandler } from '../providers/openrouter'
import { GenerateApiHandler } from '../providers/stream'
import { GenerateImageConfig } from './types'

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

export function generateImage(generateImageConfig?: GenerateImageConfig): GenerateApiHandler {
    buildGenerateApiHandler(generateImageConfig?.providerConfig)
    const generateApiHandler = buildGenerateApiHandler(generateImageConfig?.providerConfig)
    return generateApiHandler.generateContent(generateImageConfig?.userInstruction, generateImageConfig?.messages, generateImageConfig?.config)
}
export interface ProviderConfig {
  provider?: string
  apiKey?: string
  baseUrl?: string
  modelName?: string
  maxTokens?: number
}

export interface ModelConfig {
  agentModel?: ProviderConfig
}

export interface UserInstruction {
  type?: string
  text?: string
}


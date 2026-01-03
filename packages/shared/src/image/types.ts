import { ProviderConfig, AgentImageConfig } from "../types"
import Anthropic from '@anthropic-ai/sdk'

export interface GenerateImageConfig {
    userInstruction?: string
    messages?: Anthropic.Messages.MessageParam[]
    config?: AgentImageConfig
    providerConfig?: ProviderConfig
}
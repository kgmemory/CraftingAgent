import { ProviderConfig } from "../task/types"
import { AgentImageConfig } from "../providers/stream"
import Anthropic from '@anthropic-ai/sdk'

export interface GenerateImageConfig {
    userInstruction?: string
    messages?: Anthropic.Messages.MessageParam[]
    config?: AgentImageConfig
    providerConfig?: ProviderConfig
}
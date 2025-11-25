import Anthropic from '@anthropic-ai/sdk'
import {ApiStream, ApiStreamImageChunk} from './stream'
import { AbstractTool } from '../tools/index'

export type { ApiStream } from './stream'

export interface ApiHandler {
  chatCompletion: (
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
    tools?: AbstractTool[],
  ) => ApiStream
}

export interface GenerateApiHandler {
  generateContent: (
    userInstruction: string,
    messages: Anthropic.Messages.MessageParam[],
    config: AgentImageConfig,
  ) => Promise<ApiStreamImageChunk>
}


export type AgentImageConfig = {
  aspectRatio?: string // 1:1	2:3	3:2	3:4	4:3	4:5	5:4	9:16 16:9 21:9
  imageSize?: string // 1K、2K、4K
  googleSearch?: boolean
}

export { GoogleHandler } from './google'


import { GoogleGenAI } from "@google/genai";
import { GenerateApiHandler } from "./index";
import { ProviderConfig } from '../../task';
import { Part } from "@google/genai";
import Anthropic from '@anthropic-ai/sdk'
import {ApiStream, ApiStreamImageChunk} from "./stream";
import { AgentImageConfig } from "./index";


export class GoogleHandler implements GenerateApiHandler {
    private client: GoogleGenAI;
    private providerConfig: ProviderConfig

    constructor(private readonly config: ProviderConfig) {
        this.providerConfig = config
        this.client = new GoogleGenAI({
            apiKey: this.providerConfig.apiKey,
        });
    }

    convertToGoogleMessages(messages: Anthropic.Messages.MessageParam[]): Part[] {
        const googleMessages: Part[] = [];
        for (const message of messages) {
            if (typeof message.content === 'string') {
                googleMessages.push({ text: message.content });
            } else {
                for (const contentBlock of message.content) {
                    if (contentBlock.type === 'image') {
                        googleMessages.push({ inlineData: { mimeType: 'image/png', data: contentBlock.source.type === 'base64' ? contentBlock.source.data : contentBlock.source.url } });
                    } else if (contentBlock.type === 'text') {
                        googleMessages.push({ text: contentBlock.text });
                    }
                }
            }
        }
        return googleMessages;
    }

    async generateContent(
        userInstruction: string,
        messages: Anthropic.Messages.MessageParam[],
        config: AgentImageConfig,
      ): Promise<ApiStreamImageChunk> {

        const response = await this.client.models.generateContent({
            model: this.providerConfig.modelName || 'gemini-3-pro-image-preview',
            contents: [
                { text: userInstruction },
                ...this.convertToGoogleMessages(messages),
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: config.aspectRatio,
                    imageSize: config.imageSize,
                },
            },
        });
        const result: ApiStreamImageChunk = {
          type: 'image',
          data: undefined,
          text: undefined,
        }
        for (const part of response?.candidates?.[0]?.content?.parts ?? []) {
          if (part.text) {
            result.text = part.text
          } else if (part.inlineData) {
            const imageData = part.inlineData.data;
            result.data = imageData
          }
        }
        return result
    }

}

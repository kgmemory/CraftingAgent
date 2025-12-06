import { ContentBlock } from "./types"
import Anthropic from '@anthropic-ai/sdk'

export function convertContentBlock(
    blocks: Anthropic.ContentBlockParam[],
  ): ContentBlock[] {
    return blocks.map((block) => {
      const contentBlock: ContentBlock = {
        type: block.type,
      }
      if (block.type === 'text' && 'text' in block) {
        contentBlock.text = block.text
      } else if (block.type === 'tool_use' && 'id' in block) {
        contentBlock.tool_use_id = block.id
        contentBlock.name = block.name
        contentBlock.input = block.input as Record<string, any>
      } else if (block.type === 'thinking') {
          contentBlock.content = block.thinking
      } else if (block.type === 'tool_result') {
          contentBlock.content = block.content
          contentBlock.tool_use_id = block.tool_use_id
      }
      return contentBlock
    })
  }

export function convertToAnthropicContentBlocks(
    blocks: ContentBlock[],
  ): Anthropic.Messages.ContentBlockParam[] {
    return blocks.map((block): Anthropic.Messages.ContentBlockParam => {
      if (block.type === 'text' && block.text !== undefined) {
        return {
          type: 'text',
          text: block.text,
        }
      } else if (block.type === 'tool_use' && block.tool_use_id && block.name) {
        return {
          type: 'tool_use',
          id: block.tool_use_id,
          name: block.name,
          input: block.input || {},
        }
      } else if (block.type === 'tool_result' && block.tool_use_id && block.content !== undefined) {
        return {
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: typeof block.content === 'string' ? block.content : '',
        }
      } else if (block.type === 'thinking') {
          return {
              type: 'thinking',
              thinking: typeof block.content === 'string' ? block.content : '',
              signature: '',
          }
      } else {
        return {
          type: 'text',
          text: '',
        }
      }
    })
  }
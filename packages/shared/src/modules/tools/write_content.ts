import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from './index'
import { ApiStreamToolCall } from '../providers/stream'
import { TaskContext } from '../task'
import {WebSearchTool} from "@/modules/tools/web_search";

export const WriteContentTool: OpenAITool = {
  type: 'function',
  function: {
    name: 'write_content',
    description:
      '请求写入内容。直接返回提供的内容，不进行文件操作。',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description:
            '要写入的内容。将原样返回此内容。',
        },
      },
      required: ['content'],
    },
  },
}

export default class WriteContentToolHandler implements ToolHandler {
  private context: TaskContext | null = null

  tool(): OpenAITool {
    return WriteContentTool
  }

  setContext(context: TaskContext): void {
    this.context = context
  }

  async execute(
    tool: ApiStreamToolCall,
    context?: TaskContext,
  ): Promise<string> {
    const parameters = tool.function.arguments as {
      content: string
    }

    if (parameters.content === undefined || parameters.content === null) {
      throw new Error('content parameter is required')
    }

    return parameters.content
  }
}


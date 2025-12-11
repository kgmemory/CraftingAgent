import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from './index'
import { ApiStreamToolCall } from '../providers/stream'
import { writeFileCore } from '../utils/file_writer'
import { TaskContext } from '../task/types'

export const WriteFileTool: OpenAITool = {
  type: 'function',
  function: {
    name: 'write_to_file',
    description:
      "Request to write content to a file at the specified path. If the file exists, it will be overwritten with the provided content. If the file doesn't exist, it will be created. This tool will automatically create any directories needed to write the file.",
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write to',
        },
        content: {
          type: 'string',
          description:
            "The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions. You MUST include ALL parts of the file, even if they haven't been modified.",
        },
      },
      required: ['path', 'content'],
    },
  },
}

export default class WriteFileToolHandler implements ToolHandler {
  private context: TaskContext | null = null

  tool(): OpenAITool {
    return WriteFileTool
  }

  setContext(context: TaskContext): void {
    this.context = context
  }

  async execute(
    tool: ApiStreamToolCall,
    context?: TaskContext,
  ): Promise<string> {
    const ctx = context || this.context
    if (!ctx || !ctx.variables?.workspacePath) {
      throw new Error('Tool context (cwd) is required for file operations')
    }

    const parameters = tool.function.arguments as {
      path: string
      content: string
    }

    if (!parameters.path) {
      throw new Error('path parameter is required')
    }

    if (parameters.content === undefined || parameters.content === null) {
      throw new Error('content parameter is required')
    }

    try {
      const result = await writeFileCore(
        parameters.path,
        parameters.content,
        undefined,
        {
          cwd: ctx.variables?.workspacePath,
          applyHtmlEscapingFix: true,
          isPartial: false,
        },
      )

      return `Successfully wrote to file: ${result.relPath}${
        result.fileExists ? ' (overwrote existing file)' : ' (created new file)'
      }`
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to write to file: ${error.message}`)
      }
      throw error
    }
  }
}

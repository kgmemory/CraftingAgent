import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from './index'
import { ApiStreamToolCall } from '../providers/stream'
import { TaskContext } from '../task/types'
import * as fs from 'fs/promises'
import * as path from 'path'

const partialReadsEnabled = true

const read_file_description = `Read one or more files and return their contents with line numbers for diffing or discussion.

Structure:
\`\`\`
{ files: [{ path: 'relative/path.ts', line_ranges: [[1, 50], [100, 150]]] }
\`\`\`

- The \`path\` is required and relative to workspace.
- The \`line_ranges\` is optional for reading specific sections. Each range is a \`[start, end]\` tuple (1-based inclusive).

Examples:
- **Example single file:** \`{ files: [{ path: 'src/app.ts' }] }\`
- **Example with line ranges:** \`{ files: [{ path: 'src/app.ts', line_ranges: [[1, 50], [100, 150]] }] }\`
- **Example multiple files:** \`{ files: [{ path: 'file1.ts', line_ranges: [[1, 50]] }, { path: 'file2.ts' }] }\`
` 

export const ReadFileTool: OpenAITool = {
  type: 'function',
  function: {
    name: 'read_file',
    description:
      'Description: Request to read content from a file. This tool reads the complete content of a specified file and returns it as a string. If the file does not exist or cannot be read, an error will be returned.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path of the file to read from (relative to the current workspace directory)',
        },
      },
      required: ['path'],
    },
  },
}

export default class ReadFileToolHandler implements ToolHandler {
  private context: TaskContext | null = null

  tool(): OpenAITool {
    return ReadFileTool
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
    }

    if (!parameters.path) {
      throw new Error('path parameter is required')
    }

    try {
      const absolutePath = path.resolve(ctx.variables.workspacePath, parameters.path)
      
      const stats = await fs.stat(absolutePath)
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${parameters.path}`)
      }

      const content = await fs.readFile(absolutePath, 'utf-8')
      
      return `Successfully read file: ${parameters.path}\n\nContent:\n${content}`
    } catch (error) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`File not found: ${parameters.path}`)
        }
        throw new Error(`Failed to read file: ${error.message}`)
      }
      throw error
    }
  }
}

import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from './index'
import { ApiStreamToolCall } from '../providers/stream'
import { writeFileCore } from '../utils/file_writer'
import { TaskContext } from '../task'

export const ReplaceTool: OpenAITool = {
  type: 'function',
  function: {
    name: 'replace_in_file',
    description:
      'Request to replace sections of content in an existing file using SEARCH/REPLACE blocks that define exact changes to specific parts of the file. This tool should be used when you need to make targeted changes to specific parts of a file.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'The path to the file to modify (relative to workspace or absolute path)',
        },
        diff: {
          type: 'string',
          description: `One or more SEARCH/REPLACE blocks following this exact format:
\`\`\`
------- SEARCH
[exact content to find]
=======
[new content to replace with]
+++++++ REPLACE
\`\`\`
Critical rules:
1. SEARCH content must match the associated file section to find EXACTLY:
   * Match character-for-character including whitespace, indentation, line endings
   * Include all comments, docstrings, etc.
2. SEARCH/REPLACE blocks will ONLY replace the first match occurrence.
   * Including multiple unique SEARCH/REPLACE blocks if you need to make multiple changes.
   * Include *just* enough lines in each SEARCH section to uniquely match each set of lines that need to change.
   * When using multiple SEARCH/REPLACE blocks, list them in the order they appear in the file.
3. Keep SEARCH/REPLACE blocks concise:
   * Break large SEARCH/REPLACE blocks into a series of smaller blocks that each change a small portion of the file.
   * Include just the changing lines, and a few surrounding lines if needed for uniqueness.
   * Do not include long runs of unchanging lines in SEARCH/REPLACE blocks.
   * Each line must be complete. Never truncate lines mid-way through as this can cause matching failures.
4. Special operations:
   * To move code: Use two SEARCH/REPLACE blocks (one to delete from original + one to insert at new location)
   * To delete code: Use empty REPLACE section`,
        },
      },
      required: ['path', 'diff'],
    },
  },
}

export default class ReplaceToolHandler implements ToolHandler {
  private context: TaskContext | null = null

  tool(): OpenAITool {
    return ReplaceTool
  }

  setContext(context: TaskContext): void {
    this.context = context
  }

  async execute(
    tool: ApiStreamToolCall,
    context?: TaskContext,
  ): Promise<string> {
    const ctx = context || this.context
    if (!ctx || !ctx.variables  ) {
      throw new Error('Tool context (cwd) is required for file operations')
    }

    const parameters = tool.function.arguments as {
      path: string
      diff: string
    }

    if (!parameters.path) {
      throw new Error('path parameter is required')
    }

    if (!parameters.diff) {
      throw new Error('diff parameter is required')
    }

    try {
      const result = await writeFileCore(
        parameters.path,
        undefined,
        parameters.diff,
        {
          cwd: ctx.variables?.workspacePath,
          applyHtmlEscapingFix: true,
          isPartial: false,
        },
      )

      return `Successfully replaced content in file: ${result.relPath}${
        result.fileExists ? ' (modified existing file)' : ' (created new file)'
      }`
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to replace content in file: ${error.message}`)
      }
      throw error
    }
  }
}

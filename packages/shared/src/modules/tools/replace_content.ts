import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from './index'
import { ApiStreamToolCall } from '../providers/stream'
import { TaskContext } from '../task'

export const ReplaceContentTool: OpenAITool = {
  type: 'function',
  function: {
    name: 'replace_content',
    description:
      '请求替换内容。使用 SEARCH/REPLACE 块来定义对内容特定部分的精确更改。直接返回替换后的内容，不进行文件操作。',
    parameters: {
      type: 'object',
      properties: {
        diff: {
          type: 'string',
          description: `一个或多个 SEARCH/REPLACE 块，遵循以下确切格式：
\`\`\`
------- SEARCH
[要查找的确切内容]
=======
[要替换为的新内容]
+++++++ REPLACE
\`\`\`
关键规则：
1. SEARCH 内容必须完全匹配要查找的部分：
   * 逐字符匹配，包括空格、缩进、行尾
   * 包括所有注释、文档字符串等
2. SEARCH/REPLACE 块只会替换第一个匹配项。
   * 如果需要多次更改，请包含多个唯一的 SEARCH/REPLACE 块。
   * 在每个 SEARCH 部分中包含足够多的行以唯一匹配需要更改的行集。
   * 使用多个 SEARCH/REPLACE 块时，按它们在内容中出现的顺序列出。
3. 保持 SEARCH/REPLACE 块简洁：
   * 将大的 SEARCH/REPLACE 块拆分为一系列较小的块，每个块更改内容的一小部分。
   * 只包含更改的行，如果需要唯一性，可以包含几行周围的行。
   * 不要在 SEARCH/REPLACE 块中包含长串未更改的行。
   * 每行必须完整。永远不要中途截断行，这可能导致匹配失败。
4. 特殊操作：
   * 移动代码：使用两个 SEARCH/REPLACE 块（一个从原位置删除 + 一个在新位置插入）
   * 删除代码：使用空的 REPLACE 部分`,
        },
      },
      required: ['diff'],
    },
  },
}

export default class ReplaceContentToolHandler implements ToolHandler {
  private context: TaskContext | null = null

  tool(): OpenAITool {
    return ReplaceContentTool
  }

  setContext(context: TaskContext): void {
    this.context = context
  }

  async execute(
    tool: ApiStreamToolCall,
    context?: TaskContext,
  ): Promise<string> {
    const parameters = tool.function.arguments as {
      diff: string
    }

    if (!parameters.diff) {
      throw new Error('diff parameter is required')
    }

    return parameters.diff
  }
}


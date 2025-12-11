import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from '.'
import { ApiStreamToolCall } from '../providers/stream'
import { TaskContext } from '../task/types'

export const TodoTool: OpenAITool = {
    type: 'function',
    function: {
        name: 'todo',
        description: 'Add a new todo item',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'The content of the todo item' },
            },
            required: true,
        },
    },
}

export class TodoToolHandler implements ToolHandler {
    tool(): OpenAITool {
        return TodoTool
    }

    async execute(toolCall: ApiStreamToolCall, context: TaskContext): Promise<string> {
        return 'Todo item added'
    }
}
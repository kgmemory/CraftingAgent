import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from '.'
import { ApiStreamToolCall } from '../providers/stream'
import { TaskContext } from '../task/types'
import { fetchHtml } from '../utils/fetch_html'

export const ReadDocTool: OpenAITool = {
    type: 'function',
    function: {
        name: 'read_doc',
        description: 'Read documentation from multiple URLs',
        parameters: {
            type: 'object',
            properties: {
                urls: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'The URLs to fetch HTML content from'
                },
            },
            required: ['urls'],
        },
    },
}

export class ReadDocToolHandler implements ToolHandler {
    
    private context: TaskContext | null = null

    tool(): OpenAITool {
        return ReadDocTool
    }

    setContext(context: TaskContext): void {
        this.context = context
    }

    async execute(tool: ApiStreamToolCall, context?: TaskContext): Promise<string> {
        const ctx = context || this.context
        if (!ctx) {
            throw new Error('Tool context is required')
        }

        const args = typeof tool.function.arguments === 'string' 
            ? JSON.parse(tool.function.arguments) 
            : tool.function.arguments
        const urls: string[] = args.urls

        if (!Array.isArray(urls) || urls.length === 0) {
            throw new Error('urls parameter must be a non-empty array')
        }

        const results = await Promise.allSettled(
            urls.map(async (url) => {
                try {
                    const html = await fetchHtml(url)
                    return { url, success: true, content: html }
                } catch (error) {
                    return {
                        url,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    }
                }
            })
        )

        let output = ''
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const data = result.value
                if (data.success) {
                    output += `\n=== URL: ${data.url} ===\n${data.content}\n`
                } else {
                    output += `\n=== URL: ${data.url} (Failed) ===\nError: ${data.error}\n`
                }
            }
        }

        return output || 'No content fetched'
    }
}


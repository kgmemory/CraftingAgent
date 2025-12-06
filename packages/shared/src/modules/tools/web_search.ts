import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler } from '.'
import { ApiStreamToolCall } from '../providers/stream'
import { TaskContext } from '../task/types'

export const WebSearchTool: OpenAITool = {
    type: 'function',
    function: {
        name: 'web_search',
        description: 'Search the web for information',
        parameters: {
            type: 'object',
            properties: {
                querys: { type: 'array', items: { type: 'string' }, description: 'The querys to search for' },
            },
            required: ['querys'],
        },
    },
}

export class WebSearchToolHandler implements ToolHandler {
    
    private context: TaskContext | null = null

    setContext(context: TaskContext): void {
        this.context = context
    }

    async execute(tool: ApiStreamToolCall, context?: TaskContext): Promise<string> {
        const ctx = context || this.context
        if (!ctx || !ctx.variables?.workspacePath) {
            throw new Error('Tool context (cwd) is required for file operations')
        }
        return `内容搜索结果
百度百科：
陨石，也称“陨星”，指流星体从行星际空间穿越过大气层而陨落到行星、卫星或小行星表面后残存的固态天然物体。 [17]
太空中的流星体以极高的速度通过大气层，其产生的高温足以熔融其表面，同时燃烧并发出强光。如果它们的体积较小，穿越大气层时就燃烧完了，就是流星；如果它们的体积较大（直径约10米以上），穿越大气层后还有一部分没燃烧完，残留的部分落在地面上，就是陨石。
流星体进入大气层前的体积越大，下落过程中伴随产生的现象就越强烈。目前认为，几乎所有的陨石都来源于小行星带。小行星带是位于火星和木星轨道之间，聚集有无数小天体的区域。当小行星之间的碰撞改变了彼此的轨道，或者碰撞产生了碎片时，它们就会离开原有轨道，有些飞向地球，落在地球表面，成为陨石。
根据其成分，陨石大致可以分为三类：一类是与地球上的岩石外观和成分都很相似的石陨石，一类是含有一部分铁的石铁陨石，一类是以铁为主要成分的铁陨石（也称为陨铁）。 [17]
2025年6月23日消息，黔东南州山林中有块重达一吨的钻石陨石被发现。
`
    }
}
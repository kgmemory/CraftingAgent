import { ProviderConfig } from './types'
import { OpenRouterHandler } from '../modules/providers/openrouter'
import buildSystemPrompt from './prompt'
import Anthropic from '@anthropic-ai/sdk'
import { TaskContext, ModelConfig, ContentBlock } from './types'
import { TaskStorage } from './task-storage'
import { MinimaxHandler } from '../modules/providers/minimax'
import { getToolHandler, getTools } from '../modules/tools'
import { ApiHandler, GenerateApiHandler } from '../modules/providers'
import { ApiStream, ApiStreamToolCall } from '../modules/providers/stream'
import { DoubaoHandler } from '../modules/providers/doubao'
import { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { convertToAnthropicContentBlocks, convertContentBlock } from './converter'
import { GoogleHandler } from '../modules/providers/google'

export type {
  TaskContext,
  Task as TaskType,
  Project,
  Config,
  ChatMessage,
  ModelConfig,
  ContentBlock,
  ProviderConfig,
} from './types'
export { TaskStorage } from './task-storage'

export class Task {
  private projectId: string
  private taskID: string
  private modelConfig: ModelConfig
  private taskContext: TaskContext
  private storage: TaskStorage
  private conversationRound: number = 1
  private historyMessages: Anthropic.MessageParam[] = []
  private userInstruction: string
  private variables: Record<string, string> = {}

  constructor(taskId: string, projectId: string, modelConfig: ModelConfig, storage: TaskStorage) {
    this.taskID = taskId
    this.projectId = projectId
    this.modelConfig = modelConfig
    this.storage = storage
    this.userInstruction = ''
    this.taskContext = {
      variables: {},
    }
    this.variables = this.taskContext.variables || {}
  }

  async initTask() {
    const project = await this.storage.createOrUpdateProject({
      id: this.projectId,
      updatedAt: new Date()
    })
    if (project?.id) {
      this.projectId = project.id
    }
    const task = await this.storage.createOrUpdateTask({
      id: this.taskID,
      name: this.userInstruction,
      projectId: this.projectId,
      updatedAt: new Date()
    })
    if (task) {
      this.taskID = task.id || ''
    }

    // set task context
    if (project?.settings) {
        Object.entries(project.settings).forEach(([key, val]) => {
            this.variables[key] = String(val)
        })
    }

    if (this.modelConfig?.agentModel?.provider) {
      const modelConfig = await this.storage.getConfigByKey(this.modelConfig.agentModel.provider, 'llm')
      if (modelConfig) {
        this.modelConfig.agentModel = JSON.parse(modelConfig.val || '{}')
      }
    } else {
      throw new Error('Agent model provider is required')
    }
    await this.loadHistoryMessages()
  }

  private async loadHistoryMessages() {
    const messages = await this.storage.getChatMessagesByTaskId(this.taskID)
    this.historyMessages = messages.map((msg) => {
      const role = msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user'
      const content = convertToAnthropicContentBlocks(msg.content || [])
      return {
        role,
        content,
      }
    })

    if (messages.length > 0) {
      const maxRound = Math.max(
        ...messages.map((msg) => msg.conversationRound || 0),
      )
      this.conversationRound = maxRound + 1
    }
  }

  // user instruction or task result message
  async buildUserTaskMessage(lastToolCall: ApiStreamToolCall | undefined, lastToolCallResult: string | undefined) {
    const userMessageBlocks: ContentBlockParam[] = []
    if (lastToolCall && lastToolCallResult) {
      userMessageBlocks.push({
        type: 'tool_result',
        content: lastToolCallResult,
        tool_use_id: lastToolCall.call_id || '',
      })
    }
    if (this.userInstruction) {
      userMessageBlocks.push({ type: 'text', text: this.userInstruction })
      this.userInstruction = ''
    }
    await this.saveMessage('user', userMessageBlocks)
  }

  async *startTask(userInstruction: string): ApiStream {
    this.userInstruction = userInstruction
    await this.initTask()

    const handler = this.buildApiHandler(this.modelConfig?.agentModel)
    const systemPrompt = buildSystemPrompt('1. 你必须使用中文')

    const taskInLoop = true

    let lastToolCall: ApiStreamToolCall | undefined
    let lastToolCallResult: string | undefined
    while (taskInLoop) {
      // build user message
      await this.buildUserTaskMessage(lastToolCall, lastToolCallResult)
      lastToolCall = undefined
      lastToolCallResult = undefined

      const stream = handler.chatCompletion(systemPrompt, this.historyMessages, getTools())

      let accumulatedText = ''
      let accumulatedThinking = ''
      const toolCalls: ApiStreamToolCall[] = []
      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'text':
            accumulatedText += chunk.text
            yield chunk
            break
          case 'reasoning':
            accumulatedThinking += chunk.reasoning
            yield chunk
            break
          case 'tool_calls':
            toolCalls.push(chunk.tool_call)
            lastToolCall = chunk.tool_call
            yield chunk
            break
        }
      }

      const assistantContentBlocks: ContentBlockParam[] = []
      if (accumulatedText) {
        assistantContentBlocks.push({
          type: 'text',
          text: accumulatedText,
        })
      }
      if (accumulatedThinking) {
        assistantContentBlocks.push({
          type: 'thinking',
          thinking: accumulatedThinking,
          signature: '',
        })
      }
      for (const toolCall of toolCalls) {
        assistantContentBlocks.push({
          type: 'tool_use',
          id: toolCall.function.id || '',
          input: toolCall.function.arguments,
          name: toolCall.function.name || '',
        })
      }
      await this.saveMessage('assistant', assistantContentBlocks)

      if (lastToolCall && lastToolCall.function.name) {
        const toolHandler = getToolHandler(lastToolCall.function.name)
        if (toolHandler) {
          lastToolCallResult = await toolHandler.execute(lastToolCall, this.taskContext)
          const toolResultBlock: Anthropic.ContentBlockParam[] = [
            {
              content: lastToolCallResult,
              tool_use_id: lastToolCall.function.id || '',
              type: 'tool_result',
            },
          ]
          await this.saveMessage('user', toolResultBlock)
        }
      } else {
        break
      }
    }
  }

  private async saveMessage(
    role: 'user' | 'assistant',
    blocks: Anthropic.ContentBlockParam[],
  ) {
    const contentBlocks: ContentBlock[] =
      convertContentBlock(blocks)
    this.historyMessages.push({ role: role, content: blocks })

    await this.storage.createChatMessage({
      taskId: this.taskID,
      projectId: this.projectId,
      conversationRound: this.conversationRound,
      messageOrder: 1,
      role: role,
      content: contentBlocks,
    })
  }



  buildApiHandler(providerConfig?: ProviderConfig): ApiHandler {
    if (!providerConfig?.provider) {
      throw new Error('Provider configuration is missing or incomplete')
    }

    switch (providerConfig.provider) {
      case 'minimax':
        return new MinimaxHandler(providerConfig)
      case 'doubao':
        return new DoubaoHandler(providerConfig)
      case 'openrouter':
        return new OpenRouterHandler(providerConfig)
      default:
        throw new Error(`Unsupported provider: ${providerConfig.provider}`)
    }
  }

  buildGenerateApiHandler(providerConfig?: ProviderConfig): GenerateApiHandler {
    if (!providerConfig?.provider) {
      throw new Error('Provider configuration is missing or incomplete')
    }

    switch (providerConfig.provider) {
      case 'google':
        return new GoogleHandler(providerConfig)
      case 'openrouter':
        return new OpenRouterHandler(providerConfig)
      default:
        throw new Error(`Unsupported generator provider: ${providerConfig.provider}`)
    }
  }
}

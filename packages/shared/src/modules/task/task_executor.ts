import { ProviderConfig } from './types'
import { OpenRouterHandler } from '../providers/openrouter'
import Anthropic from '@anthropic-ai/sdk'
import { TaskContext, ModelConfig } from './types'
import { TaskStorage } from '../storage'
import { MinimaxHandler } from '../providers/minimax'
import { ApiHandler, GenerateApiHandler } from '../providers'
import { ApiStream, ApiStreamToolCall } from '../providers/stream'
import { DoubaoHandler } from '../providers/doubao'
import { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { convertToAnthropicContentBlocks, convertContentBlock } from './converter'
import { GoogleHandler } from '../providers/google'
import { logger } from '../logger'
import { ISystemPromptBuilder, DefaultSystemPromptBuilder } from '../prompt'

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
  private systemPromptBuilder: ISystemPromptBuilder

  constructor(taskId: string, projectId: string, modelConfig: ModelConfig, storage: TaskStorage, taskContext: TaskContext) {
    this.taskID = taskId
    this.projectId = projectId
    this.modelConfig = modelConfig
    this.storage = storage
    this.userInstruction = ''
    this.variables = taskContext.variables || {}
    this.taskContext = taskContext
    this.systemPromptBuilder = taskContext.systemPromptBuilder || DefaultSystemPromptBuilder
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
    logger.info({
      taskId: this.taskID,
      messages: messages,
    }, 'Query chat message history')
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

  async buildUserTaskMessage(lastToolCall: ApiStreamToolCall | undefined, lastToolCallResult: string | undefined) {
    const userMessageBlocks: ContentBlockParam[] = []
    if (lastToolCall && lastToolCallResult) {
      userMessageBlocks.push({
        type: 'tool_result',
        content: lastToolCallResult,
        tool_use_id: lastToolCall.function.id || '',
      })
    }
    if (this.userInstruction) {
      userMessageBlocks.push({ type: 'text', text: this.userInstruction })
      userMessageBlocks.push({ type: 'text', text: `<enviorment>${await this.systemPromptBuilder.buildEnvironmentDetails()}</enviorment>`})
      this.userInstruction = ''
    }
    await this.saveMessage('user', userMessageBlocks)
  }

  async *startTask(userInstruction: string): ApiStream {
    logger.info({
      userInstruction: userInstruction,
    }, 'start task')
    this.userInstruction = userInstruction
    await this.initTask()

    const handler = this.buildApiHandler(this.modelConfig?.agentModel)
    const systemPrompt = await this.systemPromptBuilder.buildSystemPrompt()

    const taskInLoop = true

    let lastToolCall: ApiStreamToolCall | undefined
    let lastToolCallResult: string | undefined
    while (taskInLoop) {
      await this.buildUserTaskMessage(lastToolCall, lastToolCallResult)
      const stream = handler.chatCompletion(systemPrompt, this.historyMessages, this.taskContext.tools?.map((tool) => tool.tool()) || [])

      let accumulatedText = ''
      let accumulatedThinking = ''
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
            if (lastToolCall) {
              lastToolCall.function.arguments += chunk.tool_call.function.arguments
            } else {
              lastToolCall = chunk.tool_call
            }
            yield chunk
            break
        }
      }

      const assistantContentBlocks: ContentBlockParam[] = []
        if (accumulatedThinking) {
            assistantContentBlocks.push({
                type: 'thinking',
                thinking: accumulatedThinking,
                signature: '',
            })
        }
      if (accumulatedText) {
        assistantContentBlocks.push({
          type: 'text',
          text: accumulatedText,
        })
      }


      if (lastToolCall) {
          let input = lastToolCall.function.arguments
          if (typeof input === 'string') {
              try {
                  input = JSON.parse(input)
              } catch (e) {
              }
          }
          
          assistantContentBlocks.push({
              type: 'tool_use',
              id: lastToolCall.function.id || '',
              input: input,
              name: lastToolCall.function.name || '',
          })
      }
      await this.saveMessage('assistant', assistantContentBlocks)
      if (lastToolCall?.function?.name) {
        const toolName = lastToolCall.function.name
        const toolHandler = this.taskContext.tools?.find((tool) => {
          const toolDef = tool.tool()
          return toolDef.type === 'function' && toolDef.function.name === toolName
        })
        if (toolHandler) {
          lastToolCallResult = await toolHandler.execute(lastToolCall, this.taskContext)
          logger.info({
            taskId: this.taskID,
            projectId: this.projectId,
            toolName: lastToolCall.function.name,
            toolCallId: lastToolCall.function.id,
            result: lastToolCallResult,
          }, 'Tool execution result')
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
    this.historyMessages.push({ role: role, content: blocks })

    await this.storage.createChatMessage({
      taskId: this.taskID,
      projectId: this.projectId,
      conversationRound: this.conversationRound,
      messageOrder: 1,
      role: role,
      content: convertContentBlock(blocks),
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

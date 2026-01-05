import { TaskContext } from './context'

export interface ISystemPromptBuilder {
  buildSystemPrompt(): Promise<string>
  buildEnvironmentDetails(taskContext: TaskContext): Promise<string>
}


import { Task, Project, Config, ChatMessage } from '../task/types'

export abstract class TaskStorage {
  /* Task */
  abstract getTaskById(id: string): Promise<Task | null>
  abstract createOrUpdateTask(task: Task): Promise<Task | null>
  abstract getTasksByProjectId(projectId: string): Promise<Task[]>

  /* Project */
  abstract getProjectById(id: string): Promise<Project | null>
  abstract createOrUpdateProject(project: Project): Promise<Project | null>
  abstract getAllProjects(): Promise<Project[]>

  /* Config */
  abstract createConfig(
    data: Config,
  ): Promise<Config>
  abstract getConfigByKey(
    key: string,
    category?: string,
  ): Promise<Config | null>

  /* ChatMessage */
  abstract createChatMessage(
    data: ChatMessage,
  ): Promise<ChatMessage>
  abstract getChatMessagesByTaskId(taskId: string): Promise<ChatMessage[]>
}

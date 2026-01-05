# @crafting-agent/shared

A TypeScript library for building AI agents with support for multiple LLM providers.

## Features

- **Multiple LLM Providers**: Support for Google, Doubao, Minimax, and OpenRouter
- **Task Execution**: Built-in task executor with streaming support
- **Tool System**: Extensible tool system for agent capabilities
- **Storage**: Abstracted storage layer for task and conversation persistence
- **Logging**: Structured logging with Pino
- **Type Safety**: Full TypeScript support with Zod validation

## Installation

```bash
npm install @crafting-agent/shared
```

## Quick Start

```typescript
import { Task, TaskStorage, ModelConfig } from '@crafting-agent/shared'

// Initialize task storage
const storage = new TaskStorage(/* your storage config */)

// Create a task
const task = new Task(
  'task-id',
  'project-id',
  {
    agentModel: {
      provider: 'openrouter',
      apiKey: 'your-api-key',
      model: 'anthropic/claude-3.5-sonnet'
    }
  },
  storage,
  {
    tools: [/* your tools */],
    variables: {}
  }
)

// Execute task
for await (const chunk of task.startTask('Your task description')) {
  if (chunk.type === 'text') {
    console.log(chunk.text)
  } else if (chunk.type === 'tool_calls') {
    console.log('Tool called:', chunk.tool_call)
  }
}
```

## Supported Providers

- **Google**: Google AI models
- **Doubao**: ByteDance's Doubao models
- **Minimax**: MiniMax AI models
- **OpenRouter**: Access to multiple models via OpenRouter

## API Documentation

### Task

The main class for executing AI tasks.

```typescript
const task = new Task(
  taskId: string,
  projectId: string,
  modelConfig: ModelConfig,
  storage: TaskStorage,
  taskContext: TaskContext
)

// Start task execution
const stream = task.startTask(userInstruction: string): AsyncGenerator<ApiStream>
```

### Tools

Create custom tools by implementing the `Tool` interface:

```typescript
import { Tool, ToolDefinition } from '@crafting-agent/shared'

class MyTool implements Tool {
  tool(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'my_tool',
        description: 'Description of my tool',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          }
        }
      }
    }
  }

  async execute(toolCall: ApiStreamToolCall, context: TaskContext): Promise<string> {
    // Implementation
  }
}
```

## Configuration

### ModelConfig

```typescript
interface ModelConfig {
  agentModel: {
    provider: 'google' | 'doubao' | 'minimax' | 'openrouter'
    apiKey: string
    model: string
    baseUrl?: string
  }
}
```

### TaskContext

```typescript
interface TaskContext {
  tools?: Tool[]
  variables?: Record<string, string>
  systemPromptBuilder?: ISystemPromptBuilder
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Lint
npm run lint
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

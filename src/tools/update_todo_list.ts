import { ChatCompletionTool as OpenAITool } from 'openai/resources/chat/completions'
import { ToolHandler, ApiStreamToolCall, TaskContext, ToolConfig } from '../types'

export const TodoTool: OpenAITool = {
    type: 'function',
    function: {
        name: 'update_todo_list',
        description: 'Replace the entire TODO list with an updated checklist reflecting the current state. Always provide the full list; the system will overwrite the previous one. This tool is designed for step-by-step task tracking, allowing you to confirm completion of each step before updating, update multiple task statuses at once (e.g., mark one as completed and start the next), and dynamically add new todos discovered during long or complex tasks.\n\nChecklist Format:\n- Use a single-level markdown checklist (no nesting or subtasks)\n- List todos in the intended execution order\n- Status options: [ ] (pending), [x] (completed), [-] (in progress)\n\nCore Principles:\n- Before updating, always confirm which todos have been completed\n- You may update multiple statuses in a single update\n- Add new actionable items as they\'re discovered\n- Only mark a task as completed when fully accomplished\n- Keep all unfinished tasks unless explicitly instructed to remove\n\nExample: Initial task list\n{ "todos": "[x] Analyze requirements\\n[x] Design architecture\\n[-] Implement core logic\\n[ ] Write tests\\n[ ] Update documentation" }\n\nExample: After completing implementation\n{ "todos": "[x] Analyze requirements\\n[x] Design architecture\\n[x] Implement core logic\\n[-] Write tests\\n[ ] Update documentation\\n[ ] Add performance benchmarks" }\n\nWhen to Use:\n- Task involves multiple steps or requires ongoing tracking\n- Need to update status of several todos at once\n- New actionable items are discovered during execution\n- Task is complex and benefits from stepwise progress tracking\n\nWhen NOT to Use:\n- Only a single, trivial task\n- Task can be completed in one or two simple steps\n- Request is purely conversational or informational',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Full markdown checklist in execution order, using [ ] for pending, [x] for completed, and [-] for in progress' },
            },
            required: ['content'],
        },
    },
}

export class TodoToolHandler implements ToolHandler {
    getConfig(): ToolConfig {
        return {
            humanInLoop: false,
        }
    }

    tool(): OpenAITool {
        return TodoTool
    }

    async execute(toolCall: ApiStreamToolCall, context: TaskContext): Promise<string> {
        return 'Todo item added'
    }
}

export interface TodoItem {
    idx: number
    content: string
    status: string
}

export function formatReminderSection(todoList?: TodoItem[]): string {
    if (!todoList || todoList.length === 0) {
        return "You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps."
    }
    const statusMap: Record<string, string> = {
        pending: "Pending",
        in_progress: "In Progress",
        completed: "Completed",
    }
    const lines: string[] = [
        "====",
        "",
        "REMINDERS",
        "",
        "Below is your current list of reminders for this task. Keep them updated as you progress.",
        "",
    ]

    lines.push("| # | Content | Status |")
    lines.push("|---|---------|--------|")
    todoList.forEach((item, idx) => {
        const escapedContent = item.content.replace(/\\/g, "\\\\").replace(/\|/g, "\\|")
        lines.push(`| ${idx + 1} | ${escapedContent} | ${statusMap[item.status] || item.status} |`)
    })
    lines.push("")

    lines.push(
        "",
        "IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.",
        "",
    )
    return lines.join("\n")
}

// export function parseMarkdownChecklist(md: string): TodoItem[] {
//     if (typeof md !== "string") return []
//     const lines = md
//         .split(/\r?\n/)
//         .map((l) => l.trim())
//         .filter(Boolean)
//     const todos: TodoItem[] = []
//     for (const line of lines) {
//         const match = line.match(/^(?:-\s*)?\[\s*([ xX\-~])\s*\]\s+(.+)$/)
//         if (!match) continue
//         let status: string = "pending"
//         if (match[1] === "x" || match[1] === "X") status = "completed"
//         else if (match[1] === "-" || match[1] === "~") status = "in_progress"
//         const id = crypto
//             .createHash("md5")
//             .update(match[2] + status)
//             .digest("hex")
//         todos.push({
//             id,
//             content: match[2],
//             status,
//         })
//     }
//     return todos
// }
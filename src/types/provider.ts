export interface ServiceOption {
  value: string
  label: string
  endpoint: string
  models: string[]
  inputPrice?: number
  ouputPrice?: number
  callMethod?: string
  tags?: string[]
}



export interface ImageServiceOption {
  value: string
  label: string
  endpoint: string
  models: string[]
}


export const serviceOptions: ServiceOption[] = [
  {
    value: `deepseek`,
    label: `DeepSeek`,
    endpoint: `https://api.deepseek.com/v1`,
    models: [`deepseek-chat`, `deepseek-reasoner`],
  },
  {
    value: `openai`,
    label: `OpenAI`,
    endpoint: `https://api.openai.com/v1`,
    models: [`gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4-turbo`, `gpt-4o`, `gpt-3.5-turbo`],
  },
  {
    value: `qwen`,
    label: `通义千问`,
    endpoint: `https://dashscope.aliyuncs.com/compatible-mode/v1`,
    models: [

    ],
  },
  {
    value: `doubao`,
    label: `火山方舟`,
    endpoint: `https://ark.cn-beijing.volces.com/api/v3`,
    models: [
      `doubao-1-5-pro-32k-250115`,
      `doubao-1-5-pro-256k-250115`,
      `doubao-1-5-lite-32k-250115`,
    ],
  },
  {
    value: `siliconflow`,
    label: `硅基流动`,
    endpoint: `https://api.siliconflow.cn/v1`,
    models: [
      `Pro/deepseek-ai/DeepSeek-R1`,
      `Pro/deepseek-ai/DeepSeek-V3`,
      `deepseek-ai/DeepSeek-R1`,
      `deepseek-ai/DeepSeek-V3`,
      `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B`,
      `deepseek-ai/DeepSeek-R1-Distill-Qwen-14B`,
      `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B`,
      `Pro/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B`,
      `Pro/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B`,
      `deepseek-ai/DeepSeek-V2.5`,
      `Qwen/Qwen2.5-72B-Instruct-128K`,
      `Qwen/Qwen2.5-72B-Instruct`,
      `Qwen/Qwen2.5-32B-Instruct`,
      `Qwen/Qwen2.5-14B-Instruct`,
      `Qwen/Qwen2.5-7B-Instruct`,
      `Qwen/Qwen2.5-Coder-32B-Instruct`,
      `Qwen/Qwen2.5-Coder-7B-Instruct`,
      `Qwen/Qwen2-7B-Instruct`,
      `Qwen/QwQ-32B-Preview`,
      `TeleAI/TeleChat2`,
      `THUDM/glm-4-9b-chat`,
      `Vendor-A/Qwen/Qwen2.5-72B-Instruct`,
      `internlm/internlm2_5-7b-chat`,
      `internlm/internlm2_5-20b-chat`,
    ],
  },
  {
    value: `bigmodel`,
    label: `智谱 AI`,
    endpoint: `https://open.bigmodel.cn/api/paas/v4/`,
    models: [
      `glm-4-plus`,
      `glm-4-0520`,
      `glm-4`,
      `glm-4-air`,
      `glm-4-airx`,
      `glm-4-long`,
      `glm-4-flashx`,
      `glm-4-flash`,
    ],
  },
  {
    value: `custom`,
    label: `自定义兼容 OpenAI API 的服务`,
    endpoint: ``,
    models: [],
  },
]

// 图片模型
export const imageServiceOptions: ImageServiceOption[] = [
  {
    value: `openai`,
    label: `OpenAI`,
    endpoint: `https://api.openai.com/v1`,
    models: [`gpt-image-1`, `dall-e-3`],
  },
  {
    value: `siliconflow`,
    label: `硅基流动`,
    endpoint: `https://api.siliconflow.cn/v1`,
    models: [
      `Kwai-Kolors/Kolors`,
      `Qwen/Qwen-Image`,
    ],
  },
  {
    value: `custom`,
    label: `自定义兼容 OpenAI API 的服务`,
    endpoint: ``,
    models: [],
  },
]

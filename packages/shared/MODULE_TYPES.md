# Node.js 模块系统配置指南

## 📚 目录

- [模块系统概述](#模块系统概述)
- [package.json 中的 type 字段](#packagejson-中的-type-字段)
- [tsconfig.json 配置](#tsconfigjson-配置)
- [完整配置示例](#完整配置示例)
- [选择建议](#选择建议)

---

## 模块系统概述

Node.js 支持两种模块系统：

| 模块系统 | 语法 | 特点 |
|---------|------|------|
| **CommonJS (CJS)** | `require()` / `module.exports` | Node.js 传统模块系统，同步加载 |
| **ES Module (ESM)** | `import` / `export` | 现代 JavaScript 标准，异步加载，支持 Tree-shaking |

---

## package.json 中的 type 字段

### 1️⃣ CommonJS 模式（默认）

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

**特点：**
- ✅ 不需要声明 `"type"` 字段（默认就是 CommonJS）
- ✅ `.js` 文件被视为 CommonJS 模块
- ✅ 可以省略文件扩展名：`require('./modules')` 自动找 `modules/index.js`
- ✅ 兼容性最好，所有 Node.js 版本都支持
- ❌ 不支持顶层 `await`
- ❌ Tree-shaking 效果较差

**生成的代码示例：**

```javascript
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const something = require("./modules");
module.exports = { something };
```

---

### 2️⃣ ES Module 模式

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

**特点：**
- ✅ `.js` 文件被视为 ES Module
- ✅ 支持顶层 `await`
- ✅ 更好的 Tree-shaking（打包优化）
- ✅ 符合现代 JavaScript 标准
- ⚠️ **必须明确指定文件扩展名**：`import x from './modules/index.js'`
- ⚠️ 不能省略扩展名或使用目录导入
- ❌ 需要 Node.js 12.20+ 或 14.13+

**生成的代码示例：**

```javascript
export * from './modules/index.js';
```

---

### 3️⃣ 混合模式（双包支持）

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.cjs",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

**特点：**
- ✅ 同时提供 CommonJS 和 ESM 版本
- ✅ 让使用者自由选择
- ✅ 最佳兼容性
- ❌ 需要维护两份构建产物
- ❌ 配置较复杂

---

## tsconfig.json 配置

### 🔧 CommonJS 配置

适用于：Node.js 后端项目、CLI 工具、需要最大兼容性的库

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2020",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**关键配置说明：**

| 配置项 | 值 | 说明 |
|-------|-----|-----|
| `module` | `"CommonJS"` | 生成 CommonJS 格式代码 |
| `moduleResolution` | `"node"` | 使用 Node.js 的模块解析策略 |
| `esModuleInterop` | `true` | 允许使用 `import x from 'x'` 导入 CommonJS 模块 |

**源代码：**
```typescript
// src/index.ts
export * from './modules'
```

**编译后：**
```javascript
// dist/index.js
"use strict";
var __createBinding = (this && this.__createBinding) || ...;
var __exportStar = (this && this.__exportStar) || function(m, exports) { ... };
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./modules"), exports);
```

---

### 🔧 ES Module 配置

适用于：现代前端项目、使用构建工具（Vite/Webpack）的项目

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**关键配置说明：**

| 配置项 | 值 | 说明 |
|-------|-----|-----|
| `module` | `"ESNext"` | 保留 ES Module 语法 |
| `moduleResolution` | `"bundler"` | 使用构建工具的模块解析（Vite/Webpack） |
| `noEmit` | `true` | TypeScript 只做类型检查，不生成代码（由 Vite 处理） |
| `isolatedModules` | `true` | 确保每个文件都能独立转译（适配构建工具） |

**特点：**
- TypeScript 只做类型检查
- 实际编译由 Vite/Webpack 等工具完成
- 可以省略扩展名（构建工具会处理）

---

### 🔧 ES Module 配置（用于 Node.js 直接运行）

适用于：Node.js 原生 ESM 项目（`"type": "module"`）

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node16",
    "target": "ES2020",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**关键配置说明：**

| 配置项 | 值 | 说明 |
|-------|-----|-----|
| `module` | `"ESNext"` | 保留 ES Module 语法 |
| `moduleResolution` | `"node16"` 或 `"nodenext"` | Node.js 的 ESM 解析规则 |

**⚠️ 重要：** 使用此配置时，**必须在源代码中明确指定 `.js` 扩展名**

**源代码：**
```typescript
// src/index.ts
export * from './modules/index.js'  // 注意：必须写 .js 而不是 .ts
```

**编译后：**
```javascript
// dist/index.js
export * from './modules/index.js';
```

---

## 完整配置示例

### 📦 示例 1：纯 CommonJS 库

**package.json**
```json
{
  "name": "@my/package",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2020",
    "outDir": "dist",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true
  }
}
```

**使用方式：**
```javascript
// CommonJS 使用者
const pkg = require('@my/package');

// ESM 使用者（通过互操作）
import pkg from '@my/package';
```

---

### 📦 示例 2：纯 ES Module 库（Node.js 原生）

**package.json**
```json
{
  "name": "@my/package",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node16",
    "target": "ES2020",
    "outDir": "dist",
    "declaration": true,
    "strict": true
  }
}
```

**src/index.ts**
```typescript
export * from './modules/index.js'
```

**使用方式：**
```javascript
// 只能用 ESM
import { something } from '@my/package';
```

---

### 📦 示例 3：前端 Vite 项目

**package.json**
```json
{
  "name": "my-app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "jsx": "preserve",
    "noEmit": true,
    "isolatedModules": true,
    "strict": true
  }
}
```

**src/main.ts**
```typescript
import { something } from './modules'  // 可以省略扩展名，Vite 处理
```

---

## 选择建议

### 🎯 根据项目类型选择

| 项目类型 | 推荐配置 | 原因 |
|---------|---------|------|
| **Node.js 后端/CLI** | CommonJS | 最大兼容性，无需扩展名 |
| **前端项目（Vite/Webpack）** | ESM + bundler | 现代化，构建工具处理一切 |
| **npm 公共库** | 双包支持 | 让使用者自由选择 |
| **Node.js 原生 ESM** | ESM + node16 | 现代标准，但需注意扩展名 |

---

### 🔄 从 ESM 迁移到 CommonJS

**步骤：**

1. **修改 `package.json`**
   ```diff
   {
     "name": "@my/package",
   -  "type": "module",
     "main": "./dist/index.js",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
   +      "require": "./dist/index.js",
         "import": "./dist/index.js",
         "default": "./dist/index.js"
       }
     }
   }
   ```

2. **修改 `tsconfig.json`**
   ```diff
   {
     "compilerOptions": {
   -    "module": "ESNext",
   +    "module": "CommonJS",
   -    "moduleResolution": "bundler",
   +    "moduleResolution": "node",
       // ... 其他配置
     }
   }
   ```

3. **重新编译**
   ```bash
   npm run build
   ```

4. **验证**
   ```bash
   node -e "const pkg = require('./dist/index.js'); console.log(pkg);"
   ```

---

### 🔄 从 CommonJS 迁移到 ESM

**步骤：**

1. **修改 `package.json`**
   ```diff
   {
     "name": "@my/package",
   +  "type": "module",
     "main": "./dist/index.js",
   }
   ```

2. **修改 `tsconfig.json`**
   ```diff
   {
     "compilerOptions": {
   -    "module": "CommonJS",
   +    "module": "ESNext",
   -    "moduleResolution": "node",
   +    "moduleResolution": "node16",
       // ... 其他配置
     }
   }
   ```

3. **⚠️ 修改所有导入语句，添加 `.js` 扩展名**
   ```diff
   - export * from './modules'
   + export * from './modules/index.js'
   
   - import { something } from './utils'
   + import { something } from './utils/index.js'
   ```

4. **重新编译并测试**
   ```bash
   npm run build
   node dist/index.js
   ```

---

## 常见问题

### ❓ 为什么 ESM 必须写 `.js` 扩展名？

**答：** 这是 Node.js ES Module 规范的要求。浏览器和 Node.js 的 ESM 实现都要求明确的文件路径，不会自动尝试添加扩展名或查找 `index.js`。

### ❓ 为什么 TypeScript 源码要写 `.js` 而不是 `.ts`？

**答：** TypeScript 编译器会保留你写的路径，不会修改。如果你写 `'./module.ts'`，编译后还是 `'./module.ts'`，但运行时找不到 `.ts` 文件（只有 `.js`），所以源码中就要写 `.js`。

### ❓ 使用 Vite 时为什么不需要扩展名？

**答：** Vite 是构建工具，它会在构建时处理所有导入路径。`moduleResolution: "bundler"` 告诉 TypeScript "有构建工具会处理这些"，所以不检查扩展名。

### ❓ 如何判断项目应该用哪种配置？

**答：**
- 看 `package.json` 有没有 `"type": "module"`
- 看是否使用构建工具（Vite/Webpack）
- 看是否需要 Node.js 直接运行编译后的代码

---

## 参考资料

- [Node.js ES Modules 文档](https://nodejs.org/api/esm.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [package.json exports 字段](https://nodejs.org/api/packages.html#exports)

---

**最后更新：** 2024-12-16


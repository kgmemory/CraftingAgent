import path from 'node:path'
import { constructNewFileContent } from './diff'
import { fileExistsAtPath, createDirectoriesForFile, writeFile } from './fs'
import { fixModelHtmlEscaping, removeInvalidChars } from './string'
import fs from 'fs/promises'

export interface FileWriteResult {
  absolutePath: string
  relPath: string
  fileExists: boolean
  finalContent: string
}

export class FileWriteError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'missing_path'
      | 'missing_content'
      | 'missing_diff'
      | 'diff_error'
      | 'write_error',
  ) {
    super(message)
    this.name = 'FileWriteError'
  }
}

export interface FileWriteOptions {
  cwd: string
  applyHtmlEscapingFix?: boolean
  isPartial?: boolean
}

/**
 * Core file write operation - writes or modifies files based on rawRelPath, rawContent, or rawDiff.
 * This is the extracted core logic from WriteToFileToolHandler.execute method.
 *
 * @param rawRelPath - Relative or absolute path to the file
 * @param rawContent - Direct content for write_to_file operations (optional if rawDiff is provided)
 * @param rawDiff - Diff content for replace_in_file operations (optional if rawContent is provided)
 * @param options - Configuration options for the operation
 * @returns Promise resolving to FileWriteResult with operation details
 * @throws FileWriteError if validation fails or operation cannot complete
 */
export async function writeFileCore(
  rawRelPath: string,
  rawContent?: string,
  rawDiff?: string,
  options: FileWriteOptions = { cwd: process.cwd() },
): Promise<FileWriteResult> {
  if (!rawRelPath) {
    throw new FileWriteError('Path is required', 'missing_path')
  }

  if (!rawContent && !rawDiff) {
    throw new FileWriteError(
      'Either content or diff is required',
      'missing_content',
    )
  }

  // Currently uses simple path.resolve, but original code used resolveWorkspacePath for multi-workspace support
  const absolutePath = path.isAbsolute(rawRelPath)
    ? rawRelPath
    : path.resolve(options.cwd, rawRelPath)
  const relPath = rawRelPath

  const fileExists = await fileExistsAtPath(absolutePath)

  let originalContent = ''
  if (fileExists && rawDiff) {
    try {
      originalContent = await fs.readFile(absolutePath, 'utf8')
    } catch (error) {
      throw new FileWriteError(
        `Failed to read existing file: ${(error as Error).message}`,
        'write_error',
      )
    }
  }

  let newContent: string

  if (rawDiff) {
    // Handle replace_in_file with diff construction
    let processedDiff = rawDiff

    // Apply HTML escaping fixes if needed (for non-Claude models)
    if (options.applyHtmlEscapingFix !== false) {
      processedDiff = fixModelHtmlEscaping(processedDiff)
      processedDiff = removeInvalidChars(processedDiff)
    }

    try {
      newContent = await constructNewFileContent(
        processedDiff,
        originalContent,
        !options.isPartial,
      )
    } catch (error) {
      throw new FileWriteError(
        `Failed to construct new file content from diff: ${(error as Error).message}`,
        'diff_error',
      )
    }
  } else if (rawContent) {
    newContent = rawContent

    // Pre-processing newContent for cases where weaker models might add artifacts
    if (newContent.startsWith('```')) {
      newContent = newContent.split('\n').slice(1).join('\n').trim()
    }
    if (newContent.endsWith('```')) {
      newContent = newContent.split('\n').slice(0, -1).join('\n').trim()
    }

    // Apply HTML escaping fixes if needed (for non-Claude models)
    if (options.applyHtmlEscapingFix !== false) {
      newContent = fixModelHtmlEscaping(newContent)
      newContent = removeInvalidChars(newContent)
    }
  } else {
    throw new FileWriteError(
      'Either content or diff is required',
      'missing_content',
    )
  }

  newContent = newContent.trimEnd()

  try {
    await createDirectoriesForFile(absolutePath)
  } catch (error) {
    throw new FileWriteError(
      `Failed to create directories: ${(error as Error).message}`,
      'write_error',
    )
  }

  try {
    await writeFile(absolutePath, newContent, 'utf8')
  } catch (error) {
    throw new FileWriteError(
      `Failed to write file: ${(error as Error).message}`,
      'write_error',
    )
  }

  return {
    absolutePath,
    relPath,
    fileExists,
    finalContent: newContent,
  }
}

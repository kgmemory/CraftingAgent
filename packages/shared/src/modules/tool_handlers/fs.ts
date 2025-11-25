import fs from 'fs/promises'
import * as path from 'path'

const IS_WINDOWS = /^win/.test(process.platform)

/**
 * Asynchronously creates all non-existing subdirectories for a given file path
 * and collects them in an array for later deletion.
 *
 * @param filePath - The full path to a file.
 * @returns A promise that resolves to an array of newly created directories.
 */
export async function createDirectoriesForFile(
  filePath: string,
): Promise<string[]> {
  const newDirectories: string[] = []
  const normalizedFilePath = path.normalize(filePath) // Normalize path for cross-platform compatibility
  const directoryPath = path.dirname(normalizedFilePath)

  let currentPath = directoryPath
  const dirsToCreate: string[] = []

  // Traverse up the directory tree and collect missing directories
  while (!(await fileExistsAtPath(currentPath))) {
    dirsToCreate.push(currentPath)
    currentPath = path.dirname(currentPath)
  }

  // Create directories from the topmost missing one down to the target directory
  for (let i = dirsToCreate.length - 1; i >= 0; i--) {
    await fs.mkdir(dirsToCreate[i])
    newDirectories.push(dirsToCreate[i])
  }

  return newDirectories
}

/**
 * Helper function to check if a path exists.
 *
 * @param path - The path to check.
 * @returns A promise that resolves to true if the path exists, false otherwise.
 */
export async function fileExistsAtPath(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch (error) {
    console.log(error)
    return false
  }
}

/**
 * Checks if the path is a directory
 * @param filePath - The path to check.
 * @returns A promise that resolves to true if the path is a directory, false otherwise.
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
 * Gets the size of a file in kilobytes
 * @param filePath - Path to the file to check
 * @returns Promise<number> - Size of the file in KB, or 0 if file doesn't exist
 */
export async function getFileSizeInKB(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath)
    const fileSizeInKB = stats.size / 1000 // Convert bytes to KB (decimal) - matches OS file size display
    return fileSizeInKB
  } catch {
    return 0
  }
}

/**
 * Writes content to a file
 * @param filePath - Absolute path to the file
 * @param content - Content to write (string or Uint8Array)
 * @param encoding - Text encoding (default: 'utf8')
 * @returns A promise that resolves when the file is written
 */
export async function writeFile(
  filePath: string,
  content: string | Uint8Array,
  encoding: BufferEncoding = 'utf8',
): Promise<void> {
  console.log('[DEBUG] writing file:', filePath, content.length, encoding)
  if (content instanceof Uint8Array) {
    await fs.writeFile(filePath, content)
  } else {
    await fs.writeFile(filePath, content, encoding)
  }
}

// Common OS-generated files that would appear in an otherwise clean directory
const OS_GENERATED_FILES = [
  '.DS_Store', // macOS Finder
  'Thumbs.db', // Windows Explorer thumbnails
  'desktop.ini', // Windows folder settings
]

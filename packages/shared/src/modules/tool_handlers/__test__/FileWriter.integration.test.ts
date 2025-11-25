import path from 'node:path'
import fs from 'fs/promises'
import { writeFileCore, FileWriteError } from '../file_writer'
import { fileExistsAtPath } from '../fs'

/**
 * Integration tests for FileWriter with real file system operations
 * These tests actually create and modify files on disk
 */
describe('FileWriter - Integration Tests', () => {
  const testDir =
    '/Users/liuzhiyuan/Documents/code/renpyAgent/src/modules/tool_handlers/__test__'
  describe('rawContent mode - real file operations', () => {
    it('should create a new file with rawContent', async () => {
      const testContent = 'console.log("Hello, World!");'
      const testPath = path.join(testDir, 'brief.txt')

      // Verify file doesn't exist before
      const existsBefore = await fileExistsAtPath(testPath)
      expect(existsBefore).toBe(false)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: testDir,
      })

      // Verify result
      expect(result.fileExists).toBe(false) // Was false when we checked
      expect(result.finalContent).toBe(testContent)

      // Verify file was actually created
      const existsAfter = await fileExistsAtPath(testPath)
      expect(existsAfter).toBe(true)

      // Verify content was written correctly
      const actualContent = await fs.readFile(testPath, 'utf8')
      expect(actualContent).toBe(testContent)
    })

    it('should overwrite an existing file with rawContent', async () => {
      const originalContent = 'original content'
      const newContent = 'updated content'
      const testPath = path.join(testDir, 'test-overwrite.txt')

      // Create initial file
      await fs.writeFile(testPath, originalContent, 'utf8')

      // Verify file exists
      const existsBefore = await fileExistsAtPath(testPath)
      expect(existsBefore).toBe(true)

      // Overwrite file
      const result = await writeFileCore(testPath, newContent, undefined, {
        cwd: testDir,
      })

      expect(result.fileExists).toBe(true)
      expect(result.finalContent).toBe(newContent)

      // Verify content was updated
      const actualContent = await fs.readFile(testPath, 'utf8')
      expect(actualContent).toBe(newContent)
    })

    it('should create nested directories automatically', async () => {
      const testContent = 'nested file content'
      const testPath = path.join(testDir, 'deep', 'nested', 'dir', 'file.txt')

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: testDir,
      })

      expect(result.finalContent).toBe(testContent)

      // Verify file was created in nested directory
      const existsAfter = await fileExistsAtPath(testPath)
      expect(existsAfter).toBe(true)

      const actualContent = await fs.readFile(testPath, 'utf8')
      expect(actualContent).toBe(testContent)
    })

    it('should strip code block markers from content', async () => {
      const contentWithMarkers = '```javascript\nconst x = 1;\n```'
      const expectedContent = 'const x = 1;'
      const testPath = path.join(testDir, 'test-markers.js')

      await writeFileCore(testPath, contentWithMarkers, undefined, {
        cwd: testDir,
      })

      const actualContent = await fs.readFile(testPath, 'utf8')
      expect(actualContent).toBe(expectedContent)
    })
  })

  describe('rawDiff mode - real diff operations', () => {
    it('should apply diff to modify existing file', async () => {
      const originalContent = 'line 1\nline 2\nline 3\n'
      const testPath = path.join(testDir, 'test-diff.txt')

      // Create initial file
      await fs.writeFile(testPath, originalContent, 'utf8')

      // Apply diff
      const diffContent = `------- SEARCH
line 2
=======
line 2 modified
+++++++ REPLACE`

      const result = await writeFileCore(testPath, undefined, diffContent, {
        cwd: testDir,
      })

      expect(result.fileExists).toBe(true)

      // Verify the modification was applied
      const actualContent = await fs.readFile(testPath, 'utf8')
      expect(actualContent).toContain('line 1')
      expect(actualContent).toContain('line 2 modified')
      expect(actualContent).toContain('line 3')
      expect(actualContent).not.toContain('line 2\n')
    })

    it('should create new file using empty SEARCH block', async () => {
      const testPath = path.join(testDir, 'test-new-diff.txt')
      const newContent = 'new file content via diff'

      const diffContent = `------- SEARCH

=======
${newContent}
+++++++ REPLACE`

      const result = await writeFileCore(testPath, undefined, diffContent, {
        cwd: testDir,
      })

      expect(result.fileExists).toBe(false) // Didn't exist when we started

      // Verify file was created
      const actualContent = await fs.readFile(testPath, 'utf8')
      expect(actualContent.trim()).toBe(newContent)
    })

    it('should apply multiple replacements in sequence', async () => {
      const originalContent = 'first\nsecond\nthird\n'
      const testPath = path.join(testDir, 'test-multiple.txt')

      // Create initial file
      await fs.writeFile(testPath, originalContent, 'utf8')

      // First diff
      const diff1 = `------- SEARCH
first
=======
1st
+++++++ REPLACE`

      await writeFileCore(testPath, undefined, diff1, { cwd: testDir })

      // Verify first change
      let content = await fs.readFile(testPath, 'utf8')
      expect(content).toContain('1st')
      expect(content).toContain('second')

      // Second diff
      const diff2 = `------- SEARCH
second
=======
2nd
+++++++ REPLACE`

      await writeFileCore(testPath, undefined, diff2, { cwd: testDir })

      // Verify both changes
      content = await fs.readFile(testPath, 'utf8')
      expect(content).toContain('1st')
      expect(content).toContain('2nd')
      expect(content).toContain('third')
    })
  })

  describe('Error handling with real file system', () => {
    it('should throw error when path is empty', async () => {
      await expect(
        writeFileCore('', 'content', undefined, { cwd: testDir }),
      ).rejects.toThrow(FileWriteError)
    })

    it('should throw error when both content and diff are missing', async () => {
      await expect(
        writeFileCore('test.txt', undefined, undefined, { cwd: testDir }),
      ).rejects.toThrow(FileWriteError)
    })
  })

  describe('fileExistsAtPath behavior', () => {
    it('should return true for existing files', async () => {
      const testPath = path.join(testDir, 'exists.txt')
      await fs.writeFile(testPath, 'test content', 'utf8')

      const exists = await fileExistsAtPath(testPath)
      expect(exists).toBe(true)
    })

    it('should return false for non-existing files', async () => {
      const testPath = path.join(testDir, 'does-not-exist.txt')

      const exists = await fileExistsAtPath(testPath)
      expect(exists).toBe(false)
    })

    it('should return true for existing directories', async () => {
      const dirPath = path.join(testDir, 'test-subdir')
      await fs.mkdir(dirPath, { recursive: true })

      const exists = await fileExistsAtPath(dirPath)
      expect(exists).toBe(true)
    })
  })
})

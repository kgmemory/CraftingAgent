import fs from 'fs/promises'
import path from 'node:path'
import { writeFileCore, FileWriteError } from '../file_writer'
import { constructNewFileContent } from '../diff'
import { fileExistsAtPath, createDirectoriesForFile, writeFile } from '../fs'
import { fixModelHtmlEscaping, removeInvalidChars } from '../string'

// Mock all dependencies
jest.mock('fs/promises')
jest.mock('../diff')
jest.mock('../fs')
jest.mock('../string')

describe('FileWriter - writeFileCore', () => {
  const mockCwd =
    '/Users/liuzhiyuan/Documents/code/renpyAgent/src/modules/tool_handlers/__test__'

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    ;(fixModelHtmlEscaping as jest.Mock).mockImplementation(
      (text: string) => text,
    )
    ;(removeInvalidChars as jest.Mock).mockImplementation(
      (text: string) => text,
    )
    ;(createDirectoriesForFile as jest.Mock).mockResolvedValue([])
    ;(writeFile as jest.Mock).mockResolvedValue(undefined)
  })

  describe('rawContent mode - creating and overwriting files', () => {
    it('test fs', async () => {
      try {
        await fs.access(
          '/Users/liuzhiyuan/Documents/code/renpyAgent/src/modules/tool_handlers/__test__/brief.txt',
        )
      } catch (error) {
        console.log(error)
      }
    })
    it('should create a new file with rawContent', async () => {
      const testContent = 'console.log("Hello, World!");'
      const testPath = 'brief.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result).toEqual({
        absolutePath: path.resolve(mockCwd, testPath),
        relPath: testPath,
        fileExists: false,
        finalContent: testContent,
      })

      expect(createDirectoriesForFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
      )
      expect(writeFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
        testContent,
        'utf8',
      )
    })

    it('should overwrite an existing file with rawContent', async () => {
      const testContent = 'const updated = true;'
      const testPath = 'existing.js'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(true)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result).toEqual({
        absolutePath: path.resolve(mockCwd, testPath),
        relPath: testPath,
        fileExists: true,
        finalContent: testContent,
      })

      expect(writeFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
        testContent,
        'utf8',
      )
    })

    it('should strip code block markers from rawContent (``` at start and end)', async () => {
      const contentWithMarkers = '```typescript\nconst x = 1;\n```'
      const expectedContent = 'const x = 1;'
      const testPath = 'test.ts'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(
        testPath,
        contentWithMarkers,
        undefined,
        {
          cwd: mockCwd,
        },
      )

      expect(result.finalContent).toBe(expectedContent)
      expect(writeFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
        expectedContent,
        'utf8',
      )
    })

    it('should handle absolute paths in rawContent mode', async () => {
      const testContent = 'test content'
      const absolutePath = '/absolute/path/to/file.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(absolutePath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result.absolutePath).toBe(absolutePath)
      expect(result.relPath).toBe(absolutePath)
      expect(writeFile).toHaveBeenCalledWith(absolutePath, testContent, 'utf8')
    })

    it('should apply HTML escaping fixes when applyHtmlEscapingFix is true', async () => {
      const testContent = 'const a = &gt; &lt;'
      const fixedContent = 'const a = > <'
      const testPath = 'test.js'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)
      ;(fixModelHtmlEscaping as jest.Mock).mockReturnValue(fixedContent)
      ;(removeInvalidChars as jest.Mock).mockReturnValue(fixedContent)

      await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
        applyHtmlEscapingFix: true,
      })

      expect(fixModelHtmlEscaping).toHaveBeenCalledWith(testContent)
      expect(removeInvalidChars).toHaveBeenCalledWith(fixedContent)
      expect(writeFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
        fixedContent,
        'utf8',
      )
    })

    it('should not apply HTML escaping fixes when applyHtmlEscapingFix is false', async () => {
      const testContent = 'const a = &gt; &lt;'
      const testPath = 'test.js'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
        applyHtmlEscapingFix: false,
      })

      expect(fixModelHtmlEscaping).not.toHaveBeenCalled()
      expect(removeInvalidChars).not.toHaveBeenCalled()
    })

    it('should trim trailing whitespace from content', async () => {
      const testContent = 'const x = 1;   \n\n\n'
      const expectedContent = 'const x = 1;'
      const testPath = 'test.js'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result.finalContent).toBe(expectedContent)
      expect(writeFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
        expectedContent,
        'utf8',
      )
    })
  })

  describe('rawDiff mode - modifying existing files', () => {
    it('should apply diff to an existing file', async () => {
      const originalContent = 'line 1\nline 2\nline 3'
      const diffContent = `------- SEARCH
line 2
=======
line 2 modified
+++++++ REPLACE`
      const newContent = 'line 1\nline 2 modified\nline 3'
      const testPath = 'test.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(true)
      ;(fs.readFile as jest.Mock).mockResolvedValue(originalContent)
      ;(constructNewFileContent as jest.Mock).mockResolvedValue(newContent)

      const result = await writeFileCore(testPath, undefined, diffContent, {
        cwd: mockCwd,
      })

      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
        'utf8',
      )
      expect(constructNewFileContent).toHaveBeenCalledWith(
        diffContent,
        originalContent,
        true, // !isPartial
      )
      expect(result.finalContent).toBe(newContent)
      expect(writeFile).toHaveBeenCalledWith(
        path.resolve(mockCwd, testPath),
        newContent,
        'utf8',
      )
    })

    it('should apply diff in partial mode when isPartial is true', async () => {
      const originalContent = 'existing content'
      const diffContent =
        '------- SEARCH\nexisting\n=======\nupdated\n+++++++ REPLACE'
      const newContent = 'updated content'
      const testPath = 'test.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(true)
      ;(fs.readFile as jest.Mock).mockResolvedValue(originalContent)
      ;(constructNewFileContent as jest.Mock).mockResolvedValue(newContent)

      await writeFileCore(testPath, undefined, diffContent, {
        cwd: mockCwd,
        isPartial: true,
      })

      expect(constructNewFileContent).toHaveBeenCalledWith(
        diffContent,
        originalContent,
        false, // !isPartial = false
      )
    })

    it('should create a new file with diff when file does not exist', async () => {
      const diffContent = `------- SEARCH

=======
new file content
+++++++ REPLACE`
      const newContent = 'new file content'
      const testPath = 'new.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)
      ;(constructNewFileContent as jest.Mock).mockResolvedValue(newContent)

      const result = await writeFileCore(testPath, undefined, diffContent, {
        cwd: mockCwd,
      })

      expect(fs.readFile).not.toHaveBeenCalled()
      expect(constructNewFileContent).toHaveBeenCalledWith(
        diffContent,
        '', // empty original content
        true,
      )
      expect(result.fileExists).toBe(false)
      expect(result.finalContent).toBe(newContent)
    })

    it('should apply HTML escaping fixes to diff content', async () => {
      const originalContent = 'const a = 1'
      const diffWithEscaping =
        '------- SEARCH\nconst a = 1\n=======\nconst a = &gt; 2\n+++++++ REPLACE'
      const fixedDiff =
        '------- SEARCH\nconst a = 1\n=======\nconst a = > 2\n+++++++ REPLACE'
      const newContent = 'const a = > 2'
      const testPath = 'test.js'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(true)
      ;(fs.readFile as jest.Mock).mockResolvedValue(originalContent)
      ;(fixModelHtmlEscaping as jest.Mock).mockReturnValue(fixedDiff)
      ;(removeInvalidChars as jest.Mock).mockReturnValue(fixedDiff)
      ;(constructNewFileContent as jest.Mock).mockResolvedValue(newContent)

      await writeFileCore(testPath, undefined, diffWithEscaping, {
        cwd: mockCwd,
        applyHtmlEscapingFix: true,
      })

      expect(fixModelHtmlEscaping).toHaveBeenCalledWith(diffWithEscaping)
      expect(removeInvalidChars).toHaveBeenCalledWith(fixedDiff)
      expect(constructNewFileContent).toHaveBeenCalledWith(
        fixedDiff,
        originalContent,
        true,
      )
    })

    it('should throw FileWriteError when diff construction fails', async () => {
      const originalContent = 'original'
      const diffContent = 'invalid diff'
      const testPath = 'test.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(true)
      ;(fs.readFile as jest.Mock).mockResolvedValue(originalContent)
      ;(constructNewFileContent as jest.Mock).mockRejectedValue(
        new Error('Diff application failed'),
      )

      await expect(
        writeFileCore(testPath, undefined, diffContent, { cwd: mockCwd }),
      ).rejects.toThrow(FileWriteError)

      await expect(
        writeFileCore(testPath, undefined, diffContent, { cwd: mockCwd }),
      ).rejects.toMatchObject({
        code: 'diff_error',
        message: expect.stringContaining(
          'Failed to construct new file content from diff',
        ),
      })
    })

    it('should throw FileWriteError when reading existing file fails for diff', async () => {
      const diffContent =
        '------- SEARCH\ntest\n=======\nmodified\n+++++++ REPLACE'
      const testPath = 'test.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(true)
      ;(fs.readFile as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      )

      await expect(
        writeFileCore(testPath, undefined, diffContent, { cwd: mockCwd }),
      ).rejects.toThrow(FileWriteError)

      await expect(
        writeFileCore(testPath, undefined, diffContent, { cwd: mockCwd }),
      ).rejects.toMatchObject({
        code: 'write_error',
        message: expect.stringContaining('Failed to read existing file'),
      })
    })
  })

  describe('Error handling', () => {
    it('should throw FileWriteError when path is missing', async () => {
      await expect(
        writeFileCore('', 'content', undefined, { cwd: mockCwd }),
      ).rejects.toThrow(FileWriteError)

      await expect(
        writeFileCore('', 'content', undefined, { cwd: mockCwd }),
      ).rejects.toMatchObject({
        code: 'missing_path',
        message: 'Path is required',
      })
    })

    it('should throw FileWriteError when both content and diff are missing', async () => {
      await expect(
        writeFileCore('test.txt', undefined, undefined, { cwd: mockCwd }),
      ).rejects.toThrow(FileWriteError)

      await expect(
        writeFileCore('test.txt', undefined, undefined, { cwd: mockCwd }),
      ).rejects.toMatchObject({
        code: 'missing_content',
        message: 'Either content or diff is required',
      })
    })

    it('should throw FileWriteError when directory creation fails', async () => {
      const testContent = 'content'
      const testPath = 'deep/nested/file.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)
      ;(createDirectoriesForFile as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      )

      await expect(
        writeFileCore(testPath, testContent, undefined, { cwd: mockCwd }),
      ).rejects.toThrow(FileWriteError)

      await expect(
        writeFileCore(testPath, testContent, undefined, { cwd: mockCwd }),
      ).rejects.toMatchObject({
        code: 'write_error',
        message: expect.stringContaining('Failed to create directories'),
      })
    })

    it('should throw FileWriteError when file write fails', async () => {
      const testContent = 'content'
      const testPath = 'test.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)
      ;(createDirectoriesForFile as jest.Mock).mockResolvedValue([])
      ;(writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'))

      await expect(
        writeFileCore(testPath, testContent, undefined, { cwd: mockCwd }),
      ).rejects.toThrow(FileWriteError)

      await expect(
        writeFileCore(testPath, testContent, undefined, { cwd: mockCwd }),
      ).rejects.toMatchObject({
        code: 'write_error',
        message: expect.stringContaining('Failed to write file'),
      })
    })
  })

  describe('Path resolution', () => {
    it('should resolve relative paths from cwd', async () => {
      const testContent = 'test'
      const relativePath = 'folder/file.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(relativePath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result.absolutePath).toBe(path.resolve(mockCwd, relativePath))
      expect(result.relPath).toBe(relativePath)
    })

    it('should use absolute paths as-is', async () => {
      const testContent = 'test'
      const absolutePath = '/absolute/path/file.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(absolutePath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result.absolutePath).toBe(absolutePath)
      expect(result.relPath).toBe(absolutePath)
    })

    it('should use process.cwd() when cwd option is not provided', async () => {
      const testContent = 'test'
      const relativePath = 'file.txt'
      const processCwd = process.cwd()

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(relativePath, testContent)

      expect(result.absolutePath).toBe(path.resolve(processCwd, relativePath))
    })
  })

  describe('Edge cases', () => {
    it('should reject empty string content as missing content', async () => {
      const testPath = 'empty.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      // Empty string is treated as missing content
      await expect(
        writeFileCore(testPath, '', undefined, { cwd: mockCwd }),
      ).rejects.toThrow(FileWriteError)

      await expect(
        writeFileCore(testPath, '', undefined, { cwd: mockCwd }),
      ).rejects.toMatchObject({
        code: 'missing_content',
        message: 'Either content or diff is required',
      })
    })

    it('should handle content with only whitespace', async () => {
      const testContent = '   \n\n\t\t  '
      const testPath = 'whitespace.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
      })

      // trimEnd() should remove all trailing whitespace
      expect(result.finalContent).toBe('')
    })

    it('should handle content with code block markers only at start', async () => {
      const testContent = '```javascript\nconst x = 1;'
      const expectedContent = 'const x = 1;'
      const testPath = 'test.js'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result.finalContent).toBe(expectedContent)
    })

    it('should handle content with code block markers only at end', async () => {
      const testContent = 'const x = 1;\n```'
      const expectedContent = 'const x = 1;'
      const testPath = 'test.js'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result.finalContent).toBe(expectedContent)
    })

    it('should handle multiline content with various line endings', async () => {
      const testContent = 'line 1\nline 2\nline 3\n'
      const expectedContent = 'line 1\nline 2\nline 3'
      const testPath = 'test.txt'

      ;(fileExistsAtPath as jest.Mock).mockResolvedValue(false)

      const result = await writeFileCore(testPath, testContent, undefined, {
        cwd: mockCwd,
      })

      expect(result.finalContent).toBe(expectedContent)
    })
  })
})

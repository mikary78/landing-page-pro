import { test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

test('DEV_POLICY.md exists and contains required keywords', async () => {
  const policyPath = path.resolve(__dirname, '..', 'DEV_POLICY.md')
  const exists = fs.existsSync(policyPath)
  expect(exists).toBeTruthy()
  if (!exists) return

  const content = fs.readFileSync(policyPath, 'utf-8')
  expect(content).toContain('한국어')
  expect(content).toContain('출처')
  expect(content).toContain('history/')
})

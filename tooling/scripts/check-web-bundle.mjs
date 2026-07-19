import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const outputRoot = join(process.cwd(), 'apps', 'web', '.next', 'static')
const budgets = {
  totalJavaScript: 1_250_000,
  largestJavaScript: 250_000,
  totalCss: 70_000,
}

const files = await walk(outputRoot)
const javascript = files.filter(({ path }) => path.endsWith('.js'))
const styles = files.filter(({ path }) => path.endsWith('.css'))
const totalJavaScript = sum(javascript)
const totalCss = sum(styles)
const largestJavaScript = javascript.toSorted(
  (left, right) => right.bytes - left.bytes,
)[0]

if (!largestJavaScript)
  throw new Error(
    'No Next.js JavaScript chunks were found. Run the build first.',
  )

const measurements = {
  totalJavaScript,
  largestJavaScript: largestJavaScript.bytes,
  totalCss,
}

console.table({
  'JavaScript total': {
    bytes: totalJavaScript,
    budget: budgets.totalJavaScript,
  },
  'Largest JavaScript chunk': {
    bytes: largestJavaScript.bytes,
    budget: budgets.largestJavaScript,
    file: relative(process.cwd(), largestJavaScript.path),
  },
  'CSS total': { bytes: totalCss, budget: budgets.totalCss },
})

const exceeded = Object.entries(measurements).filter(
  ([key, value]) => value > budgets[key],
)
if (exceeded.length > 0)
  throw new Error(
    `Frontend bundle budget exceeded: ${exceeded
      .map(([key, value]) => `${key}=${value} (budget ${budgets[key]})`)
      .join(', ')}`,
  )

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return walk(path)
      const details = await stat(path)
      return [{ path, bytes: details.size }]
    }),
  )
  return nested.flat()
}

function sum(files) {
  return files.reduce((total, file) => total + file.bytes, 0)
}

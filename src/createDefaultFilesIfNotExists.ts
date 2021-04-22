import fs from 'fs'
import path from 'path'
import { addPrettierIgnore } from './addPrettierIgnore'

export default (dir: string) => {
  const isEmptyDir = fs.readdirSync(dir).length === 0

  const indexFilePath = path.join(dir, 'index.ts')

  if (isEmptyDir && !fs.existsSync(indexFilePath)) {
    fs.writeFileSync(
      indexFilePath,
      addPrettierIgnore(`export type Methods = {
  get: {
    resBody: string
  }
}
`),
      'utf8'
    )
  }

  const controllerFilePath = path.join(dir, 'controller.ts')

  if (isEmptyDir && !fs.existsSync(controllerFilePath)) {
    fs.writeFileSync(
      controllerFilePath,
      addPrettierIgnore(`import { defineController } from './$relay'

export default defineController(() => ({
  get: () => ({ status: 200, body: 'Hello' })
}))
`),
      'utf8'
    )
  }

  const hooksFilePath = path.join(dir, 'hooks.ts')

  if (fs.existsSync(hooksFilePath) && !fs.readFileSync(hooksFilePath, 'utf8')) {
    fs.writeFileSync(
      hooksFilePath,
      addPrettierIgnore(`import { defineHooks } from './$relay'

export default defineHooks(() => ({
  onRequest: (req, res, next) => {
    console.log('Directory level onRequest hook:', req.path)
    next()
  }
}))
`),
      'utf8'
    )
  }
}

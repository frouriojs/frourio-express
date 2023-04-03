import path from 'path'
import createControllersText from './createControllersText'
import checkRequisites from './checkRequisites'

const genHandlerText = (isAsync: boolean) => `
const ${isAsync ? 'asyncM' : 'm'}ethodToHandler = (
  methodCallback: ServerHandler${isAsync ? 'Promise' : ''}<any, any>
): RequestHandler => ${isAsync ? 'async ' : ''}(req, res, next) => {
  try {
    const data = ${isAsync ? 'await ' : ''}methodCallback(req as any) as any

    if (data.headers) {
      for (const key in data.headers) {
        res.setHeader(key, data.headers[key])
      }
    }

    res.status(data.status).send(data.body)
  } catch (e) {
    next(e)
  }
}
`

const genHandlerWithSchemaText = (isAsync: boolean) => `
const ${isAsync ? 'asyncM' : 'm'}ethodToHandlerWithSchema = (
  methodCallback: ServerHandler${isAsync ? 'Promise' : ''}<any, any>,
  schema: { [K in HttpStatusOk]?: Schema }
): RequestHandler => {
  const stringifySet = Object.entries(schema).reduce(
    (prev, [key, val]) => ({ ...prev, [key]: fastJson(val!) }),
    {} as Record<HttpStatusOk, ReturnType<typeof fastJson> | undefined>
  )

  return ${isAsync ? 'async ' : ''}(req, res, next) => {
    try {
      const data = ${isAsync ? 'await ' : ''}methodCallback(req as any) as any
      const stringify = stringifySet[data.status as HttpStatusOk]

      if (stringify) {
        res.set('content-type', 'application/json; charset=utf-8')

        if (data.headers) {
          for (const key in data.headers) {
            res.setHeader(key, data.headers[key])
          }
        }

        res.status(data.status).send(stringify(data.body))
      } else {
        if (data.headers) {
          for (const key in data.headers) {
            res.setHeader(key, data.headers[key])
          }
        }

        res.status(data.status).send(data.body)
      }
    } catch (e) {
      next(e)
    }
  }
}
`

export default (input: string, project?: string) => {
  const { imports, consts, controllers } = createControllersText(`${input}/api`, project ?? input)
  const hasNumberTypeQuery = controllers.includes('parseNumberTypeQueryParams(')
  const hasBooleanTypeQuery = controllers.includes('parseBooleanTypeQueryParams(')
  const hasOptionalQuery = controllers.includes('  callParserIfExistsQuery(')
  const hasJSONBody = controllers.includes('  parseJSONBoby,')
  const hasTypedParams = controllers.includes('  createTypedParamsHandler(')
  const hasValidator = controllers.includes('  validateOrReject(')
  const hasMulter = controllers.includes('  uploader,')
  const hasMethodToHandler = controllers.includes(' methodToHandler(')
  const hasAsyncMethodToHandler = controllers.includes(' asyncMethodToHandler(')
  const hasMethodToHandlerWithSchema = controllers.includes(' methodToHandlerWithSchema(')
  const hasAsyncMethodToHandlerWithSchema = controllers.includes(' asyncMethodToHandlerWithSchema(')
  const hasValidatorCompiler = controllers.includes(' validatorCompiler')
  const headImports: string[] = []

  checkRequisites({ hasValidator })

  if (controllers.includes('response: responseSchema')) {
    console.warn(
      `frourio-express: 'responseSchema' is deprecated. Specify schemas.response in controller instead.`
    )
  }

  if (controllers.includes('ctrlHooks0.')) {
    console.warn(
      `frourio-express: 'defineHooks in controller.ts' is deprecated. Specify hooks in controller instead.`
    )
  }

  if (hasValidator) {
    console.warn(
      `frourio-express: 'class-validator' is deprecated. Specify validators in controller instead. ref: https://frourio.com/docs/reference/validation/zod`
    )

    headImports.push(
      "import 'reflect-metadata'",
      "import type { ClassTransformOptions } from 'class-transformer'",
      "import { plainToInstance as defaultPlainToInstance  } from 'class-transformer'",
      "import type { ValidatorOptions } from 'class-validator'",
      "import { validateOrReject as defaultValidateOrReject } from 'class-validator'"
    )
  }

  if (hasMulter) {
    headImports.push("import path from 'path'")
  }

  headImports.push(
    `import type { Express, RequestHandler${hasValidator ? ', Request' : ''} } from 'express'`
  )

  if (hasJSONBody) {
    headImports.push("import express from 'express'")
  }

  if (hasMulter) {
    headImports.push("import type { Options } from 'multer'")
    headImports.push("import multer from 'multer'")
  }

  if (hasMethodToHandlerWithSchema || hasAsyncMethodToHandlerWithSchema) {
    headImports.push("import fastJson from 'fast-json-stringify'")
  }

  if (hasValidator) {
    headImports.push("import * as Validators from './validators'")
  }

  if (hasMulter) {
    headImports.push("import type { ReadStream } from 'fs'")
  }

  headImports.push("import type { HttpStatusOk, AspidaMethodParams } from 'aspida'")

  return {
    text: `${headImports.join('\n')}
import type { Schema } from 'fast-json-stringify'
import type { z } from 'zod'
${imports}

export type FrourioOptions = {
  basePath?: string
${
  hasValidator
    ? '  transformer?: ClassTransformOptions\n' +
      '  validator?: ValidatorOptions\n' +
      '  plainToInstance?: ((cls: new (...args: any[]) => object, object: unknown, options: ClassTransformOptions) => object)\n' +
      '  validateOrReject?: ((instance: object, options: ValidatorOptions) => Promise<void>)\n'
    : ''
}${
      hasMulter
        ? `  multer?: Options
}

export type MulterFile = Express.Multer.File`
        : '}'
    }

type HttpStatusNoOk = 301 | 302 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 409 | 500 | 501 | 502 | 503 | 504 | 505

type PartiallyPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

type BaseResponse<T, U, V> = {
  status: V extends number ? V : HttpStatusOk
  body: T
  headers: U
}

type ServerResponse<K extends AspidaMethodParams> =
  | (K extends { resBody: K['resBody']; resHeaders: K['resHeaders'] }
  ? BaseResponse<K['resBody'], K['resHeaders'], K['status']>
  : K extends { resBody: K['resBody'] }
  ? PartiallyPartial<BaseResponse<K['resBody'], K['resHeaders'], K['status']>, 'headers'>
  : K extends { resHeaders: K['resHeaders'] }
  ? PartiallyPartial<BaseResponse<K['resBody'], K['resHeaders'], K['status']>, 'body'>
  : PartiallyPartial<
      BaseResponse<K['resBody'], K['resHeaders'], K['status']>,
      'body' | 'headers'
    >)
  | PartiallyPartial<BaseResponse<any, any, HttpStatusNoOk>, 'body' | 'headers'>
${
  hasMulter
    ? `
type BlobToFile<T extends AspidaMethodParams> = T['reqFormat'] extends FormData
  ? {
      [P in keyof T['reqBody']]: Required<T['reqBody']>[P] extends Blob | ReadStream
        ? MulterFile
        : Required<T['reqBody']>[P] extends (Blob | ReadStream)[]
        ? MulterFile[]
        : T['reqBody'][P]
    }
  : T['reqBody']
`
    : ''
}
type RequestParams<T extends AspidaMethodParams> = Pick<{
  query: T['query']
  body: ${hasMulter ? 'BlobToFile<T>' : "T['reqBody']"}
  headers: T['reqHeaders']
}, {
  query: Required<T>['query'] extends {} | null ? 'query' : never
  body: Required<T>['reqBody'] extends {} | null ? 'body' : never
  headers: Required<T>['reqHeaders'] extends {} | null ? 'headers' : never
}['query' | 'body' | 'headers']>

type ServerHandler<T extends AspidaMethodParams, U extends Record<string, unknown> = {}> = (
  req: RequestParams<T> & U
) => ServerResponse<T>

type ServerHandlerPromise<T extends AspidaMethodParams, U extends Record<string, unknown> = {}> = (
  req: RequestParams<T> & U
) => Promise<ServerResponse<T>>

type AddedRequestHandler<R extends Record<string, unknown>> = RequestHandler extends (req: infer U, ...args: infer V) => infer W ? (req: U & Partial<R>, ...args: V) => W : never

export type ServerHooks<R extends Record<string, unknown> = {}> = {
  onRequest?: AddedRequestHandler<R> | AddedRequestHandler<R>[]
  preParsing?: AddedRequestHandler<R> | AddedRequestHandler<R>[]
  preValidation?: AddedRequestHandler<R> | AddedRequestHandler<R>[]
  preHandler?: AddedRequestHandler<R> | AddedRequestHandler<R>[]
}

export type ServerMethodHandler<T extends AspidaMethodParams,  U extends Record<string, unknown> = {}> = ServerHandler<T, U> | ServerHandlerPromise<T, U> | {
  validators?: { [Key in keyof RequestParams<T>]?: z.ZodType<RequestParams<T>[Key]>}
  schemas?: { response?: { [V in HttpStatusOk]?: Schema }}
  hooks?: ServerHooks<U>
  handler: ServerHandler<T, U> | ServerHandlerPromise<T, U>
}
${
  hasNumberTypeQuery
    ? `
const parseNumberTypeQueryParams = (numberTypeParams: [string, boolean, boolean][]): RequestHandler => ({ query }, res, next) => {
  for (const [key, isOptional, isArray] of numberTypeParams) {
    const param = query[key]

    if (isArray) {
      if (!isOptional && param === undefined) {
        query[key] = []
      } else if (!isOptional || param !== undefined) {
        if (!Array.isArray(param)) return res.sendStatus(400)

        const vals = (param as string[]).map(Number)

        if (vals.some(isNaN)) return res.sendStatus(400)

        query[key] = vals as any
      }
    } else if (!isOptional || param !== undefined) {
      const val = Number(param)

      if (isNaN(val)) return res.sendStatus(400)

      query[key] = val as any
    }
  }

  next()
}
`
    : ''
}${
      hasBooleanTypeQuery
        ? `
const parseBooleanTypeQueryParams = (booleanTypeParams: [string, boolean, boolean][]): RequestHandler => ({ query }, res, next) => {
  for (const [key, isOptional, isArray] of booleanTypeParams) {
    const param = query[key]

    if (isArray) {
      if (!isOptional && param === undefined) {
        query[key] = []
      } else if (!isOptional || param !== undefined) {
        if (!Array.isArray(param)) return res.sendStatus(400)

        const vals = (param as string[]).map(p => p === 'true' ? true : p === 'false' ? false : null)

        if (vals.some(v => v === null)) return res.sendStatus(400)

        query[key] = vals as any
      }
    } else if (!isOptional || param !== undefined) {
      const val = param === 'true' ? true : param === 'false' ? false : null

      if (val === null) return res.sendStatus(400)

      query[key] = val as any
    }
  }

  next()
}
`
        : ''
    }${
      hasOptionalQuery
        ? `
const callParserIfExistsQuery = (parser: RequestHandler): RequestHandler => (req, res, next) =>
  Object.keys(req.query).length ? parser(req, res, next) : next()
`
        : ''
    }${
      hasJSONBody
        ? `
const parseJSONBoby: RequestHandler = (req, res, next) => {
  express.json()(req, res, err => {
    if (err) return res.sendStatus(400)

    next()
  })
}
`
        : ''
    }${
      hasTypedParams
        ? `
const createTypedParamsHandler = (numberTypeParams: string[]): RequestHandler => (req, res, next) => {
  const params: Record<string, string | number> = req.params

  for (const key of numberTypeParams) {
    const val = Number(params[key])

    if (isNaN(val)) return res.sendStatus(400)

    params[key] = val
  }

  next()
}
`
        : ''
    }${
      hasValidator
        ? `
const createValidateHandler = (validators: (req: Request) => (Promise<void> | null)[]): RequestHandler =>
  (req, res, next) => Promise.all(validators(req)).then(() => next()).catch(err => res.status(400).send(err))
`
        : ''
    }${
      hasMulter
        ? `
const formatMulterData = (arrayTypeKeys: [string, boolean][]): RequestHandler => ({ body, files }, _res, next) => {
  for (const [key] of arrayTypeKeys) {
    if (body[key] === undefined) body[key] = []
    else if (!Array.isArray(body[key])) {
      body[key] = [body[key]]
    }
  }

  for (const file of files as MulterFile[]) {
    if (Array.isArray(body[file.fieldname])) {
      body[file.fieldname].push(file)
    } else {
      body[file.fieldname] = file
    }
  }

  for (const [key, isOptional] of arrayTypeKeys) {
    if (!body[key].length && isOptional) delete body[key]
  }

  next()
}
`
        : ''
    }${
      hasValidatorCompiler
        ? `
const validatorCompiler = (key: 'params' | 'query' | 'headers' | 'body', validator: z.ZodType<unknown>): RequestHandler =>
  (req, res, next) => {
    const result = validator.safeParse(req[key])

    if (result.success) {
      req[key] = result.data
      next()
    } else {
      res.status(400).send(result.error)
    }
  }
`
        : ''
    }${hasMethodToHandler ? genHandlerText(false) : ''}${
      hasAsyncMethodToHandler ? genHandlerText(true) : ''
    }${hasMethodToHandlerWithSchema ? genHandlerWithSchemaText(false) : ''}${
      hasAsyncMethodToHandlerWithSchema ? genHandlerWithSchemaText(true) : ''
    }
export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? ''
${
  hasValidator
    ? '  const transformerOptions: ClassTransformOptions = { enableCircularCheck: true, ...options.transformer }\n' +
      '  const validatorOptions: ValidatorOptions = { validationError: { target: false }, ...options.validator }\n' +
      '  const { plainToInstance = defaultPlainToInstance as NonNullable<FrourioOptions["plainToInstance"]>, validateOrReject = defaultValidateOrReject as NonNullable<FrourioOptions["validateOrReject"]> } = options\n'
    : ''
}${consts}${
      hasMulter
        ? "  const uploader = multer({ dest: path.join(__dirname, '.upload'), limits: { fileSize: 1024 ** 3 }, ...options.multer }).any()\n"
        : ''
    }
${controllers}
  return app
}
`,
    filePath: path.posix.join(input, '$server.ts')
  }
}

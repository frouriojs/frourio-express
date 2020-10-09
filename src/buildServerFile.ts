import path from 'path'
import createControllersText from './createControllersText'

export default (input: string, project?: string) => {
  const { imports, consts, controllers } = createControllersText(`${input}/api`, project ?? input)
  const hasNumberTypeQuery = controllers.includes('  parseNumberTypeQueryParams(')
  const hasJSONBody = controllers.includes('  parseJSONBoby,')
  const hasTypedParams = controllers.includes('  createTypedParamsHandler(')
  const hasValidator = controllers.includes('  validateOrReject(')
  const hasMulter = controllers.includes('  uploader,')
  const hasMethodToHandler = controllers.includes(' methodToHandler(')
  const hasAsyncMethodToHandler = controllers.includes(' asyncMethodToHandler(')

  return {
    text: `/* eslint-disable */${hasMulter ? "\nimport path from 'path'" : ''}
import { LowerHttpMethod, AspidaMethods, HttpStatusOk, AspidaMethodParams } from 'aspida'
import ${hasJSONBody ? 'express, ' : ''}{ Express, RequestHandler${
      hasValidator ? ', Request' : ''
    } } from 'express'${hasMulter ? "\nimport multer, { Options } from 'multer'" : ''}${
      hasValidator ? "\nimport { validateOrReject } from 'class-validator'" : ''
    }
${hasValidator ? `import * as Validators from './validators'\n` : ''}${imports}
export type FrourioOptions = {
  basePath?: string
${
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

type ServerValues = {
  params?: Record<string, any>
  user?: any
}
${
  hasMulter
    ? `
type BlobToFile<T extends AspidaMethodParams> = T['reqFormat'] extends FormData
  ? {
      [P in keyof T['reqBody']]: Required<T['reqBody']>[P] extends Blob
        ? MulterFile
        : Required<T['reqBody']>[P] extends Blob[]
        ? MulterFile[]
        : T['reqBody'][P]
    }
  : T['reqBody']
`
    : ''
}
type RequestParams<T extends AspidaMethodParams> = {
  query: T['query']
  body: ${hasMulter ? 'BlobToFile<T>' : "T['reqBody']"}
  headers: T['reqHeaders']
}

export type ServerMethods<T extends AspidaMethods, U extends ServerValues> = {
  [K in keyof T]: (
    req: RequestParams<T[K]> & U
  ) => ServerResponse<T[K]> | Promise<ServerResponse<T[K]>>
}
${
  hasNumberTypeQuery
    ? `
const parseNumberTypeQueryParams = (numberTypeParamsFn: (query: Request['query']) => ([string, boolean, boolean][])): RequestHandler => ({ query }, res, next) => {
  const numberTypeParams = numberTypeParamsFn(query)

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
  (req, res, next) => Promise.all(validators(req)).then(() => next()).catch(() => res.sendStatus(400))
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
      hasMethodToHandler
        ? `
const methodToHandler = (
  methodCallback: ServerMethods<any, any>[LowerHttpMethod]
): RequestHandler => (req, res, next) => {
  try {
    const data = methodCallback(req as any) as any

    for (const key in data.headers) {
      res.setHeader(key, data.headers[key])
    }

    res.status(data.status).send(data.body)
  } catch (e) {
    next(e)
  }
}
`
        : ''
    }${
      hasAsyncMethodToHandler
        ? `
const asyncMethodToHandler = (
  methodCallback: ServerMethods<any, any>[LowerHttpMethod]
): RequestHandler => async (req, res, next) => {
  try {
    const data = await methodCallback(req as any) as any

    for (const key in data.headers) {
      res.setHeader(key, data.headers[key])
    }

    res.status(data.status).send(data.body)
  } catch (e) {
    next(e)
  }
}
`
        : ''
    }
export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? ''
${consts}${
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

/* eslint-disable */
// prettier-ignore
import type { Express, RequestHandler } from 'express'
// prettier-ignore
import type { Schema } from 'fast-json-stringify'
// prettier-ignore
import fastJson from 'fast-json-stringify'
// prettier-ignore
import type { LowerHttpMethod, AspidaMethods, HttpStatusOk, AspidaMethodParams } from 'aspida'
// prettier-ignore
import controllerFn0, { responseSchema as responseSchemaFn0 } from './api/controller'


// prettier-ignore
export type FrourioOptions = {
  basePath?: string
}

// prettier-ignore
type HttpStatusNoOk = 301 | 302 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 409 | 500 | 501 | 502 | 503 | 504 | 505

// prettier-ignore
type PartiallyPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// prettier-ignore
type BaseResponse<T, U, V> = {
  status: V extends number ? V : HttpStatusOk
  body: T
  headers: U
}

// prettier-ignore
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

// prettier-ignore
type RequestParams<T extends AspidaMethodParams> = Pick<{
  query: T['query']
  body: T['reqBody']
  headers: T['reqHeaders']
}, {
  query: Required<T>['query'] extends {} | null ? 'query' : never
  body: Required<T>['reqBody'] extends {} | null ? 'body' : never
  headers: Required<T>['reqHeaders'] extends {} | null ? 'headers' : never
}['query' | 'body' | 'headers']>

// prettier-ignore
export type ServerMethods<T extends AspidaMethods, U extends Record<string, any> = {}> = {
  [K in keyof T]: (
    req: RequestParams<T[K]> & U
  ) => ServerResponse<T[K]> | Promise<ServerResponse<T[K]>>
}

// prettier-ignore
const methodToHandlerWithSchema = (
  methodCallback: ServerMethods<any, any>[LowerHttpMethod],
  schema: { [K in HttpStatusOk]?: Schema }
): RequestHandler => {
  const stringifySet = Object.entries(schema).reduce(
    (prev, [key, val]) => ({ ...prev, [key]: fastJson(val!) }),
    {} as Record<HttpStatusOk, ReturnType<typeof fastJson> | undefined>
  )

  return (req, res, next) => {
    try {
      const data = methodCallback(req as any) as any
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

// prettier-ignore
export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? ''
  const responseSchema0 = responseSchemaFn0()
  const controller0 = controllerFn0(app)

  app.get(`${basePath}/`, methodToHandlerWithSchema(controller0.get, responseSchema0.get))

  return app
}

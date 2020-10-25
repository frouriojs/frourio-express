/* eslint-disable */
import { LowerHttpMethod, AspidaMethods, HttpStatusOk, AspidaMethodParams } from 'aspida'
import { Express, RequestHandler } from 'express'
import controllerFn0 from './api/controller'

export type FrourioOptions = {
  basePath?: string
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

type RequestParams<T extends AspidaMethodParams> = Pick<{
  query: T['query']
  body: T['reqBody']
  headers: T['reqHeaders']
}, {
  query: Required<T>['query'] extends {} | null ? 'query' : never
  body: Required<T>['reqBody'] extends {} | null ? 'body' : never
  headers: Required<T>['reqHeaders'] extends {} | null ? 'headers' : never
}['query' | 'body' | 'headers']>

export type ServerMethods<T extends AspidaMethods, U extends Record<string, any> = {}> = {
  [K in keyof T]: (
    req: RequestParams<T[K]> & U
  ) => ServerResponse<T[K]> | Promise<ServerResponse<T[K]>>
}

const methodToHandler = (
  methodCallback: ServerMethods<any, any>[LowerHttpMethod]
): RequestHandler => (req, res, next) => {
  try {
    const data = methodCallback(req as any) as any

    if (typeof data.body === 'object' && data.body !== null) {
      res.set('content-type', 'application/json; charset=utf-8')

      for (const key in data.headers) {
        res.setHeader(key, data.headers[key])
      }
  
      res.status(data.status).send(JSON.stringify(data.body))
    } else {
      for (const key in data.headers) {
        res.setHeader(key, data.headers[key])
      }
  
      res.status(data.status).send(data.body)
    }
  } catch (e) {
    next(e)
  }
}

export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? ''
  const controller0 = controllerFn0()

  app.get(`${basePath}/`, methodToHandler(controller0.get))

  return app
}

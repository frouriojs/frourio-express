import type { Express, RequestHandler } from 'express';
import express from 'express';
import type { ReadStream } from 'fs';
import type { Options } from 'multer';
import type { HttpStatusOk, AspidaMethodParams } from 'aspida';
import type { Schema } from 'fast-json-stringify';
import type { z } from 'zod';
import hooksFn_gx3glp from './api/hooks';
import hooksFn_3zqb7e from './api/users/hooks';
import validatorsFn_ia9y8g from './api/users/_userId@number/validators';
import controllerFn_14i7wcv from './api/controller';
import controllerFn_a01vkg from './api/empty/noEmpty/controller';
import controllerFn_1gxm9v2 from './api/texts/controller';
import controllerFn_1bjhajh from './api/texts/sample/controller';
import controllerFn_g6e9u2 from './api/users/controller';
import controllerFn_1y88f1f from './api/users/_userId@number/controller';

export type FrourioOptions = {
  basePath?: string;
  multer?: Options;
};

type HttpStatusNoOk = 301 | 302 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 409 | 500 | 501 | 502 | 503 | 504 | 505;

type PartiallyPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type BaseResponse<T, U, V> = {
  status: V extends number ? V : HttpStatusOk;
  body: T;
  headers: U;
};

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
  | PartiallyPartial<BaseResponse<any, any, HttpStatusNoOk>, 'body' | 'headers'>;

export type MultipartFileToBlob<T extends Record<string, unknown>> = {
  [P in keyof T]: Required<T>[P] extends Express.Multer.File
    ? Blob | ReadStream
    : Required<T>[P] extends Express.Multer.File[]
    ? (Blob | ReadStream)[]
    : T[P];
};

type BlobToFile<T extends AspidaMethodParams> = T['reqFormat'] extends FormData
  ? {
      [P in keyof T['reqBody']]: Required<T['reqBody']>[P] extends Blob | ReadStream
        ? Express.Multer.File
        : Required<T['reqBody']>[P] extends (Blob | ReadStream)[]
        ? Express.Multer.File[]
        : T['reqBody'][P];
    }
  : T['reqBody'];

type RequestParams<T extends AspidaMethodParams> = Pick<{
  query: T['query'];
  body: BlobToFile<T>;
  headers: T['reqHeaders'];
}, {
  query: Required<T>['query'] extends {} | null ? 'query' : never;
  body: Required<T>['reqBody'] extends {} | null ? 'body' : never;
  headers: Required<T>['reqHeaders'] extends {} | null ? 'headers' : never;
}['query' | 'body' | 'headers']>;

type ServerHandler<T extends AspidaMethodParams, U extends Record<string, unknown> = {}> = (
  req: RequestParams<T> & U
) => ServerResponse<T>;

type ServerHandlerPromise<T extends AspidaMethodParams, U extends Record<string, unknown> = {}> = (
  req: RequestParams<T> & U
) => Promise<ServerResponse<T>>;

type AddedRequestHandler<R extends Record<string, unknown>> = RequestHandler extends (req: infer U, ...args: infer V) => infer W ? (req: U & Partial<R>, ...args: V) => W : never;

export type ServerHooks<R extends Record<string, unknown> = {}> = {
  onRequest?: AddedRequestHandler<R> | AddedRequestHandler<R>[];
  preParsing?: AddedRequestHandler<R> | AddedRequestHandler<R>[];
  preValidation?: AddedRequestHandler<R> | AddedRequestHandler<R>[];
  preHandler?: AddedRequestHandler<R> | AddedRequestHandler<R>[];
};

export type ServerMethodHandler<T extends AspidaMethodParams,  U extends Record<string, unknown> = {}> = ServerHandler<T, U> | ServerHandlerPromise<T, U> | {
  validators?: { [Key in keyof RequestParams<T>]?: z.ZodType<RequestParams<T>[Key]>};
  schemas?: { response?: { [V in HttpStatusOk]?: Schema }};
  hooks?: ServerHooks<U>;
  handler: ServerHandler<T, U> | ServerHandlerPromise<T, U>;
};

const parseJSONBoby: RequestHandler = (req, res, next) => {
  express.json()(req, res, err => {
    if (err !== undefined) return res.sendStatus(400);

    next();
  });
};

const createTypedParamsHandler = (numberTypeParams: string[]): RequestHandler => (req, res, next) => {
  const params: Record<string, string | number> = req.params;

  for (const key of numberTypeParams) {
    const val = Number(params[key]);

    if (isNaN(val)) return res.sendStatus(400);

    params[key] = val;
  }

  next();
};

const validatorCompiler = (key: 'params' | 'query' | 'headers' | 'body', validator: z.ZodType<unknown>): RequestHandler =>
  (req, res, next) => {
    const result = validator.safeParse(req[key]);

    if (result.success) {
      req[key] = result.data;
      next();
    } else {
      res.status(400).send(result.error);
    }
  };

const methodToHandler = (
  methodCallback: ServerHandler<any, any>,
): RequestHandler => (req, res, next) => {
  try {
    const data = methodCallback(req as any) as any;

    if (data.headers !== undefined) {
      for (const key in data.headers) {
        res.setHeader(key, data.headers[key]);
      }
    }

    res.status(data.status).send(data.body);
  } catch (e) {
    next(e);
  }
};

const asyncMethodToHandler = (
  methodCallback: ServerHandlerPromise<any, any>,
): RequestHandler => async (req, res, next) => {
  try {
    const data = await methodCallback(req as any) as any;

    if (data.headers !== undefined) {
      for (const key in data.headers) {
        res.setHeader(key, data.headers[key]);
      }
    }

    res.status(data.status).send(data.body);
  } catch (e) {
    next(e);
  }
};

export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? '';
  const hooks_gx3glp = hooksFn_gx3glp(app);
  const hooks_3zqb7e = hooksFn_3zqb7e(app);
  const validators_ia9y8g = validatorsFn_ia9y8g(app);
  const controller_14i7wcv = controllerFn_14i7wcv(app);
  const controller_a01vkg = controllerFn_a01vkg(app);
  const controller_1gxm9v2 = controllerFn_1gxm9v2(app);
  const controller_1bjhajh = controllerFn_1bjhajh(app);
  const controller_g6e9u2 = controllerFn_g6e9u2(app);
  const controller_1y88f1f = controllerFn_1y88f1f(app);

  app.get(`${basePath}/`, [
    hooks_gx3glp.onRequest,
    // @ts-expect-error
    asyncMethodToHandler(controller_14i7wcv.get),
  ]);

  app.post(`${basePath}/`, [
    hooks_gx3glp.onRequest,
    parseJSONBoby,
    // @ts-expect-error
    methodToHandler(controller_14i7wcv.post),
  ]);

  app.get(`${basePath}/empty/noEmpty`, [
    hooks_gx3glp.onRequest,
    methodToHandler(controller_a01vkg.get),
  ]);

  app.get(`${basePath}/texts`, [
    hooks_gx3glp.onRequest,
    // @ts-expect-error
    methodToHandler(controller_1gxm9v2.get),
  ]);

  app.put(`${basePath}/texts`, [
    hooks_gx3glp.onRequest,
    // @ts-expect-error
    methodToHandler(controller_1gxm9v2.put),
  ]);

  app.put(`${basePath}/texts/sample`, [
    hooks_gx3glp.onRequest,
    parseJSONBoby,
    methodToHandler(controller_1bjhajh.put),
  ]);

  app.get(`${basePath}/users`, [
    hooks_gx3glp.onRequest,
    hooks_3zqb7e.onRequest,
    asyncMethodToHandler(controller_g6e9u2.get),
  ]);

  app.post(`${basePath}/users`, [
    hooks_gx3glp.onRequest,
    hooks_3zqb7e.onRequest,
    parseJSONBoby,
    methodToHandler(controller_g6e9u2.post),
  ]);

  app.get(`${basePath}/users/:userId`, [
    hooks_gx3glp.onRequest,
    hooks_3zqb7e.onRequest,
    createTypedParamsHandler(['userId']),
    validatorCompiler('params', validators_ia9y8g.params),
    methodToHandler(controller_1y88f1f.get),
  ]);

  return app;
};

import type { Express, RequestHandler } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import type { ReadStream } from 'fs';
import type { Options } from 'multer';
import type { HttpStatusOk, AspidaMethodParams } from 'aspida';
import type { Schema } from 'fast-json-stringify';
import type { z } from 'zod';
import hooksFn_gx3glp from './api/hooks';
import hooksFn_3zqb7e from './api/users/hooks';
import controllerFn_14i7wcv from './api/controller';
import controllerFn_a01vkg from './api/empty/noEmpty/controller';
import controllerFn_17nfdm3 from './api/multiForm/controller';
import controllerFn_1gxm9v2 from './api/texts/controller';
import controllerFn_1bjhajh from './api/texts/sample/controller';
import controllerFn_g6e9u2 from './api/users/controller';

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
    if (err !== undefined) {
      res.sendStatus(400);
      return;
    }

    next();
  });
};

const formatMulterData = (arrayTypeKeys: [string, boolean][], numberTypeKeys: [string, boolean, boolean][], booleanTypeKeys: [string, boolean, boolean][]): RequestHandler => ({ body, files }, res, next) => {
  for (const [key] of arrayTypeKeys) {
    if (body[key] === undefined) body[key] = [];
    else if (!Array.isArray(body[key])) {
      body[key] = [body[key]];
    }
  }

  for (const file of files as Express.Multer.File[]) {
    if (Array.isArray(body[file.fieldname])) {
      body[file.fieldname].push(file);
    } else {
      body[file.fieldname] = file;
    }
  }

  for (const [key, isOptional] of arrayTypeKeys) {
    if (body[key].length === 0 && isOptional) delete body[key];
  }

  for (const [key, isOptional, isArray] of numberTypeKeys) {
    const param = body[key];

    if (isArray) {
      if (!isOptional || param !== undefined) {
        const vals = param.map(Number);

        if (vals.some(isNaN)) {
          res.sendStatus(400);
          return;
        }

        body[key] = vals;
      }
    } else if (!isOptional || param !== undefined) {
      const val = Number(param);

      if (isNaN(val)) {
        res.sendStatus(400);
        return;
      }

      body[key] = val;
    }
  }

  for (const [key, isOptional, isArray] of booleanTypeKeys) {
    const param = body[key];

    if (isArray) {
      if (!isOptional || param !== undefined) {
        const vals = param.map((p: string) => p === 'true' ? true : p === 'false' ? false : null);

        if (vals.some((v: string | null) => v === null)) {
          res.sendStatus(400);
          return;
        }

        body[key] = vals;
      }
    } else if (!isOptional || param !== undefined) {
      const val = param === 'true' ? true : param === 'false' ? false : null;

      if (val === null) {
        res.sendStatus(400);
        return;
      }

      body[key] = val;
    }
  }

  next();
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
  const controller_14i7wcv = controllerFn_14i7wcv(app);
  const controller_a01vkg = controllerFn_a01vkg(app);
  const controller_17nfdm3 = controllerFn_17nfdm3(app);
  const controller_1gxm9v2 = controllerFn_1gxm9v2(app);
  const controller_1bjhajh = controllerFn_1bjhajh(app);
  const controller_g6e9u2 = controllerFn_g6e9u2(app);
  const uploader = multer({ dest: path.join(__dirname, '.upload'), limits: { fileSize: 1024 ** 3 }, ...options.multer }).any();

  app.get(`${basePath}/`, [
    hooks_gx3glp.onRequest,
    // @ts-expect-error
    asyncMethodToHandler(controller_14i7wcv.get),
  ]);

  app.post(`${basePath}/`, [
    hooks_gx3glp.onRequest,
    uploader,
    formatMulterData([], [], []),
    // @ts-expect-error
    methodToHandler(controller_14i7wcv.post),
  ]);

  app.get(`${basePath}/empty/noEmpty`, [
    hooks_gx3glp.onRequest,
    methodToHandler(controller_a01vkg.get),
  ]);

  app.post(`${basePath}/multiForm`, [
    hooks_gx3glp.onRequest,
    uploader,
    formatMulterData([['empty', false], ['vals', false], ['files', false]], [['empty', false, true]], []),
    methodToHandler(controller_17nfdm3.post),
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

  return app;
};

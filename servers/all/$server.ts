import type { Express, RequestHandler } from 'express';
import express from 'express';
import fastJson from 'fast-json-stringify';
import multer from 'multer';
import path from 'path';
import type { ReadStream } from 'fs';
import type { Options } from 'multer';
import type { HttpStatusOk, AspidaMethodParams } from 'aspida';
import type { Schema } from 'fast-json-stringify';
import type { z } from 'zod';
import hooksFn_gx3glp from './api/hooks';
import hooksFn_1mq914j from './api/empty/hooks';
import hooksFn_3zqb7e from './api/users/hooks';
import hooksFn_1xe76mo from './api/users/_userId@number/_name/hooks';
import validatorsFn_1etvysi from './api/texts/_label@string/validators';
import validatorsFn_ia9y8g from './api/users/_userId@number/validators';
import validatorsFn_bsbcs3 from './api/users/_userId@number/_name/validators';
import controllerFn_14i7wcv from './api/controller';
import controllerFn_50cggr from './api/500/controller';
import controllerFn_a01vkg from './api/empty/noEmpty/controller';
import controllerFn_17nfdm3 from './api/multiForm/controller';
import controllerFn_1gxm9v2 from './api/texts/controller';
import controllerFn_1bjhajh from './api/texts/sample/controller';
import controllerFn_iyz1e5 from './api/texts/_label@string/controller';
import controllerFn_g6e9u2 from './api/users/controller';
import controllerFn_1y88f1f from './api/users/_userId@number/controller';
import controllerFn_1pjj81w from './api/users/_userId@number/_name/controller';
import controllerFn_iyk7j5 from './api/zod/controller';

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

const parseNumberTypeQueryParams = (numberTypeParams: [string, boolean, boolean][]): RequestHandler => ({ query }, res, next) => {
  for (const [key, isOptional, isArray] of numberTypeParams) {
    const param = query[key];

    if (isArray) {
      if (!isOptional && param === undefined) {
        query[key] = [];
      } else if (!isOptional || param !== undefined) {
        if (!Array.isArray(param)) return res.sendStatus(400);

        const vals = (param as string[]).map(Number);

        if (vals.some(isNaN)) return res.sendStatus(400);

        query[key] = vals as any;
      }
    } else if (!isOptional || param !== undefined) {
      const val = Number(param);

      if (isNaN(val)) return res.sendStatus(400);

      query[key] = val as any;
    }
  }

  next();
};

const parseBooleanTypeQueryParams = (booleanTypeParams: [string, boolean, boolean][]): RequestHandler => ({ query }, res, next) => {
  for (const [key, isOptional, isArray] of booleanTypeParams) {
    const param = query[key];

    if (isArray) {
      if (!isOptional && param === undefined) {
        query[key] = [];
      } else if (!isOptional || param !== undefined) {
        if (!Array.isArray(param)) return res.sendStatus(400);

        const vals = (param as string[]).map(p => p === 'true' ? true : p === 'false' ? false : null);

        if (vals.some(v => v === null)) return res.sendStatus(400);

        query[key] = vals as any;
      }
    } else if (!isOptional || param !== undefined) {
      const val = param === 'true' ? true : param === 'false' ? false : null;

      if (val === null) return res.sendStatus(400);

      query[key] = val as any;
    }
  }

  next();
};

const callParserIfExistsQuery = (parser: RequestHandler): RequestHandler => (req, res, next) =>
  Object.keys(req.query).length > 0 ? parser(req, res, next) : next();

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

const formatMulterData = (arrayTypeKeys: [string, boolean][]): RequestHandler => ({ body, files }, _res, next) => {
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

const methodToHandlerWithSchema = (
  methodCallback: ServerHandler<any, any>,
  schema: { [K in HttpStatusOk]?: Schema }
): RequestHandler => {
  const stringifySet = Object.entries(schema).reduce(
    (prev, [key, val]) => ({ ...prev, [key]: fastJson(val!) }),
    {} as Record<HttpStatusOk, ReturnType<typeof fastJson> | undefined>
  );

  return (req, res, next) => {
    try {
      const data = methodCallback(req as any) as any;
      const stringify = stringifySet[data.status as HttpStatusOk];

      if (stringify !== undefined) {
        res.set('content-type', 'application/json; charset=utf-8');

        if (data.headers !== undefined) {
          for (const key in data.headers) {
            res.setHeader(key, data.headers[key]);
          }
        }

        res.status(data.status).send(stringify(data.body));
      } else {
        if (data.headers !== undefined) {
          for (const key in data.headers) {
            res.setHeader(key, data.headers[key]);
          }
        }

        res.status(data.status).send(data.body);
      }
    } catch (e) {
      next(e);
    }
  };
};

export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? '';
  const hooks_gx3glp = hooksFn_gx3glp(app);
  const hooks_1mq914j = hooksFn_1mq914j(app);
  const hooks_3zqb7e = hooksFn_3zqb7e(app);
  const hooks_1xe76mo = hooksFn_1xe76mo(app);
  const validators_1etvysi = validatorsFn_1etvysi(app);
  const validators_ia9y8g = validatorsFn_ia9y8g(app);
  const validators_bsbcs3 = validatorsFn_bsbcs3(app);
  const controller_14i7wcv = controllerFn_14i7wcv(app);
  const controller_50cggr = controllerFn_50cggr(app);
  const controller_a01vkg = controllerFn_a01vkg(app);
  const controller_17nfdm3 = controllerFn_17nfdm3(app);
  const controller_1gxm9v2 = controllerFn_1gxm9v2(app);
  const controller_1bjhajh = controllerFn_1bjhajh(app);
  const controller_iyz1e5 = controllerFn_iyz1e5(app);
  const controller_g6e9u2 = controllerFn_g6e9u2(app);
  const controller_1y88f1f = controllerFn_1y88f1f(app);
  const controller_1pjj81w = controllerFn_1pjj81w(app);
  const controller_iyk7j5 = controllerFn_iyk7j5(app);
  const uploader = multer({ dest: path.join(__dirname, '.upload'), limits: { fileSize: 1024 ** 3 }, ...options.multer }).any();

  app.get(`${basePath}/`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    callParserIfExistsQuery(parseNumberTypeQueryParams([['requiredNum', false, false], ['optionalNum', true, false], ['optionalNumArr', true, true], ['emptyNum', true, false], ['requiredNumArr', false, true]])),
    callParserIfExistsQuery(parseBooleanTypeQueryParams([['bool', false, false], ['optionalBool', true, false], ['boolArray', false, true], ['optionalBoolArray', true, true]])),
    ...Object.entries(controller_14i7wcv.get.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    asyncMethodToHandler(controller_14i7wcv.get.handler),
  ]);

  app.post(`${basePath}/`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    parseNumberTypeQueryParams([['requiredNum', false, false], ['optionalNum', true, false], ['optionalNumArr', true, true], ['emptyNum', true, false], ['requiredNumArr', false, true]]),
    parseBooleanTypeQueryParams([['bool', false, false], ['optionalBool', true, false], ['boolArray', false, true], ['optionalBoolArray', true, true]]),
    uploader,
    formatMulterData([]),
    methodToHandler(controller_14i7wcv.post),
  ]);

  app.put(`${basePath}/`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    parseNumberTypeQueryParams([['requiredNum', false, false], ['optionalNum', true, false], ['optionalNumArr', true, true], ['emptyNum', true, false], ['requiredNumArr', false, true]]),
    parseBooleanTypeQueryParams([['bool', false, false], ['optionalBool', true, false], ['boolArray', false, true], ['optionalBoolArray', true, true]]),
    parseJSONBoby,
    ...controller_14i7wcv.put.hooks.preValidation,
    ...Object.entries(controller_14i7wcv.put.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    controller_14i7wcv.put.hooks.preHandler,
    methodToHandlerWithSchema(controller_14i7wcv.put.handler, controller_14i7wcv.put.schemas.response),
  ]);

  app.get(`${basePath}/500`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    methodToHandler(controller_50cggr.get),
  ]);

  app.get(`${basePath}/empty/noEmpty`, [
    ...hooks_gx3glp.onRequest,
    ...hooks_1mq914j.onRequest,
    hooks_gx3glp.preParsing,
    hooks_1mq914j.preParsing,
    asyncMethodToHandler(controller_a01vkg.get),
  ]);

  app.post(`${basePath}/multiForm`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    uploader,
    formatMulterData([['requiredArr', false], ['optionalArr', true], ['empty', true], ['vals', false], ['files', false]]),
    ...Object.entries(controller_17nfdm3.post.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    methodToHandler(controller_17nfdm3.post.handler),
  ]);

  app.get(`${basePath}/texts`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    callParserIfExistsQuery(parseNumberTypeQueryParams([['limit', true, false]])),
    // @ts-expect-error
    methodToHandler(controller_1gxm9v2.get),
  ]);

  app.put(`${basePath}/texts`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    // @ts-expect-error
    methodToHandler(controller_1gxm9v2.put),
  ]);

  app.put(`${basePath}/texts/sample`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    parseJSONBoby,
    methodToHandler(controller_1bjhajh.put),
  ]);

  app.get(`${basePath}/texts/:label`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    validatorCompiler('params', validators_1etvysi.params),
    ...Object.entries(controller_iyz1e5.get.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    methodToHandler(controller_iyz1e5.get.handler),
  ]);

  app.get(`${basePath}/users`, [
    ...hooks_gx3glp.onRequest,
    hooks_3zqb7e.onRequest,
    hooks_gx3glp.preParsing,
    asyncMethodToHandler(controller_g6e9u2.get),
  ]);

  app.post(`${basePath}/users`, [
    ...hooks_gx3glp.onRequest,
    hooks_3zqb7e.onRequest,
    hooks_gx3glp.preParsing,
    parseJSONBoby,
    ...Object.entries(controller_g6e9u2.post.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    methodToHandler(controller_g6e9u2.post.handler),
  ]);

  app.get(`${basePath}/users/:userId`, [
    ...hooks_gx3glp.onRequest,
    hooks_3zqb7e.onRequest,
    hooks_gx3glp.preParsing,
    createTypedParamsHandler(['userId']),
    validatorCompiler('params', validators_ia9y8g.params),
    controller_1y88f1f.get.hooks.preHandler,
    methodToHandler(controller_1y88f1f.get.handler),
  ]);

  app.get(`${basePath}/users/:userId/:name`, [
    ...hooks_gx3glp.onRequest,
    hooks_3zqb7e.onRequest,
    hooks_1xe76mo.onRequest,
    hooks_gx3glp.preParsing,
    createTypedParamsHandler(['userId']),
    validatorCompiler('params', validators_ia9y8g.params.and(validators_bsbcs3.params)),
    methodToHandler(controller_1pjj81w.get),
  ]);

  app.get(`${basePath}/zod`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    parseNumberTypeQueryParams([['requiredNum', false, false], ['requiredNumArr', false, true], ['optionalNum', true, false], ['optionalNumArr', true, true], ['emptyNum', true, false]]),
    parseBooleanTypeQueryParams([['bool', false, false], ['boolArray', false, true], ['optionalBool', true, false], ['optionalBoolArray', true, true]]),
    ...Object.entries(controller_iyk7j5.get.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    methodToHandler(controller_iyk7j5.get.handler),
  ]);

  app.post(`${basePath}/zod`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    callParserIfExistsQuery(parseNumberTypeQueryParams([['requiredNum', false, false], ['requiredNumArr', false, true], ['optionalNum', true, false], ['optionalNumArr', true, true], ['emptyNum', true, false]])),
    callParserIfExistsQuery(parseBooleanTypeQueryParams([['bool', false, false], ['boolArray', false, true], ['optionalBool', true, false], ['optionalBoolArray', true, true]])),
    ...Object.entries(controller_iyk7j5.post.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    methodToHandler(controller_iyk7j5.post.handler),
  ]);

  app.put(`${basePath}/zod`, [
    ...hooks_gx3glp.onRequest,
    hooks_gx3glp.preParsing,
    uploader,
    formatMulterData([['requiredArr', false], ['vals', false], ['files', false], ['optionalArr', true], ['empty', true]]),
    ...Object.entries(controller_iyk7j5.put.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator)),
    methodToHandler(controller_iyk7j5.put.handler),
  ]);

  return app;
};

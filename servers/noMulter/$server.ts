import 'reflect-metadata';
import type { ClassTransformOptions } from 'class-transformer';
import { plainToInstance as defaultPlainToInstance  } from 'class-transformer';
import type { ValidatorOptions } from 'class-validator';
import { validateOrReject as defaultValidateOrReject } from 'class-validator';
import type { Express, RequestHandler, Request } from 'express';
import express from 'express';
import * as Validators from './validators';
import type { HttpStatusOk, AspidaMethodParams } from 'aspida';
import type { Schema } from 'fast-json-stringify';
import type { z } from 'zod';
import hooksFn0 from './api/hooks';
import hooksFn1 from './api/users/hooks';
import validatorsFn0 from './api/users/_userId@number/validators';
import controllerFn0, { hooks as ctrlHooksFn0 } from './api/controller';
import controllerFn1 from './api/empty/noEmpty/controller';
import controllerFn2 from './api/texts/controller';
import controllerFn3 from './api/texts/sample/controller';
import controllerFn4, { hooks as ctrlHooksFn1 } from './api/users/controller';
import controllerFn5 from './api/users/_userId@number/controller';


export type FrourioOptions = {
  basePath?: string;
  transformer?: ClassTransformOptions;
  validator?: ValidatorOptions;
  plainToInstance?: ((cls: new (...args: any[]) => object, object: unknown, options: ClassTransformOptions) => object);
  validateOrReject?: ((instance: object, options: ValidatorOptions) => Promise<void>);
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

type RequestParams<T extends AspidaMethodParams> = Pick<{
  query: T['query'];
  body: T['reqBody'];
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
    if (err) return res.sendStatus(400);

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

const createValidateHandler = (validators: (req: Request) => (Promise<void> | null)[]): RequestHandler =>
  (req, res, next) => Promise.all(validators(req)).then(() => next()).catch(err => res.status(400).send(err));

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

    if (data.headers) {
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

    if (data.headers) {
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
  const transformerOptions: ClassTransformOptions = { enableCircularCheck: true, ...options.transformer };
  const validatorOptions: ValidatorOptions = { validationError: { target: false }, ...options.validator };
  const { plainToInstance = defaultPlainToInstance as NonNullable<FrourioOptions["plainToInstance"]>, validateOrReject = defaultValidateOrReject as NonNullable<FrourioOptions["validateOrReject"]> } = options;
  const hooks0 = hooksFn0(app);
  const hooks1 = hooksFn1(app);
  const ctrlHooks0 = ctrlHooksFn0(app);
  const ctrlHooks1 = ctrlHooksFn1(app);
  const validators0 = validatorsFn0(app);
  const controller0 = controllerFn0(app);
  const controller1 = controllerFn1(app);
  const controller2 = controllerFn2(app);
  const controller3 = controllerFn3(app);
  const controller4 = controllerFn4(app);
  const controller5 = controllerFn5(app);

  app.get(`${basePath}/`, [
    hooks0.onRequest,
    ctrlHooks0.onRequest,
    createValidateHandler(req => [
      Object.keys(req.query).length ? validateOrReject(plainToInstance(Validators.Query, req.query, transformerOptions), validatorOptions) : null,
    ]),
    // @ts-expect-error
    asyncMethodToHandler(controller0.get),
  ]);

  app.post(`${basePath}/`, [
    hooks0.onRequest,
    ctrlHooks0.onRequest,
    parseJSONBoby,
    createValidateHandler(req => [
      validateOrReject(plainToInstance(Validators.Query, req.query, transformerOptions), validatorOptions),
      validateOrReject(plainToInstance(Validators.Body, req.body, transformerOptions), validatorOptions),
    ]),
    // @ts-expect-error
    methodToHandler(controller0.post),
  ]);

  app.get(`${basePath}/empty/noEmpty`, [
    hooks0.onRequest,
    methodToHandler(controller1.get),
  ]);

  app.get(`${basePath}/texts`, [
    hooks0.onRequest,
    // @ts-expect-error
    methodToHandler(controller2.get),
  ]);

  app.put(`${basePath}/texts`, [
    hooks0.onRequest,
    // @ts-expect-error
    methodToHandler(controller2.put),
  ]);

  app.put(`${basePath}/texts/sample`, [
    hooks0.onRequest,
    parseJSONBoby,
    methodToHandler(controller3.put),
  ]);

  app.get(`${basePath}/users`, [
    hooks0.onRequest,
    hooks1.onRequest,
    ...ctrlHooks1.preHandler,
    asyncMethodToHandler(controller4.get),
  ]);

  app.post(`${basePath}/users`, [
    hooks0.onRequest,
    hooks1.onRequest,
    parseJSONBoby,
    createValidateHandler(req => [
      validateOrReject(plainToInstance(Validators.UserInfo, req.body, transformerOptions), validatorOptions),
    ]),
    ...ctrlHooks1.preHandler,
    methodToHandler(controller4.post),
  ]);

  app.get(`${basePath}/users/:userId`, [
    hooks0.onRequest,
    hooks1.onRequest,
    createTypedParamsHandler(['userId']),
    validatorCompiler('params', validators0.params),
    methodToHandler(controller5.get),
  ]);

  return app;
};

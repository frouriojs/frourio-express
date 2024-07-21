import path from 'path';
import createControllersText from './createControllersText';

const genHandlerText = (isAsync: boolean) => `
const ${isAsync ? 'asyncM' : 'm'}ethodToHandler = (
  methodCallback: ServerHandler${isAsync ? 'Promise' : ''}<any, any>,
): RequestHandler => ${isAsync ? 'async ' : ''}(req, res, next) => {
  try {
    const data = ${isAsync ? 'await ' : ''}methodCallback(req as any) as any;

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
`;

const genHandlerWithSchemaText = (isAsync: boolean) => `
const ${isAsync ? 'asyncM' : 'm'}ethodToHandlerWithSchema = (
  methodCallback: ServerHandler${isAsync ? 'Promise' : ''}<any, any>,
  schema: { [K in HttpStatusOk]?: Schema }
): RequestHandler => {
  const stringifySet = Object.entries(schema).reduce(
    (prev, [key, val]) => ({ ...prev, [key]: fastJson(val!) }),
    {} as Record<HttpStatusOk, ReturnType<typeof fastJson> | undefined>
  );

  return ${isAsync ? 'async ' : ''}(req, res, next) => {
    try {
      const data = ${isAsync ? 'await ' : ''}methodCallback(req as any) as any;
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
`;

export default (input: string, project?: string) => {
  const { imports, consts, controllers } = createControllersText(`${input}/api`, project ?? input);
  const hasNumberTypeQuery = controllers.includes('parseNumberTypeQueryParams(');
  const hasBooleanTypeQuery = controllers.includes('parseBooleanTypeQueryParams(');
  const hasOptionalQuery = controllers.includes('  callParserIfExistsQuery(');
  const hasJSONBody = controllers.includes('  parseJSONBoby,');
  const hasTypedParams = controllers.includes('  createTypedParamsHandler(');
  const hasMultipart = controllers.includes('  uploader,');
  const hasMethodToHandler = controllers.includes(' methodToHandler(');
  const hasAsyncMethodToHandler = controllers.includes(' asyncMethodToHandler(');
  const hasMethodToHandlerWithSchema = controllers.includes(' methodToHandlerWithSchema(');
  const hasAsyncMethodToHandlerWithSchema = controllers.includes(
    ' asyncMethodToHandlerWithSchema(',
  );
  const hasValidatorCompiler = controllers.includes(' validatorCompiler');
  const headImports: string[] = [];

  headImports.push(`import type { Express, RequestHandler } from 'express';`);

  if (hasJSONBody) {
    headImports.push("import express from 'express';");
  }

  if (hasMethodToHandlerWithSchema || hasAsyncMethodToHandlerWithSchema) {
    headImports.push("import fastJson from 'fast-json-stringify';");
  }

  if (hasMultipart) {
    headImports.push("import multer from 'multer';");
    headImports.push("import path from 'path';");
  }

  headImports.push(
    "import type { ReadStream } from 'fs';",
    "import type { Options } from 'multer';",
    "import type { HttpStatusOk, AspidaMethodParams } from 'aspida';",
  );

  return {
    text: `${headImports.join('\n')}
import type { Schema } from 'fast-json-stringify';
import type { z } from 'zod';
${imports}
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
${
  hasNumberTypeQuery
    ? `
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
`
    : ''
}${
      hasBooleanTypeQuery
        ? `
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
`
        : ''
    }${
      hasOptionalQuery
        ? `
const callParserIfExistsQuery = (parser: RequestHandler): RequestHandler => (req, res, next) =>
  Object.keys(req.query).length > 0 ? parser(req, res, next) : next();
`
        : ''
    }${
      hasJSONBody
        ? `
const parseJSONBoby: RequestHandler = (req, res, next) => {
  express.json()(req, res, err => {
    if (err !== undefined) return res.sendStatus(400);

    next();
  });
};
`
        : ''
    }${
      hasTypedParams
        ? `
const createTypedParamsHandler = (numberTypeParams: string[]): RequestHandler => (req, res, next) => {
  const params: Record<string, string | number> = req.params;

  for (const key of numberTypeParams) {
    const val = Number(params[key]);

    if (isNaN(val)) return res.sendStatus(400);

    params[key] = val;
  }

  next();
};
`
        : ''
    }${
      hasMultipart
        ? `
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

        if (vals.some(isNaN)) return res.sendStatus(400);

        body[key] = vals
      }
    } else if (!isOptional || param !== undefined) {
      const val = Number(param);

      if (isNaN(val)) return res.sendStatus(400);

      body[key] = val
    }
  }

  for (const [key, isOptional, isArray] of booleanTypeKeys) {
    const param = body[key];

    if (isArray) {
      if (!isOptional || param !== undefined) {
        const vals = param.map((p: string) => p === 'true' ? true : p === 'false' ? false : null);

        if (vals.some((v: string | null) => v === null)) return res.sendStatus(400);

        body[key] = vals
      }
    } else if (!isOptional || param !== undefined) {
      const val = param === 'true' ? true : param === 'false' ? false : null;

      if (val === null) return res.sendStatus(400);

      body[key] = val
    }
  }

  next();
};
`
        : ''
    }${
      hasValidatorCompiler
        ? `
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
`
        : ''
    }${hasMethodToHandler ? genHandlerText(false) : ''}${
      hasAsyncMethodToHandler ? genHandlerText(true) : ''
    }${hasMethodToHandlerWithSchema ? genHandlerWithSchemaText(false) : ''}${
      hasAsyncMethodToHandlerWithSchema ? genHandlerWithSchemaText(true) : ''
    }
export default (app: Express, options: FrourioOptions = {}) => {
  const basePath = options.basePath ?? '';
${consts}${
      hasMultipart
        ? "  const uploader = multer({ dest: path.join(__dirname, '.upload'), limits: { fileSize: 1024 ** 3 }, ...options.multer }).any();\n"
        : ''
    }
${controllers}
  return app;
};
`,
    filePath: path.posix.join(input, '$server.ts'),
  };
};

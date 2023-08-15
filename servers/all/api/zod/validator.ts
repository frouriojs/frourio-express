import type { ReadStream } from 'fs';
import { Readable } from 'stream';
import { z } from 'zod';
import { MulterFile } from '../../$server';

export const queryValidator = z.object({
  requiredNum: z.number(),
  optionalNum: z.number().optional(),
  optionalNumArr: z.array(z.number()).optional(),
  emptyNum: z.number().int().optional(),
  requiredNumArr: z.array(z.number().int()),
  id: z.string(),
  disable: z.string(),
  bool: z.boolean(),
  optionalBool: z.boolean().optional(),
  boolArray: z.array(z.boolean()),
  optionalBoolArray: z.array(z.boolean()).optional(),
});

export type QueryValidator = z.infer<typeof queryValidator>;

export const multipartValidator = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number(),
  destination: z.string(),
  filename: z.string(),
  path: z.string(),
  stream: z.instanceof(Readable).optional(),
  buffer: z.instanceof(Buffer).optional(),
}) as z.ZodType<MulterFile>;

export const bodyValidator = z.object({
  requiredArr: z.array(z.string()),
  optionalArr: z.array(z.string()).optional(),
  empty: z.array(z.number().int()).optional(),
  name: z.string(),
  icon: multipartValidator,
  vals: z.array(z.number()),
  files: z.array(multipartValidator),
});

type MultipartToBlob<T extends Record<string, unknown>> = {
  [P in keyof T]: Required<T>[P] extends MulterFile
    ? Blob | ReadStream
    : Required<T>[P] extends MulterFile[]
    ? (Blob | ReadStream)[]
    : T[P];
};

export type BodyValidator = MultipartToBlob<z.infer<typeof bodyValidator>>;

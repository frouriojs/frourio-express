import { depend } from 'velona';
import { z } from 'zod';
import type { Injectable } from 'velona';
import type { Express } from 'express';
import type { ServerHooks, ServerMethodHandler } from '../../../$server';
import type { Methods } from './';

export function defineHooks<T extends ServerHooks>(hooks: (app: Express) => T): (app: Express) => T
export function defineHooks<T extends Record<string, unknown>, U extends ServerHooks>(deps: T, cb: (d: T, app: Express) => U): Injectable<T, [Express], U>
export function defineHooks<T extends Record<string, unknown>>(hooks: (app: Express) => ServerHooks | T, cb?: ((deps: T, app: Express) => ServerHooks)) {
  return cb && typeof hooks !== 'function' ? depend(hooks, cb) : hooks;
}

type ServerMethods = {
  [Key in keyof Methods]: ServerMethodHandler<Methods[Key]>;
};

export function defineController<M extends ServerMethods>(methods: (app: Express) => M): (app: Express) => M
export function defineController<M extends ServerMethods, T extends Record<string, unknown>>(deps: T, cb: (d: T, app: Express) => M): Injectable<T, [Express], M>
export function defineController<M extends ServerMethods, T extends Record<string, unknown>>(methods: ((app: Express) => M) | T, cb?: ((deps: T, app: Express) => M)) {
  return cb && typeof methods !== 'function' ? depend(methods, cb) : methods;
}

export const multipartFileValidator = () =>
  z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    size: z.number(),
    destination: z.string(),
    filename: z.string(),
    path: z.string(),
    stream: z.any(),
    buffer: z.any(),
  }) as z.ZodType<Express.Multer.File>;

import type { z } from 'zod'
import type { Injectable } from 'velona'
import { depend } from 'velona'
import type { Express, RequestHandler } from 'express'
import type { Schema } from 'fast-json-stringify'
import type { HttpStatusOk } from 'aspida'
import type { ServerMethodHandler } from '../../../$server'
import type { AdditionalRequest } from './../hooks'
import type { Methods } from './'

type AddedRequestHandler = RequestHandler extends (req: infer U, ...args: infer V) => infer W ? (req: U & Partial<AdditionalRequest>, ...args: V) => W : never
type Hooks = {
  onRequest?: AddedRequestHandler | AddedRequestHandler[]
  preParsing?: AddedRequestHandler | AddedRequestHandler[]
  preValidation?: AddedRequestHandler | AddedRequestHandler[]
  preHandler?: AddedRequestHandler | AddedRequestHandler[]
}
type Params = {
  userId: number
}

export function defineValidators(validator: (app: Express) => {
  params: z.ZodType<{ userId: number }>
}) {
  return validator
}

export function defineResponseSchema<T extends { [U in keyof Methods]?: { [V in HttpStatusOk]?: Schema }}>(methods: () => T) {
  return methods
}

export function defineHooks<T extends Hooks>(hooks: (app: Express) => T): (app: Express) => T
export function defineHooks<T extends Record<string, any>, U extends Hooks>(deps: T, cb: (d: T, app: Express) => U): Injectable<T, [Express], U>
export function defineHooks<T extends Record<string, any>>(hooks: (app: Express) => Hooks | T, cb?: ((deps: T, app: Express) => Hooks)) {
  return cb && typeof hooks !== 'function' ? depend(hooks, cb) : hooks
}

type ServerMethods = {
  [Key in keyof Methods]: ServerMethodHandler<Methods[Key], AdditionalRequest & { params: Params }>
}

export function defineController<M extends ServerMethods>(methods: (app: Express) => M): (app: Express) => M
export function defineController<M extends ServerMethods, T extends Record<string, any>>(deps: T, cb: (d: T, app: Express) => M): Injectable<T, [Express], M>
export function defineController<M extends ServerMethods, T extends Record<string, any>>(methods: ((app: Express) => M) | T, cb?: ((deps: T, app: Express) => M)) {
  return cb && typeof methods !== 'function' ? depend(methods, cb) : methods
}

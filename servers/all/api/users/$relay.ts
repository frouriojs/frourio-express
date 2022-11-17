import type { Injectable } from 'velona'
import { depend } from 'velona'
import type { Express, RequestHandler } from 'express'
import type { Schema } from 'fast-json-stringify'
import type { HttpStatusOk } from 'aspida'
import type { ServerMethodHandler } from '../../$server'
import type { AdditionalRequest as AdditionalRequest0 } from './hooks'
import type { AdditionalRequest as AdditionalRequest1 } from './controller'
import type { Methods } from './'

type AdditionalRequest = AdditionalRequest0 & AdditionalRequest1
type AddedRequestHandler = RequestHandler extends (req: infer U, ...args: infer V) => infer W ? (req: U & Partial<AdditionalRequest>, ...args: V) => W : never
type Hooks = {
  onRequest?: AddedRequestHandler | AddedRequestHandler[] | undefined
  preParsing?: AddedRequestHandler | AddedRequestHandler[] | undefined
  preValidation?: AddedRequestHandler | AddedRequestHandler[] | undefined
  preHandler?: AddedRequestHandler | AddedRequestHandler[] | undefined
}

export function defineResponseSchema<T extends { [U in keyof Methods]?: { [V in HttpStatusOk]?: Schema | undefined } | undefined }>(methods: () => T) {
  return methods
}

export function defineHooks<T extends Hooks>(hooks: (app: Express) => T): (app: Express) => T
export function defineHooks<T extends Record<string, any>, U extends Hooks>(deps: T, cb: (d: T, app: Express) => U): Injectable<T, [Express], U>
export function defineHooks<T extends Record<string, any>>(hooks: (app: Express) => Hooks | T, cb?: ((deps: T, app: Express) => Hooks) | undefined) {
  return cb && typeof hooks !== 'function' ? depend(hooks, cb) : hooks
}

type ServerMethods = {
  [Key in keyof Methods]: ServerMethodHandler<Methods[Key], AdditionalRequest>
}

export function defineController<M extends ServerMethods>(methods: (app: Express) => M): (app: Express) => M
export function defineController<M extends ServerMethods, T extends Record<string, any>>(deps: T, cb: (d: T, app: Express) => M): Injectable<T, [Express], M>
export function defineController<M extends ServerMethods, T extends Record<string, any>>(methods: ((app: Express) => M) | T, cb?: ((deps: T, app: Express) => M) | undefined) {
  return cb && typeof methods !== 'function' ? depend(methods, cb) : methods
}

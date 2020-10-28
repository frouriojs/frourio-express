/* eslint-disable */
import { Express, RequestHandler } from 'express'
import { Schema } from 'fast-json-stringify'
import { HttpStatusOk } from 'aspida'
import { Deps, depend } from 'velona'
import { ServerMethods } from '../../$server'
import { AdditionalRequest } from './hooks'
import { Methods } from './'

type AddedRequestHandler = RequestHandler extends (req: infer U, ...args: infer V) => infer W ? (req: U & Partial<AdditionalRequest>, ...args: V) => W : never
type Hooks = {
  onRequest?: AddedRequestHandler | AddedRequestHandler[]
  preParsing?: AddedRequestHandler | AddedRequestHandler[]
  preValidation?: AddedRequestHandler | AddedRequestHandler[]
  preHandler?: AddedRequestHandler | AddedRequestHandler[]
}
type ControllerMethods = ServerMethods<Methods, AdditionalRequest>

export function defineResponseSchema<T extends { [U in keyof ControllerMethods]?: { [V in HttpStatusOk]?: Schema }}>(methods: () => T) {
  return methods
}

export function defineHooks<T extends Hooks>(hooks: (app: Express) => T): (app: Express) => T
export function defineHooks<T extends Record<string, any>, U extends Hooks>(deps: T, cb: (d: Deps<T>, app: Express) => U): { (app: Express): U; inject(d: Deps<T>): (app: Express) => U }
export function defineHooks<T extends Record<string, any>>(hooks: (app: Express) => Hooks | T, cb?: (deps: Deps<T>, app: Express) => Hooks) {
  return cb && typeof hooks !== 'function' ? depend(hooks, cb) : hooks
}

export function defineController(methods: () => ControllerMethods): () => ControllerMethods
export function defineController<T extends Record<string, any>>(deps: T, cb: (d: Deps<T>) => ControllerMethods): { (): ControllerMethods; inject(d: Deps<T>): () => ControllerMethods }
export function defineController<T extends Record<string, any>>(methods: () => ControllerMethods | T, cb?: (deps: Deps<T>) => ControllerMethods) {
  return cb && typeof methods !== 'function' ? depend(methods, cb) : methods
}

/* eslint-disable */
import { Injectable, depend } from 'velona'
import type { Express, RequestHandler } from 'express'
import type { Schema } from 'fast-json-stringify'
import type { HttpStatusOk } from 'aspida'
import type { ServerMethods } from '../../../$server'
import type { AdditionalRequest } from './../hooks'
import type { Methods } from './'

type AddedRequestHandler = RequestHandler extends (req: infer U, ...args: infer V) => infer W ? (req: U & Partial<AdditionalRequest>, ...args: V) => W : never
type Hooks = {
  onRequest?: AddedRequestHandler | AddedRequestHandler[]
  preParsing?: AddedRequestHandler | AddedRequestHandler[]
  preValidation?: AddedRequestHandler | AddedRequestHandler[]
  preHandler?: AddedRequestHandler | AddedRequestHandler[]
}
type ControllerMethods = ServerMethods<Methods, AdditionalRequest & {
  params: {
    userId: number
  }
}>

export function defineResponseSchema<T extends { [U in keyof ControllerMethods]?: { [V in HttpStatusOk]?: Schema }}>(methods: () => T) {
  return methods
}

export function defineHooks<T extends Hooks>(hooks: (app: Express) => T): (app: Express) => T
export function defineHooks<T extends Record<string, any>, U extends Hooks>(deps: T, cb: (d: T, app: Express) => U): Injectable<T, [Express], U>
export function defineHooks<T extends Record<string, any>>(hooks: (app: Express) => Hooks | T, cb?: (deps: T, app: Express) => Hooks) {
  return cb && typeof hooks !== 'function' ? depend(hooks, cb) : hooks
}

export function defineController(methods: (app: Express) => ControllerMethods): (app: Express) => ControllerMethods
export function defineController<T extends Record<string, any>>(deps: T, cb: (d: T, app: Express) => ControllerMethods): Injectable<T, [Express], ControllerMethods>
export function defineController<T extends Record<string, any>>(methods: (app: Express) => ControllerMethods | T, cb?: (deps: T, app: Express) => ControllerMethods) {
  return cb && typeof methods !== 'function' ? depend(methods, cb) : methods
}

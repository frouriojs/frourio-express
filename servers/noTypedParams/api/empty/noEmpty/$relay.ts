/* eslint-disable */
// prettier-ignore
import { Injectable, depend } from 'velona'
// prettier-ignore
import type { Express, RequestHandler } from 'express'
// prettier-ignore
import type { Schema } from 'fast-json-stringify'
// prettier-ignore
import type { HttpStatusOk } from 'aspida'
// prettier-ignore
import type { ServerMethods } from '../../../$server'
// prettier-ignore
import type { Methods } from './'

// prettier-ignore
type Hooks = {
  onRequest?: RequestHandler | RequestHandler[]
  preParsing?: RequestHandler | RequestHandler[]
  preValidation?: RequestHandler | RequestHandler[]
  preHandler?: RequestHandler | RequestHandler[]
}
// prettier-ignore
type ControllerMethods = ServerMethods<Methods>

// prettier-ignore
export function defineResponseSchema<T extends { [U in keyof ControllerMethods]?: { [V in HttpStatusOk]?: Schema }}>(methods: () => T) {
  return methods
}

// prettier-ignore
export function defineHooks<T extends Hooks>(hooks: (app: Express) => T): (app: Express) => T
// prettier-ignore
export function defineHooks<T extends Record<string, any>, U extends Hooks>(deps: T, cb: (d: T, app: Express) => U): Injectable<T, [Express], U>
// prettier-ignore
export function defineHooks<T extends Record<string, any>>(hooks: (app: Express) => Hooks | T, cb?: (deps: T, app: Express) => Hooks) {
  return cb && typeof hooks !== 'function' ? depend(hooks, cb) : hooks
}

// prettier-ignore
export function defineController(methods: (app: Express) => ControllerMethods): (app: Express) => ControllerMethods
// prettier-ignore
export function defineController<T extends Record<string, any>>(deps: T, cb: (d: T, app: Express) => ControllerMethods): Injectable<T, [Express], ControllerMethods>
// prettier-ignore
export function defineController<T extends Record<string, any>>(methods: (app: Express) => ControllerMethods | T, cb?: (deps: T, app: Express) => ControllerMethods) {
  return cb && typeof methods !== 'function' ? depend(methods, cb) : methods
}

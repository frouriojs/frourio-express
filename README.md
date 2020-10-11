# frourio-express
<br />
<br />
<div align="center">
  <img src="https://frouriojs.github.io/frourio/assets/images/ogp.png" width="1280" alt="frourio-express" />
</div>

<div align="center">
  <a href="https://www.npmjs.com/package/frourio-express">
    <img src="https://img.shields.io/npm/v/frourio-express" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/frourio-express">
    <img src="https://img.shields.io/npm/dm/frourio-express" alt="npm download" />
  </a>
  <a href="https://github.com/frouriojs/frourio-express/actions?query=workflow%3A%22Node.js+CI%22">
    <img src="https://github.com/frouriojs/frourio-express/workflows/Node.js%20CI/badge.svg?branch=master" alt="Node.js CI" />
  </a>
  <a href="https://codecov.io/gh/frouriojs/frourio-express">
    <img src="https://img.shields.io/codecov/c/github/frouriojs/frourio-express.svg" alt="Codecov" />
  </a>
  <a href="https://lgtm.com/projects/g/frouriojs/frourio-express/context:javascript">
    <img src="https://img.shields.io/lgtm/grade/javascript/g/frouriojs/frourio-express.svg" alt="Language grade: JavaScript" />
  </a>
</div>

<p align="center">Frourio-express is a perfectly type-checkable REST framework for TypeScript.</p>
<br />
<br />
<br />

## Why frourio-express ?

Even if you write both the frontend and backend in TypeScript, you can't statically type-check the API's sparsity.

We are always forced to write "Two TypeScript".  
We waste a lot of time on dynamic testing using the browser and server.

<div align="center">
   <img src="https://frouriojs.github.io/frourio/assets/images/problem.png" width="1200" alt="Why frourio ?" />
</div>
<br />
<br />

Frourio-express is a framework for developing web apps quickly and safely in **"One TypeScript"**.

<div align="center">
   <img src="https://frouriojs.github.io/frourio/assets/images/architecture.png" width="1200" alt="Architecture of create-frourio-app" />
</div>
<br />
<br />

## Benchmarks

__Machine:__ Linux fv-az18 5.4.0-1026-azure #26~18.04.1-Ubuntu SMP Thu Sep 10 16:19:25 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux | 2 vCPUs | 7GB.  
__Method:__ `autocannon -c 100 -d 40 -p 10 localhost:3000` (two rounds; one to warm-up, one to measure).

| Framework           | Version          | Requests/sec  | Latency   |
| :------------------ | :--------------- | ------------: | --------: |
| fastify             | 3.5.1	           | 38,018	       | 2.54      |
| frourio             | 0.17.0           | 36,815        | 2.62      |
| nest-fastify        | 7.4.4            | 31,960        | 3.04      |
| micro               | 9.3.4	           | 29,672        | 3.28      |
| express             | 4.17.1	         | 8,239         | 11.98     |
| nest                | 7.4.4            | 7,311         | 13.54     |
| **frourio-express** | **0.17.0**       | **7,235**     | **13.67** |

Benchmarks taken using https://github.com/frouriojs/benchmarks. This is a
synthetic, "hello world" benchmark that aims to evaluate the framework
overhead.

## Table of Contents

- [Install](#Install)
- [Fastify.js mode](#Fastifyjs)
- [Environment](#Environment)
- [Entrypoint](#Entrypoint)
- [Controller](#Controller)
  - [Case 1 - Define GET: /tasks?limit={number}](#Controller-case1)
  - [Case 2 - Define POST: /tasks](#Controller-case2)
  - [Case 3 - Define GET: /tasks/{taskId}](#Controller-case3)
- [Hooks](#Hooks)
  - [Lifecycle](#Lifecycle)
  - [Directory level hooks](#Hooks-dir)
  - [Controller level hooks](#Hooks-ctrl)
  - [Login with Passport.js](#Hooks-login)
- [Validation](#Validation)
  - [Path parameter](#Validation-path)
  - [URL query](#Validation-query)
  - [JSON body](#Validation-json)
  - [Custom validation](#Validation-custom)
- [Error handling](#Error)
  - [Controller error handler](#Error-controller)
  - [The default error handler](#Error-default)
- [FormData](#FormData)
  - [Options](#FormData-options)
- [O/R mapping tool](#ORM)
  - [Prisma](#ORM-prisma)
  - [TypeORM](#ORM-typeorm)
- [CORS / Helmet](#CORS-Helmet)
- [Dependency Injection](#DI)

## Install

Make sure you have [npx](https://www.npmjs.com/package/npx) installed (`npx` is shipped by default since [npm](https://www.npmjs.com/get-npm) `5.2.0`)

```sh
$ npx create-frourio-app <my-project>
```

Or starting with npm v6.1 you can do:

```sh
$ npm init frourio-app <my-project>
```

Or with [yarn](https://yarnpkg.com/en/):

```sh
$ yarn create frourio-app <my-project>
```

<a id="Fastifyjs"></a>

## Fastify.js mode

Frourio-express uses express.js as its HTTP server.  
If you choose fastify.js in create-frourio-app, please refer to the following repositories.  
[GitHub: frourio](https://github.com/frouriojs/frourio)

Note: frourio is 5x faster than frourio-express

## Environment

Frourio-express requires TypeScript 3.9 or higher.  
If the TypeScript version of VSCode is low, an error is displayed during development.

## Entrypoint

`server/index.ts`

```ts
import express from 'express'
import server from './$server' // '$server.ts' is automatically generated by frourio-express

const app = express()

server(app, { basePath: '/api/v1' })
app.listen(3000)
```

## Controller

```sh
$ npm run dev
```

<a id="Controller-case1"></a>

### Case 1 - Define GET: /tasks?limit={number}

`server/types/index.ts`

```ts
export type Task = {
  id: number
  label: string
  done: boolean
}
```

`server/api/tasks/index.ts`

```ts
import { Task } from '$/types' // path alias $ -> server

export type Methods = {
  get: {
    query: {
      limit: number
    }

    resBody: Task[]
  }
}
```

`server/api/tasks/controller.ts`

```ts
import { defineController } from './$relay' // '$relay.ts' is automatically generated by frourio-express
import { getTasks } from '$/service/tasks'

export default defineController(() => ({
  get: async ({ query }) => ({
    status: 200,
    body: (await getTasks()).slice(0, query.limit)
  })
}))
```

<a id="Controller-case2"></a>

### Case 2 - Define POST: /tasks

`server/api/tasks/index.ts`

```ts
import { Task } from '$/types' // path alias $ -> server

export type Methods = {
  post: {
    reqBody: Pick<Task, 'label'>
    status: 201
    resBody: Task
  }
}
```

`server/api/tasks/controller.ts`

```ts
import { defineController } from './$relay' // '$relay.ts' is automatically generated by frourio-express
import { createTask } from '$/service/tasks'

export default defineController(() => ({
  post: async ({ body }) => {
    const task = await createTask(body.label)

    return { status: 201, body: task }
  }
}))
```

<a id="Controller-case3"></a>

### Case 3 - Define GET: /tasks/{taskId}

`server/api/tasks/_taskId@number/index.ts`

```ts
import { Task } from '$/types' // path alias $ -> server

export type Methods = {
  get: {
    resBody: Task
  }
}
```

`server/api/tasks/_taskId@number/controller.ts`

```ts
import { defineController } from './$relay' // '$relay.ts' is automatically generated by frourio-express
import { findTask } from '$/service/tasks'

export default defineController(() => ({
  get: async ({ params }) => {
    const task = await findTask(params.taskId)

    return task ? { status: 200, body: task } : { status: 404 }
  }
}))
```

## Hooks

Frourio-express can use all of Express.js' middleware as hooks.  
There are four types of hooks, onRequest / preParsing / preValidation / preHandler.

### Lifecycle

```
Incoming Request
  │
  └─▶ Routing
        │
  404 ◀─┴─▶ onRequest Hook
              │
    4**/5** ◀─┴─▶ preParsing Hook
                    │
          4**/5** ◀─┴─▶ Parsing
                          │
                4**/5** ◀─┴─▶ preValidation Hook
                                │
                      4**/5** ◀─┴─▶ Validation
                                      │
                                400 ◀─┴─▶ preHandler Hook
                                            │
                                  4**/5** ◀─┴─▶ User Handler
                                                  │
                                        4**/5** ◀─┴─▶ Outgoing Response
```

<a id="Hooks-dir"></a>

### Directory level hooks

Directory level hooks are called at the current and subordinate endpoints.

`server/api/tasks/hooks.ts`

```ts
import { defineHooks } from './$relay' // '$relay.ts' is automatically generated by frourio-express

export default defineHooks(() => ({
  onRequest: [
    (req, res, next) => {
      console.log('Directory level onRequest first hook:', req.path)
      next()
    },
    (req, res, next) => {
      console.log('Directory level onRequest second hook:', req.path)
      next()
    }
  ],
  preParsing: (req, res, next) => {
    console.log('Directory level preParsing single hook:', req.path)
    next()
  }
}))
```

<a id="Hooks-ctrl"></a>

### Controller level hooks

Controller level hooks are called at the current endpoint after directory level hooks.

`server/api/tasks/controller.ts`

```ts
import { defineHooks, defineController } from './$relay' // '$relay.ts' is automatically generated by frourio-express
import { getTasks, createTask } from '$/service/tasks'

export const hooks = defineHooks(() => ({
  onRequest: (req, res, next) => {
    console.log('Controller level onRequest single hook:', req.path)
    next()
  },
  preParsing: [
    (req, res, next) => {
      console.log('Controller level preParsing first hook:', req.path)
      next()
    },
    (req, res, next) => {
      console.log('Controller level preParsing second hook:', req.path)
      next()
    }
  ]
}))

export default defineController(() => ({
  get: async ({ query }) => ({
    status: 200,
    body: (await getTasks()).slice(0, query.limit)
  }),
  post: async ({ body }) => {
    const task = await createTask(body.label)

    return { status: 201, body: task }
  }
}))
```

<a id="Hooks-login"></a>

### Login with Passport.js

```sh
$ cd server
$ npm install passport passport-trusted-header
$ npm install @types/passport --save-dev
```

```sh
$ cd server
$ yarn add passport passport-trusted-header
$ yarn add @types/passport --dev
```

`server/api/user/hooks.ts`

```ts
import passport from 'passport'
import { defineHooks } from './$relay' // '$relay.ts' is automatically generated by frourio-express
import { getUserIdByToken } from '$/service/user'

// Export the User in hooks.ts to receive the user in controller.ts
export type User = {
  id: string
}

passport.use(
  // eslint-disable-next-line
  new (require('passport-trusted-header').Strategy)(
    { headers: ['token'] },
    // eslint-disable-next-line
    (headers: { token: string }, done: Function) => {
      done(null, getUserIdByToken(headers.token))
    }
  )
)

export default defineHooks(() => ({
  onRequest: [
    passport.initialize(),
    passport.authenticate('trusted-header', { session: false })
  ]
}))
```

`server/api/user/controller.ts`

```ts
import { defineController } from './$relay'
import { getUserNameById } from '$/service/user'

export default defineController(() => ({
  get: async ({ user }) => ({ status: 200, body: await getUserNameById(user.id) })
}))
```

## Validation

<a id="Validation-path"></a>

### Path parameter

Path parameter can be specified as string or number type after `@`.  
(Default is `string | number`)

`server/api/tasks/_taskId@number/index.ts`

```ts
import { Task } from '$/types'

export type Methods = {
  get: {
    resBody: Task
  }
}
```

`server/api/tasks/_taskId@number/controller.ts`

```ts
import { defineController } from './$relay'
import { findTask } from '$/service/tasks'

export default defineController(() => ({
  get: async ({ params }) => {
    const task = await findTask(params.taskId)

    return task ? { status: 200, body: task } : { status: 404 }
  }
}))
```

```sh
$ curl http://localhost:8080/api/tasks
[{"id":0,"label":"sample task","done":false}]

$ curl http://localhost:8080/api/tasks/0
{"id":0,"label":"sample task","done":false}

$ curl http://localhost:8080/api/tasks/1 -i
HTTP/1.1 404 Not Found

$ curl http://localhost:8080/api/tasks/abc -i
HTTP/1.1 400 Bad Request
```

<a id="Validation-query"></a>

### URL query

Properties of number or number[] are automatically validated.

`server/api/tasks/index.ts`

```ts
import { Task } from '$/types'

export type Methods = {
  get: {
    query?: {
      limit: number
    }
    resBody: Task[]
  }
}
```

`server/api/tasks/controller.ts`

```ts
import { defineController } from './$relay'
import { getTasks } from '$/service/tasks'

export default defineController(() => ({
  get: async ({ query }) => ({
    status: 200,
    body: (await getTasks()).slice(0, query?.limit)
  })
}))
```

```sh
$ curl http://localhost:8080/api/tasks
[{"id":0,"label":"sample task 0","done":false},{"id":1,"label":"sample task 1","done":false},{"id":1,"label":"sample task 2","done":false}]

$ curl http://localhost:8080/api/tasks?limit=1
[{"id":0,"label":"sample task 0","done":false}]

$ curl http://localhost:8080/api/tasks?limit=abc -i
HTTP/1.1 400 Bad Request
```

<a id="Validation-json"></a>

### JSON body

If no reqFormat is specified, reqBody is parsed as `application/json`.

`server/api/tasks/index.ts`

```ts
import { Task } from '$/types'

export type Methods = {
  post: {
    reqBody: Pick<Task, 'label'>
    resBody: Task
  }
}
```

`server/api/tasks/controller.ts`

```ts
import { defineController } from './$relay'
import { createTask } from '$/service/tasks'

export default defineController(() => ({
  post: async ({ body }) => {
    const task = await createTask(body.label)

    return { status: 201, body: task }
  }
}))
```

```sh
$ curl -X POST -H "Content-Type: application/json" -d '{"label":"sample task3"}' http://localhost:8080/api/tasks
{"id":3,"label":"sample task 3","done":false}

$ curl -X POST -H "Content-Type: application/json" -d '{Invalid JSON}' http://localhost:8080/api/tasks -i
HTTP/1.1 400 Bad Request
```

<a id="Validation-custom"></a>

### Custom validation

Query, reqHeaders and reqBody are validated by specifying Class with [class-validator](https://github.com/typestack/class-validator).  
The class needs to be exported from `server/validators/index.ts`.

`server/validators/index.ts`

```ts
import { MinLength, IsString } from 'class-validator'

export class LoginBody {
  @MinLength(5)
  id: string

  @MinLength(8)
  pass: string
}

export class TokenHeader {
  @IsString()
  @MinLength(10)
  token: string
}
```

`server/api/token/index.ts`

```ts
import { LoginBody, TokenHeader } from '$/validators'

export type Methods = {
  post: {
    reqBody: LoginBody
    resBody: {
      token: string
    }
  }

  delete: {
    reqHeaders: TokenHeader
  }
}
```

```sh
$ curl -X POST -H "Content-Type: application/json" -d '{"id":"correctId","pass":"correctPass"}' http://localhost:8080/api/token
{"token":"XXXXXXXXXX"}

$ curl -X POST -H "Content-Type: application/json" -d '{"id":"abc","pass":"12345"}' http://localhost:8080/api/token -i
HTTP/1.1 400 Bad Request

$ curl -X POST -H "Content-Type: application/json" -d '{"id":"incorrectId","pass":"incorrectPass"}' http://localhost:8080/api/token -i
HTTP/1.1 401 Unauthorized
```

<a id="Error"></a>

## Error handling

<a id="Error-controller"></a>

### Controller error handler

`server/api/tasks/controller.ts`

```ts
import { defineController } from './$relay'
import { createTask } from '$/service/tasks'

export default defineController(() => ({
  post: async ({ body }) => {
    try {
      const task = await createTask(body.label)

      return { status: 201, body: task }
    } catch (e) {
      return { status: 500, body: 'Something broke!' }
    }
  }
}))
```

<a id="Error-default"></a>

### The default error handler

http://expressjs.com/en/guide/error-handling.html#the-default-error-handler

`server/index.ts`

```ts
import express from 'express'
import server from './$server'

const app = express()

server(app, { basePath: '/api/v1' })

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})
app.listen(3000)
```

## FormData

Frourio parses FormData automatically in [expressjs/Multer](https://github.com/expressjs/multer).

`server/api/user/index.ts`

```ts
export type Methods = {
  post: {
    reqFormat: FormData
    reqBody: { icon: Blob }
    status: 204
  }
}
```

Properties of Blob or Blob[] type are converted to multer object.  
https://github.com/expressjs/multer#file-information

`server/api/user/controller.ts`

```ts
import { defineController } from './$relay'
import { changeIcon } from '$/service/user'

export default defineController(() => ({
  post: async ({ params, body }) => {
    // body.icon is multer object
    await changeIcon(params.userId, body.icon)

    return { status: 204 }
  }
}))
```

<a id="FormData-options"></a>

### Options

https://github.com/expressjs/multer#multeropts

`server/index.ts`

```ts
import express from 'express'
import server from './$server' // '$server.ts' is automatically generated by frourio-express

const app = express()

server(app, { basePath: '/api/v1', multer: { /* dest, fileFilter, ... */} })
app.listen(3000)
```

<a id="ORM"></a>

## O/R mapping tool

<a id="ORM-prisma"></a>

### Prisma

1. Selecting the DB when installing create-frourio-app
1. Start the DB
1. Call the development command
    ```sh
    $ npm run dev
    ```
1. Create schema file
    `server/prisma/schema.prisma`

    ```ts
    datasource db {
      provider = "mysql"
      url      = env("DATABASE_URL")
    }

    generator client {
      provider = "prisma-client-js"
    }

    model Task {
      id    Int     @id @default(autoincrement())
      label String
      done  Boolean @default(false)
    }
    ```
1. Call the migration command
    ```sh
    $ npm run migrate
    ```
1. Migration is done to the DB

<a id="ORM-typeorm"></a>

### TypeORM

1. Selecting the DB when installing create-frourio-app
1. Start the DB
1. Call the development command
    ```sh
    $ npm run dev
    ```
1. Create an Entity file
    `server/entity/Task.ts`

    ```ts
    import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

    @Entity()
    export class Task {
      @PrimaryGeneratedColumn()
      id: number

      @Column({ length: 100 })
      label: string

      @Column({ default: false })
      done: boolean
    }
    ```
1. Call the migration command
    ```sh
    $ npm run migration:generate
    ```
1. Migration is done to the DB

<a id="CORS-Helmet"></a>

## CORS / Helmet

```sh
$ cd server
$ npm install cors helmet
$ npm install --dev @types/cors
```

`server/index.ts`

```ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import server from './$server'

const app = express()
app.use(helmet())
app.use(cors())

server(app, { basePath: '/api/v1' })
app.listen(3000)
```

<a id="DI"></a>

## Dependency Injection

Frourio-express use [frouriojs/velona](https://github.com/frouriojs/velona) for dependency injection.

`server/api/tasks/index.ts`

```ts
import { Task } from '$/types'

export type Methods = {
  get: {
    query?: {
      limit?: number
      message?: string
    }

    resBody: Task[]
  }
}
```

`server/service/tasks.ts`

```ts
import { PrismaClient } from '@prisma/client'
import { depend } from 'velona' // dependency of frourio
import { Task } from '$/types'

const prisma = new PrismaClient()

export const getTasks = depend(
  { prisma: prisma as { task: { findMany(): Promise<Task[]> } } }, // inject prisma
  async ({ prisma }, limit?: number) => // prisma is injected object
    (await prisma.task.findMany()).slice(0, limit)
)
```

`server/api/tasks/controller.ts`

```ts
import { defineController } from './$relay'
import { getTasks } from '$/service/tasks'

const print = (text: string) => console.log(text)

export default defineController(
  { getTasks, print }, // inject functions
  ({ getTasks, print }) => ({ // getTasks and print are injected function
    get: async ({ query }) => {
      if (query?.message) print(query.message)

      return { status: 200, body: await getTasks(query?.limit) }
    }
  })
)
```

`server/test/server.test.ts`

```ts
import controller from '$/api/tasks/controller'
import { getTasks } from '$/service/tasks'

test('dependency injection into controller', async () => {
  let printedMessage = ''

  const injectedController = controller.inject({
    getTasks: getTasks.inject({
      prisma: {
        task: {
          findMany: () =>
            Promise.resolve([
              { id: 0, label: 'task1', done: false },
              { id: 1, label: 'task2', done: false },
              { id: 2, label: 'task3', done: true },
              { id: 3, label: 'task4', done: true },
              { id: 4, label: 'task5', done: false }
            ])
        }
      }
    }),
    print: (text: string) => {
      printedMessage = text
    }
  })()

  const limit = 3
  const message = 'test message'
  const res = await injectedController.get({
    query: { limit, message }
  })

  expect(res.body).toHaveLength(limit)
  expect(printedMessage).toBe(message)
})
```

```sh
$ npm test

PASS server/test/server.test.ts
  ✓ dependency injection into controller (4 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.67 s, estimated 8 s
Ran all test suites.
```

## Support

<a href="https://twitter.com/solufa2020">
  <img src="https://aspida.github.io/aspida/assets/images/twitter.svg" width="50" alt="Twitter" />
</a>

## License

Frourio-express is licensed under a [MIT License](https://github.com/frouriojs/frourio-express/blob/master/LICENSE).

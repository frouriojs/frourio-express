import { defineController, defineHooks, defineResponseSchema } from '~/$relay'
import { depend } from 'velona'

const hooks = defineHooks({ print: (...args: string[]) => console.log(...args) }, ({ print }) => ({
  onRequest: depend({}, (deps, req, res, next) => {
    print('Controller level onRequest hook:', req.path)
    next()
  })
}))

const responseSchema = defineResponseSchema(() => ({
  get: {
    200: {
      type: 'object',
      properties: {
        id: {
          type: 'string'
        },
        emptyNum: {
          type: 'number'
        },
        requiredNum: {
          type: 'number'
        },
        requiredNumArr: {
          type: 'array',
          items: {
            type: 'number'
          }
        },
        bool: {
          type: 'boolean'
        },
        optionalBool: {
          type: 'boolean'
        },
        boolArray: {
          type: 'array',
          items: {
            type: 'boolean'
          }
        },
        optionalBoolArray: {
          type: 'array',
          items: {
            type: 'boolean'
          }
        },
        disable: {
          type: 'string'
        }
      }
    }
  }
}))

export default defineController(
  {
    log: (n: string) => {
      console.log(n)
      return Promise.resolve(n)
    }
  },
  ({ log }) => ({
    get: async v => {
      return { status: 200, body: v.query && { ...v.query, id: await log(v.query.id) } }
    },
    post: v => ({
      // @ts-expect-error
      status: 200,
      body: { id: +v.query.id, port: v.body.port, fileName: v.body.file.originalname }
    })
  })
)

export { hooks, responseSchema }

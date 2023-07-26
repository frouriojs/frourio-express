import { defineController, defineHooks } from './$relay'

type AdditionalRequest = {
  tmp: string
}

const hooks = defineHooks(() => ({
  preHandler: [
    (req, _, next) => {
      console.log('Controller level preHandler hook:', req.path)
      next()
    }
  ]
}))

export { AdditionalRequest, hooks }

export default defineController(() => ({
  get: async () => ({
    status: 200,
    body: [
      {
        id: 1,
        name: 'aa',
        location: {
          country: 'JP',
          stateProvince: 'Tokyo'
        }
      }
    ]
  }),
  post: () => ({ status: 204 })
}))

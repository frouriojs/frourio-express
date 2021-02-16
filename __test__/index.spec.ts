/* eslint-disable jest/no-done-callback */
import { Server } from 'http'
import fs from 'fs'
import rimraf from 'rimraf'
import express from 'express'
import FormData from 'form-data'
import axios from 'axios'
import aspida from '@aspida/axios'
import api from '../servers/all/api/$api'
import frourio from '../servers/all/$server'
import controller from '../servers/all/api/controller'

const port = 11111
const baseURL = `http://localhost:${port}`
const client = api(aspida(undefined, { baseURL }))
let server: Server

beforeEach(cb => {
  server = frourio(express()).listen(port, cb)
})

afterEach(cb => {
  rimraf.sync('servers/all/.upload')
  server.close(cb)
})

test('GET: 200', () =>
  Promise.all(
    [
      {
        requiredNum: 1,
        requiredNumArr: [1, 2],
        id: '1',
        disable: 'false',
        bool: true,
        boolArray: [false, true]
      },
      {
        requiredNum: 2,
        emptyNum: 0,
        requiredNumArr: [],
        id: '1',
        disable: 'false',
        bool: false,
        optionalBool: true,
        boolArray: [],
        optionalBoolArray: [true, false, false]
      }
    ].map(query => expect(client.$get({ query })).resolves.toEqual(query))
  ))

test('GET: string', async () => {
  const text = 'test'
  const res = await client.texts.get({ query: { val: text } })
  expect(res.body).toBe(text)
  expect(res.headers['content-type']).toBe('text/html; charset=utf-8')
})

test('GET: params.userId', async () => {
  const userId = 1
  const res = await client.users._userId(userId).get()
  expect(res.body.id).toBe(userId)
  expect(res.headers['content-type']).toBe('application/json; charset=utf-8')
})

test('GET: 400', () =>
  Promise.all(
    [
      {
        requiredNum: 0,
        requiredNumArr: [],
        id: '1',
        disable: 'no boolean',
        bool: false,
        boolArray: []
      },
      {
        requiredNum: 0,
        requiredNumArr: [],
        id: '2',
        disable: 'true',
        bool: false,
        boolArray: ['no boolean']
      },
      {
        requiredNum: 0,
        requiredNumArr: ['no number'],
        id: '3',
        disable: 'true',
        bool: false,
        boolArray: []
      },
      {
        requiredNum: 1,
        requiredNumArr: [1, 2],
        id: 'no number',
        disable: 'true',
        bool: false,
        boolArray: []
      }
      // @ts-expect-error
    ].map(query => expect(client.get({ query })).rejects.toHaveProperty('response.status', 400))
  ))

test('GET: 500', async () => {
  await expect(client.$500.get()).rejects.toHaveProperty('response.status', 500)
})

test('PUT: JSON', async () => {
  const id = 'abcd'
  const res = await client.texts.sample.$put({ body: { id } })
  expect(res?.id).toBe(id)
})

test('POST: formdata', async () => {
  const port = '3000'
  const fileName = 'tsconfig.json'
  const form = new FormData()
  form.append('port', port)
  form.append('file', fs.createReadStream(fileName))
  const res = await axios.post(baseURL, form, {
    headers: form.getHeaders(),
    params: {
      requiredNum: 0,
      requiredNumArr: [],
      id: 1,
      disable: true,
      bool: false,
      boolArray: []
    }
  })
  expect(res.data.port).toBe(port)
  expect(res.data.fileName).toBe(fileName)
})

test('POST: multi file upload', async () => {
  const fileName = 'tsconfig.json'
  const form = new FormData()
  const fileST = fs.createReadStream(fileName)
  form.append('optionalArr', 'sample')
  form.append('name', 'sample')
  form.append('vals', 'dammy')
  form.append('icon', fileST)
  form.append('files', fileST)
  form.append('files', fileST)
  const res = await axios.post(`${baseURL}/multiForm`, form, {
    headers: form.getHeaders()
  })

  expect(res.data).toEqual({
    requiredArr: 0,
    optionalArr: 1,
    name: -1,
    icon: -1,
    vals: 1,
    files: 2
  })
})

test('POST: 400', async () => {
  const fileName = 'tsconfig.json'
  const form = new FormData()
  const fileST = fs.createReadStream(fileName)
  form.append('name', 'sample')
  form.append('vals', 'dammy')
  form.append('icon', fileST)

  await expect(
    axios.post(`${baseURL}/multiForm`, form, {
      headers: form.getHeaders()
    })
  ).rejects.toHaveProperty('response.status', 400)
})

test('controller dependency injection', async () => {
  let val = 0
  const id = '5'
  const injectedController = controller
    .inject({
      log: () => {
        throw new Error()
      }
    })
    .inject(() => ({
      log: n => {
        val = +n * 2
        return Promise.resolve(`${val}`)
      }
    }))(express())

  await expect(
    injectedController.get({
      query: {
        id,
        requiredNum: 1,
        requiredNumArr: [0],
        disable: 'true',
        bool: false,
        boolArray: []
      }
    })
  ).resolves.toHaveProperty('body.id', `${+id * 2}`)
  expect(val).toBe(+id * 2)
})

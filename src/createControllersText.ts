import path from 'path'
import fs from 'fs'
import ts from 'typescript'
import createDefaultFiles from './createDefaultFilesIfNotExists'

type HooksEvent = 'onRequest' | 'preParsing' | 'preValidation' | 'preHandler'
type Param = [string, string]

const findRootFiles = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(d =>
      d.isDirectory()
        ? findRootFiles(`${dir}/${d.name}`)
        : d.name === 'hooks.ts' || d.name === 'controller.ts'
        ? [`${dir}/${d.name}`]
        : []
    )

const initTSC = (appDir: string, project: string) => {
  const configDir = path.resolve(project.replace(/\/[^/]+\.json$/, ''))
  const configFileName = ts.findConfigFile(
    configDir,
    ts.sys.fileExists,
    project.endsWith('.json') ? project.split('/').pop() : undefined
  )

  const compilerOptions = configFileName
    ? ts.parseJsonConfigFileContent(
        ts.readConfigFile(configFileName, ts.sys.readFile).config,
        ts.sys,
        configDir
      )
    : undefined

  const program = ts.createProgram(
    findRootFiles(appDir),
    compilerOptions?.options
      ? { baseUrl: compilerOptions?.options.baseUrl, paths: compilerOptions?.options.paths }
      : {}
  )

  return { program, checker: program.getTypeChecker() }
}

const createRelayFile = (input: string, appText: string, userPath: string, params: Param[]) => {
  const text = `/* eslint-disable */\nimport { Express, RequestHandler } from 'express'\nimport { Deps, depend } from 'velona'\nimport { ServerMethods } from '${appText}'\n${
    userPath ? `import { User } from '${userPath}'\n` : ''
  }import { Methods } from './'\n\ntype ControllerMethods = ServerMethods<Methods, {${
    userPath ? '\n  user: User\n' : ''
  }${!userPath && params.length ? '\n' : ''}${
    params.length ? `  params: {\n${params.map(v => `    ${v[0]}: ${v[1]}`).join('\n')}\n  }\n` : ''
  }}>

export type Hooks = {
  onRequest?: RequestHandler | RequestHandler[]
  preParsing?: RequestHandler | RequestHandler[]
  preValidation?: RequestHandler | RequestHandler[]
  preHandler?: RequestHandler | RequestHandler[]
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
`

  fs.writeFileSync(path.join(input, '$relay.ts'), text, 'utf8')
}

const createFiles = (
  appDir: string,
  dirPath: string,
  params: Param[],
  appPath: string,
  user: string
) => {
  const input = path.posix.join(appDir, dirPath)
  const appText = `../${appPath}`
  const userPath =
    fs.existsSync(path.join(input, 'hooks.ts')) &&
    /(^|\n)export .+ User(,| )/.test(fs.readFileSync(path.join(input, 'hooks.ts'), 'utf8'))
      ? './hooks'
      : user
      ? `./.${user}`
      : ''

  createRelayFile(input, appText, userPath, params)
  createDefaultFiles(input)

  fs.readdirSync(input, { withFileTypes: true }).forEach(
    d =>
      d.isDirectory() &&
      createFiles(
        appDir,
        path.posix.join(dirPath, d.name),
        d.name.startsWith('_')
          ? [...params, [d.name.slice(1).split('@')[0], d.name.split('@')[1] ?? 'string']]
          : params,
        appText,
        userPath
      )
  )
}

export default (appDir: string, project: string) => {
  createFiles(appDir, '', [], '$server', '')

  const { program, checker } = initTSC(appDir, project)
  const hooksPaths: string[] = []
  const controllers: [string, boolean][] = []
  const createText = (
    dirPath: string,
    hooks: { name: string; events: { type: HooksEvent; isArray: boolean }[] }[]
  ) => {
    const input = path.posix.join(appDir, dirPath)
    const source = program.getSourceFile(path.join(input, 'index.ts'))
    const results: string[] = []

    if (source) {
      const methods = ts.forEachChild(source, node =>
        (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        node.name.escapedText === 'Methods' &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
          ? checker.getTypeAtLocation(node).getProperties()
          : undefined
      )

      if (methods?.length) {
        const hooksSource = program.getSourceFile(path.join(input, 'hooks.ts'))

        if (hooksSource) {
          const events = ts.forEachChild(hooksSource, node => {
            if (ts.isExportAssignment(node)) {
              return node.forEachChild(
                node =>
                  ts.isCallExpression(node) &&
                  node.forEachChild(node => {
                    if (
                      ts.isMethodDeclaration(node) ||
                      ts.isArrowFunction(node) ||
                      ts.isFunctionDeclaration(node)
                    ) {
                      return (
                        node.body &&
                        checker
                          .getTypeAtLocation(node.body)
                          .getProperties()
                          .map(p => {
                            const typeNode = checker.typeToTypeNode(
                              checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration),
                              undefined,
                              undefined
                            )

                            return {
                              type: p.name as HooksEvent,
                              isArray: typeNode
                                ? ts.isArrayTypeNode(typeNode) || ts.isTupleTypeNode(typeNode)
                                : false
                            }
                          })
                      )
                    }
                  })
              )
            }
          })

          if (events) {
            hooks.push({ name: `hooks${hooksPaths.length}`, events })
            hooksPaths.push(`${input}/hooks`)
          }
        }

        const controllerSource = program.getSourceFile(path.join(input, 'controller.ts'))
        let isPromiseMethods: string[] = []
        let ctrlHooksSignature: ts.Signature | undefined

        if (controllerSource) {
          isPromiseMethods =
            ts.forEachChild(
              controllerSource,
              node =>
                ts.isExportAssignment(node) &&
                node.forEachChild(
                  nod =>
                    ts.isCallExpression(nod) &&
                    checker
                      .getSignaturesOfType(
                        checker.getTypeAtLocation(nod.arguments[nod.arguments.length - 1]),
                        ts.SignatureKind.Call
                      )[0]
                      .getReturnType()
                      .getProperties()
                      .map(
                        t =>
                          checker
                            .getSignaturesOfType(
                              checker.getTypeOfSymbolAtLocation(t, t.valueDeclaration),
                              ts.SignatureKind.Call
                            )[0]
                            .getReturnType()
                            .getProperties()
                            .some(p => p.name === 'then') && t.name
                      )
                      .filter((n): n is string => !!n)
                )
            ) || []

          const ctrlHooksNode = ts.forEachChild(controllerSource, node => {
            if (
              ts.isVariableStatement(node) &&
              node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
            ) {
              return node.declarationList.declarations.find(d => d.name.getText() === 'hooks')
            } else if (ts.isExportDeclaration(node)) {
              const { exportClause } = node
              if (exportClause && ts.isNamedExports(exportClause)) {
                return exportClause.elements.find(el => el.name.text === 'hooks')
              }
            }
          })

          if (ctrlHooksNode) {
            ctrlHooksSignature = checker.getSignaturesOfType(
              checker.getTypeAtLocation(ctrlHooksNode),
              ts.SignatureKind.Call
            )[0]
          }
        }

        const ctrlHooksEvents = ctrlHooksSignature
          ?.getReturnType()
          .getProperties()
          .map(p => {
            const typeNode = checker.typeToTypeNode(
              checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration),
              undefined,
              undefined
            )

            return {
              type: p.name as HooksEvent,
              isArray: typeNode
                ? ts.isArrayTypeNode(typeNode) || ts.isTupleTypeNode(typeNode)
                : false
            }
          })

        const genHookTexts = (event: HooksEvent) => [
          ...hooks.flatMap(h => {
            const ev = h.events.find(e => e.type === event)
            return ev ? [`${ev.isArray ? '...' : ''}${h.name}.${event}`] : []
          }),
          ...(ctrlHooksEvents?.map(e =>
            e.type === event
              ? `${e.isArray ? '...' : ''}ctrlHooks${controllers.filter(c => c[1]).length}.${event}`
              : ''
          ) ?? [])
        ]

        results.push(
          methods
            .map(m => {
              const props = checker.getTypeOfSymbolAtLocation(m, m.valueDeclaration).getProperties()
              const query = props.find(p => p.name === 'query')
              const numberTypeQueryParams =
                query &&
                checker
                  .getTypeOfSymbolAtLocation(query, query.valueDeclaration)
                  .getProperties()
                  .map(p => {
                    const typeString = checker.typeToString(
                      checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration)
                    )
                    return typeString === 'number'
                      ? `['${p.name}', ${p.declarations.some(d =>
                          d.getChildren().some(c => c.kind === ts.SyntaxKind.QuestionToken)
                        )}, false]`
                      : typeString === 'number[]'
                      ? `['${p.name}', ${p.declarations.some(d =>
                          d.getChildren().some(c => c.kind === ts.SyntaxKind.QuestionToken)
                        )}, true]`
                      : null
                  })
                  .filter(Boolean)
              const validateInfo = [
                { name: 'query', val: query },
                { name: 'body', val: props.find(p => p.name === 'reqBody') },
                { name: 'headers', val: props.find(p => p.name === 'reqHeaders') }
              ]
                .filter((prop): prop is { name: string; val: ts.Symbol } => !!prop.val)
                .map(({ name, val }) => ({
                  name,
                  type: checker.getTypeOfSymbolAtLocation(val, val.valueDeclaration),
                  hasQuestion: val.declarations.some(
                    d => d.getChildAt(1).kind === ts.SyntaxKind.QuestionToken
                  )
                }))
                .filter(({ type }) => type.isClass())

              const reqFormat = props.find(p => p.name === 'reqFormat')
              const isFormData =
                (reqFormat &&
                  checker.typeToString(
                    checker.getTypeOfSymbolAtLocation(reqFormat, reqFormat.valueDeclaration)
                  )) === 'FormData'
              const reqBody = props.find(p => p.name === 'reqBody')

              const handlers = [
                ...genHookTexts('onRequest'),
                ...genHookTexts('preParsing'),
                numberTypeQueryParams && numberTypeQueryParams.length
                  ? `parseNumberTypeQueryParams(${
                      query?.declarations.some(
                        d => d.getChildAt(1).kind === ts.SyntaxKind.QuestionToken
                      )
                        ? 'query => !Object.keys(query).length ? [] :'
                        : '() =>'
                    } [${numberTypeQueryParams.join(', ')}])`
                  : '',
                ...(isFormData && reqBody
                  ? [
                      'uploader',
                      `formatMulterData([${checker
                        .getTypeOfSymbolAtLocation(reqBody, reqBody.valueDeclaration)
                        .getProperties()
                        .map(p => {
                          const node = checker.typeToTypeNode(
                            checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration),
                            undefined,
                            undefined
                          )

                          return node && (ts.isArrayTypeNode(node) || ts.isTupleTypeNode(node))
                            ? `['${p.name}', ${p.declarations.some(d =>
                                d.getChildren().some(c => c.kind === ts.SyntaxKind.QuestionToken)
                              )}]`
                            : undefined
                        })
                        .filter(Boolean)
                        .join(', ')}])`
                    ]
                  : []),
                !reqFormat && reqBody ? 'parseJSONBoby' : '',
                ...genHookTexts('preValidation'),
                validateInfo.length
                  ? `createValidateHandler(req => [
${validateInfo
  .map(
    v =>
      `      ${
        v.hasQuestion ? `Object.keys(req.${v.name}).length ? ` : ''
      }validateOrReject(Object.assign(new Validators.${checker.typeToString(v.type)}(), req.${
        v.name
      }))${v.hasQuestion ? ' : null' : ''}`
  )
  .join(',\n')}\n    ])`
                  : '',
                dirPath.includes('@number')
                  ? `createTypedParamsHandler(['${dirPath
                      .split('/')
                      .filter(p => p.includes('@number'))
                      .map(p => p.split('@')[0].slice(1))
                      .join("', '")}'])`
                  : '',
                ...genHookTexts('preHandler'),
                `${
                  isPromiseMethods.includes(m.name) ? 'asyncMethodToHandler' : 'methodToHandler'
                }(controller${controllers.length}.${m.name})`
              ].filter(Boolean)

              return `  app.${m.name}(\`\${basePath}${`/${dirPath}`
                .replace(/\/_/g, '/:')
                .replace(/@.+?($|\/)/g, '$1')}\`, ${
                handlers.length === 1 ? handlers[0] : `[\n    ${handlers.join(',\n    ')}\n  ]`
              })\n`
            })
            .join('\n')
        )

        controllers.push([`${input}/controller`, !!ctrlHooksEvents])
      }
    }

    const childrenDirs = fs.readdirSync(input, { withFileTypes: true }).filter(d => d.isDirectory())

    if (childrenDirs.length) {
      results.push(
        ...childrenDirs
          .filter(d => !d.name.startsWith('_'))
          .flatMap(d => createText(path.posix.join(dirPath, d.name), hooks))
      )

      const value = childrenDirs.find(d => d.name.startsWith('_'))

      if (value) {
        results.push(...createText(path.posix.join(dirPath, value.name), hooks))
      }
    }

    return results
  }

  const text = createText('', []).join('\n')
  const ctrlHooks = controllers.filter(c => c[1])

  return {
    imports: `${hooksPaths
      .map(
        (m, i) =>
          `import hooksFn${i} from '${m.replace(/^api/, './api').replace(appDir, './api')}'\n`
      )
      .join('')}${controllers
      .map(
        (ctrl, i) =>
          `import controllerFn${i}${
            ctrl[1] ? `, { hooks as ctrlHooksFn${ctrlHooks.indexOf(ctrl)} }` : ''
          } from '${ctrl[0].replace(/^api/, './api').replace(appDir, './api')}'\n`
      )
      .join('')}`,
    consts: `${hooksPaths
      .map((_, i) => `  const hooks${i} = hooksFn${i}(app)\n`)
      .join('')}${ctrlHooks
      .map((_, i) => `  const ctrlHooks${i} = ctrlHooksFn${i}(app)\n`)
      .join('')}${controllers
      .map((_, i) => `  const controller${i} = controllerFn${i}()\n`)
      .join('')}`,
    controllers: text
  }
}

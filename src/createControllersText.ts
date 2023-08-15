import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type { Param } from './createDefaultFilesIfNotExists';
import { createDefaultFilesIfNotExists } from './createDefaultFilesIfNotExists';

type HooksEvent = 'onRequest' | 'preParsing' | 'preValidation' | 'preHandler';

const findRootFiles = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .reduce<string[]>(
      (prev, d) => [
        ...prev,
        ...(d.isDirectory()
          ? findRootFiles(`${dir}/${d.name}`)
          : d.name === 'hooks.ts' || d.name === 'controller.ts'
          ? [`${dir}/${d.name}`]
          : []),
      ],
      []
    );

const initTSC = (appDir: string, project: string) => {
  const configDir = path.resolve(project.replace(/\/[^/]+\.json$/, ''));
  const configFileName = ts.findConfigFile(
    configDir,
    ts.sys.fileExists,
    project.endsWith('.json') ? project.split('/').pop() : undefined
  );

  const compilerOptions = configFileName
    ? ts.parseJsonConfigFileContent(
        ts.readConfigFile(configFileName, ts.sys.readFile).config,
        ts.sys,
        configDir
      )
    : undefined;

  const program = ts.createProgram(findRootFiles(appDir), compilerOptions?.options ?? {});

  return { program, checker: program.getTypeChecker() };
};

const createRelayFile = (
  input: string,
  appText: string,
  additionalReqs: string[],
  params: Param[],
  currentParam: Param | null
) => {
  const hasAdditionals = !!additionalReqs.length;
  const hasMultiAdditionals = additionalReqs.length > 1;
  const text = `import { depend } from 'velona';
import { z } from 'zod';
import type { Injectable } from 'velona';
import type { Express } from 'express';
import type { ServerHooks, ServerMethodHandler } from '${appText}';
${
  hasMultiAdditionals
    ? additionalReqs
        .map(
          (req, i) =>
            `import type { AdditionalRequest as AdditionalRequest${i} } from '${req.replace(
              /^\.\/\./,
              '.'
            )}';\n`
        )
        .join('')
    : hasAdditionals
    ? `import type { AdditionalRequest } from '${additionalReqs[0]}';\n`
    : ''
}import type { Methods } from './';

${
  hasMultiAdditionals
    ? `type AdditionalRequest = ${additionalReqs
        .map((_, i) => `AdditionalRequest${i}`)
        .join(' & ')};\n\n`
    : ''
}${
    params.length
      ? `type Params = {\n${params.map(v => `  ${v[0]}: ${v[1]};`).join('\n')}\n};\n\n`
      : ''
  }${
    currentParam
      ? `export function defineValidators(validator: (app: Express) => {
  params: z.ZodType<{ ${currentParam[0]}: ${currentParam[1]} }>;
}) {
  return validator;
};\n\n`
      : ''
  }export function defineHooks<T extends ServerHooks${
    hasAdditionals ? '<AdditionalRequest>' : ''
  }>(hooks: (app: Express) => T): (app: Express) => T
export function defineHooks<T extends Record<string, unknown>, U extends ServerHooks${
    hasAdditionals ? '<AdditionalRequest>' : ''
  }>(deps: T, cb: (d: T, app: Express) => U): Injectable<T, [Express], U>
export function defineHooks<T extends Record<string, unknown>>(hooks: (app: Express) => ServerHooks${
    hasAdditionals ? '<AdditionalRequest>' : ''
  } | T, cb?: ((deps: T, app: Express) => ServerHooks${
    hasAdditionals ? '<AdditionalRequest>' : ''
  })) {
  return cb && typeof hooks !== 'function' ? depend(hooks, cb) : hooks;
}

type ServerMethods = {
  [Key in keyof Methods]: ServerMethodHandler<Methods[Key]${
    hasAdditionals || params.length ? ', ' : ''
  }${hasAdditionals ? `AdditionalRequest${params.length ? ' & ' : ''}` : ''}${
    params.length ? '{ params: Params }' : ''
  }>;
};

export function defineController<M extends ServerMethods>(methods: (app: Express) => M): (app: Express) => M
export function defineController<M extends ServerMethods, T extends Record<string, unknown>>(deps: T, cb: (d: T, app: Express) => M): Injectable<T, [Express], M>
export function defineController<M extends ServerMethods, T extends Record<string, unknown>>(methods: ((app: Express) => M) | T, cb?: ((deps: T, app: Express) => M)) {
  return cb && typeof methods !== 'function' ? depend(methods, cb) : methods;
}

export const multipartFileValidator = () =>
  z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    size: z.number(),
    destination: z.string(),
    filename: z.string(),
    path: z.string(),
    stream: z.any(),
    buffer: z.any(),
  }) as z.ZodType<Express.Multer.File>;
`;

  fs.writeFileSync(
    path.join(input, '$relay.ts'),
    text.replace(', {}', '').replace(' & {}', ''),
    'utf8'
  );
};

const getAdditionalResPath = (input: string, name: string) =>
  fs.existsSync(path.join(input, `${name}.ts`)) &&
  /(^|\n)export .+ AdditionalRequest(,| )/.test(
    fs.readFileSync(path.join(input, `${name}.ts`), 'utf8')
  )
    ? [`./${name}`]
    : [];

const createFiles = (
  appDir: string,
  dirPath: string,
  params: Param[],
  currentParam: Param | null,
  appPath: string,
  additionalRequestPaths: string[]
) => {
  const input = path.posix.join(appDir, dirPath);
  const appText = `../${appPath}`;
  const additionalReqs = [
    ...additionalRequestPaths.map(p => `./.${p}`),
    ...getAdditionalResPath(input, 'hooks'),
  ];

  createDefaultFilesIfNotExists(input, currentParam);
  createRelayFile(
    input,
    appText,
    [...additionalReqs, ...getAdditionalResPath(input, 'controller')],
    params,
    currentParam
  );

  const dirs = fs.readdirSync(input, { withFileTypes: true }).filter(d => d.isDirectory());
  if (dirs.filter(d => d.name.startsWith('_')).length >= 2) {
    throw new Error('There are two ore more path param folders.');
  }

  dirs.forEach(d => {
    const currentParam = d.name.startsWith('_')
      ? ([d.name.slice(1).split('@')[0], d.name.split('@')[1] ?? 'string'] as [string, string])
      : null;
    return createFiles(
      appDir,
      path.posix.join(dirPath, d.name),
      currentParam ? [...params, currentParam] : params,
      currentParam,
      appText,
      additionalReqs
    );
  });
};

export default (appDir: string, project: string) => {
  createFiles(appDir, '', [], null, '$server', []);

  const { program, checker } = initTSC(appDir, project);
  const hooksPaths: string[] = [];
  const validatorsPaths: string[] = [];
  const controllerPaths: string[] = [];
  const createText = (
    dirPath: string,
    cascadingHooks: { name: string; events: { type: HooksEvent; isArray: boolean }[] }[],
    cascadingValidators: { name: string; isNumber: boolean }[]
  ) => {
    const input = path.posix.join(appDir, dirPath);
    const source = program.getSourceFile(path.join(input, 'index.ts'));
    const results: string[] = [];
    let hooks = cascadingHooks;
    let paramsValidators = cascadingValidators;

    const validatorsFilePath = path.join(input, 'validators.ts');
    if (fs.existsSync(validatorsFilePath)) {
      paramsValidators = [
        ...cascadingValidators,
        {
          name: `validators${validatorsPaths.length}`,
          isNumber: dirPath.split('@')[1] === 'number',
        },
      ];
      validatorsPaths.push(`${input}/validators`);
    }

    if (source) {
      const methods = ts.forEachChild(source, node =>
        (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        node.name.escapedText === 'Methods' &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
          ? checker.getTypeAtLocation(node).getProperties()
          : undefined
      );

      const hooksSource = program.getSourceFile(path.join(input, 'hooks.ts'));

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
                          const typeNode =
                            p.valueDeclaration &&
                            checker.typeToTypeNode(
                              checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration),
                              undefined,
                              undefined
                            );

                          return {
                            type: p.name as HooksEvent,
                            isArray: typeNode
                              ? ts.isArrayTypeNode(typeNode) || ts.isTupleTypeNode(typeNode)
                              : false,
                          };
                        })
                    );
                  }
                })
            );
          }
        });

        if (events) {
          hooks = [...cascadingHooks, { name: `hooks${hooksPaths.length}`, events }];
          hooksPaths.push(`${input}/hooks`);
        }
      }

      if (methods?.length) {
        const controllerSource = program.getSourceFile(path.join(input, 'controller.ts'));
        const isPromiseMethods: string[] = [];
        const hasHandlerMethods: string[] = [];
        const hasValidatorsMethods: string[] = [];
        const hasSchemasMethods: string[] = [];
        const hasHooksMethods: {
          method: string;
          events: { type: HooksEvent; isArray: boolean }[];
        }[] = [];

        if (controllerSource) {
          const getMethodTypeNodes = <T>(
            cb: (symbol: ts.Symbol, typeNode: ts.TypeNode, type: ts.Type) => T | null
          ): T[] =>
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
                      .map(t => {
                        const type =
                          t.valueDeclaration &&
                          checker.getTypeOfSymbolAtLocation(t, t.valueDeclaration);
                        if (!type) return undefined;

                        const typeNode =
                          t.valueDeclaration && checker.typeToTypeNode(type, undefined, undefined);
                        if (!typeNode) return undefined;

                        return cb(t, typeNode, type);
                      })
                      .filter((n): n is T => !!n)
                )
            ) || [];

          isPromiseMethods.push(
            ...getMethodTypeNodes((symbol, typeNode, type) => {
              const handler = ts.isFunctionTypeNode(typeNode)
                ? symbol
                : type.getProperties().find(p => p.name === 'handler');

              if (!handler) return null;

              return handler.valueDeclaration &&
                checker
                  .getSignaturesOfType(
                    checker.getTypeOfSymbolAtLocation(handler, handler.valueDeclaration),
                    ts.SignatureKind.Call
                  )[0]
                  .getReturnType()
                  .getSymbol()
                  ?.getEscapedName() === 'Promise'
                ? symbol.name
                : null;
            })
          );

          hasHandlerMethods.push(
            ...getMethodTypeNodes((symbol, typeNode) =>
              ts.isFunctionTypeNode(typeNode) ? null : symbol.name
            )
          );

          hasValidatorsMethods.push(
            ...getMethodTypeNodes((symbol, typeNode, type) =>
              !ts.isFunctionTypeNode(typeNode) &&
              type.getProperties().find(p => p.name === 'validators')
                ? symbol.name
                : null
            )
          );

          hasSchemasMethods.push(
            ...getMethodTypeNodes((symbol, typeNode, type) =>
              !ts.isFunctionTypeNode(typeNode) &&
              type.getProperties().find(p => p.name === 'schemas')
                ? symbol.name
                : null
            )
          );

          hasHooksMethods.push(
            ...getMethodTypeNodes((symbol, typeNode, type) => {
              if (ts.isFunctionTypeNode(typeNode)) return null;

              const hooksSymbol = type.getProperties().find(p => p.name === 'hooks');

              if (!hooksSymbol?.valueDeclaration) return null;

              return {
                method: symbol.name,
                events: checker
                  .getTypeOfSymbolAtLocation(hooksSymbol, hooksSymbol.valueDeclaration)
                  .getProperties()
                  .map(p => {
                    const typeNode =
                      p.valueDeclaration &&
                      checker.typeToTypeNode(
                        checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration),
                        undefined,
                        undefined
                      );

                    return {
                      type: p.name as HooksEvent,
                      isArray: typeNode
                        ? ts.isArrayTypeNode(typeNode) || ts.isTupleTypeNode(typeNode)
                        : false,
                    };
                  }),
              };
            })
          );
        }

        const genHookTexts = (event: HooksEvent, methodName: string) => [
          ...hooks.reduce<string[]>((prev, h) => {
            const ev = h.events.find(e => e.type === event);
            return ev ? [...prev, `${ev.isArray ? '...' : ''}${h.name}.${event}`] : prev;
          }, []),
          ...(hasHooksMethods.some(
            m => m.method === methodName && m.events.some(e => e.type === event)
          )
            ? [
                `${
                  hasHooksMethods
                    .find(m => m.method === methodName)
                    ?.events.find(e => e.type === event)?.isArray
                    ? '...'
                    : ''
                }controller${controllerPaths.length}.${methodName}.hooks.${event}`,
              ]
            : []),
        ];

        const getSomeTypeQueryParams = (typeName: string, query: ts.Symbol) => {
          const queryDeclaration = query.valueDeclaration ?? query.declarations?.[0];
          const type =
            queryDeclaration && checker.getTypeOfSymbolAtLocation(query, queryDeclaration);
          const targetType = type?.isUnion()
            ? type.types.find(t => checker.typeToString(t) !== 'undefined')
            : type;

          return targetType
            ?.getProperties()
            .map(p => {
              const declaration = p.valueDeclaration ?? p.declarations?.[0];
              const type = declaration && checker.getTypeOfSymbolAtLocation(p, declaration);
              const typeString = type && checker.typeToString(type).replace(' | undefined', '');
              const isArray = typeString === `${typeName}[]`;

              return typeString === typeName || isArray
                ? `['${p.name}', ${(p.flags & ts.SymbolFlags.Optional) !== 0}, ${isArray}]`
                : null;
            })
            .filter(Boolean);
        };

        results.push(
          methods
            .map(m => {
              const props = m.valueDeclaration
                ? checker.getTypeOfSymbolAtLocation(m, m.valueDeclaration).getProperties()
                : [];
              const query = props.find(p => p.name === 'query');
              const numberTypeQueryParams = query && getSomeTypeQueryParams('number', query);
              const booleanTypeQueryParams = query && getSomeTypeQueryParams('boolean', query);
              const reqFormat = props.find(p => p.name === 'reqFormat');
              const isFormData =
                (reqFormat?.valueDeclaration &&
                  checker.typeToString(
                    checker.getTypeOfSymbolAtLocation(reqFormat, reqFormat.valueDeclaration)
                  )) === 'FormData';
              const reqBody = props.find(p => p.name === 'reqBody');

              const handlers: string[] = [
                ...genHookTexts('onRequest', m.name),
                ...genHookTexts('preParsing', m.name),
                numberTypeQueryParams?.length
                  ? query?.declarations?.some(
                      d => d.getChildAt(1).kind === ts.SyntaxKind.QuestionToken
                    )
                    ? `callParserIfExistsQuery(parseNumberTypeQueryParams([${numberTypeQueryParams.join(
                        ', '
                      )}]))`
                    : `parseNumberTypeQueryParams([${numberTypeQueryParams.join(', ')}])`
                  : '',
                booleanTypeQueryParams?.length
                  ? query?.declarations?.some(
                      d => d.getChildAt(1).kind === ts.SyntaxKind.QuestionToken
                    )
                    ? `callParserIfExistsQuery(parseBooleanTypeQueryParams([${booleanTypeQueryParams.join(
                        ', '
                      )}]))`
                    : `parseBooleanTypeQueryParams([${booleanTypeQueryParams.join(', ')}])`
                  : '',
                ...(isFormData && reqBody?.valueDeclaration
                  ? [
                      'uploader',
                      `formatMulterData([${checker
                        .getTypeOfSymbolAtLocation(reqBody, reqBody.valueDeclaration)
                        .getProperties()
                        .map(p => {
                          const declaration = p.valueDeclaration ?? p.declarations?.[0];
                          const type =
                            declaration && checker.getTypeOfSymbolAtLocation(p, declaration);
                          const typeString = type && checker.typeToString(type);

                          return typeString?.includes('[]')
                            ? `['${p.name}', ${(p.flags & ts.SymbolFlags.Optional) !== 0}]`
                            : undefined;
                        })
                        .filter(Boolean)
                        .join(', ')}])`,
                    ]
                  : []),
                !reqFormat && reqBody ? 'parseJSONBoby' : '',
                ...genHookTexts('preValidation', m.name),
                dirPath.includes('@number')
                  ? `createTypedParamsHandler(['${dirPath
                      .split('/')
                      .filter(p => p.includes('@number'))
                      .map(p => p.split('@')[0].slice(1))
                      .join("', '")}'])`
                  : '',
                paramsValidators.length
                  ? `validatorCompiler('params', ${paramsValidators
                      .map(v => `${v.name}.params`)
                      .join('.and(')}${paramsValidators.length > 1 ? ')' : ''})`
                  : '',
                hasValidatorsMethods.includes(m.name)
                  ? `...Object.entries(controller${controllerPaths.length}.${m.name}.validators).map(([key, validator]) => validatorCompiler(key as 'query' | 'headers' | 'body', validator))`
                  : '',
                ...genHookTexts('preHandler', m.name),
                hasSchemasMethods.includes(m.name)
                  ? `${
                      isPromiseMethods.includes(m.name)
                        ? 'asyncMethodToHandlerWithSchema'
                        : 'methodToHandlerWithSchema'
                    }(controller${controllerPaths.length}.${m.name}${
                      hasHandlerMethods.includes(m.name) ? '.handler' : ''
                    }, controller${controllerPaths.length}.${m.name}.schemas.response)`
                  : `${
                      isPromiseMethods.includes(m.name) ? 'asyncMethodToHandler' : 'methodToHandler'
                    }(controller${controllerPaths.length}.${m.name}${
                      hasHandlerMethods.includes(m.name) ? '.handler' : ''
                    })`,
              ].filter(Boolean);

              return `  app.${m.name}(\`\${basePath}${`/${dirPath}`
                .replace(/\/_/g, '/:')
                .replace(/@.+?($|\/)/g, '$1')}\`, ${
                handlers.length === 1 ? handlers[0] : `[\n    ${handlers.join(',\n    ')},\n  ]`
              });\n`;
            })
            .join('\n')
        );

        controllerPaths.push(`${input}/controller`);
      }
    }

    const childrenDirs = fs
      .readdirSync(input, { withFileTypes: true })
      .filter(d => d.isDirectory());

    if (childrenDirs.length) {
      results.push(
        ...childrenDirs
          .filter(d => !d.name.startsWith('_'))
          .reduce<string[]>(
            (prev, d) => [
              ...prev,
              ...createText(path.posix.join(dirPath, d.name), hooks, paramsValidators),
            ],
            []
          )
      );

      const value = childrenDirs.find(d => d.name.startsWith('_'));

      if (value) {
        results.push(...createText(path.posix.join(dirPath, value.name), hooks, paramsValidators));
      }
    }

    return results;
  };

  const text = createText('', [], []).join('\n');

  return {
    imports: `${hooksPaths
      .map(
        (m, i) =>
          `import hooksFn${i} from '${m.replace(/^api/, './api').replace(appDir, './api')}';\n`
      )
      .join('')}${validatorsPaths
      .map(
        (m, i) =>
          `import validatorsFn${i} from '${m.replace(/^api/, './api').replace(appDir, './api')}';\n`
      )
      .join('')}${controllerPaths
      .map(
        (ctrl, i) =>
          `import controllerFn${i} from '${ctrl
            .replace(/^api/, './api')
            .replace(appDir, './api')}';\n`
      )
      .join('')}`,
    consts: `${hooksPaths
      .map((_, i) => `  const hooks${i} = hooksFn${i}(app);\n`)
      .join('')}${validatorsPaths
      .map((_, i) => `  const validators${i} = validatorsFn${i}(app);\n`)
      .join('')}${controllerPaths
      .map((_, i) => `  const controller${i} = controllerFn${i}(app);\n`)
      .join('')}`,
    controllers: text,
  };
};

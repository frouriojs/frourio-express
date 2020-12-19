import minimist from 'minimist'
import write from 'aspida/dist/writeRouteFile'
import watch from 'aspida/dist/watchInputDir'
import build from './buildServerFile'

export const run = (args: string[]) => {
  const argv = minimist(args, {
    string: ['version', 'watch', 'project'],
    alias: { v: 'version', w: 'watch', p: 'project' }
  })
  const dir = '.'

  // eslint-disable-next-line no-unused-expressions
  argv.version !== undefined
    ? console.log(`v${require('../package.json').version}`)
    : argv.watch !== undefined
    ? (write(build(dir, argv.project)), watch(dir, () => write(build(dir, argv.project))))
    : write(build(dir, argv.project))
}

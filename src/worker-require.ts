import callsite from 'callsite';
import path from 'path';

import { createWorker, destroyWorker } from './factory';
import { setProxy } from './proxy';
import { Functions, AsyncWorkerModule } from './types';
import { isFunctionName } from './utils';

setProxy();

export function workerRequire<Module>(id: string): AsyncWorkerModule<Module> {
  const [, call] = callsite();
  const sourcePath = call.getFileName();

  const idPath = path.resolve(path.dirname(sourcePath), id);
  const requirePath = require.resolve(idPath);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(requirePath) as Module;

  return new Proxy({} as AsyncWorkerModule<Module>, {
    get(_: AsyncWorkerModule<Module>, name: keyof Module): unknown {
      if (name === 'destroy') {
        return function destroy(): void {
          destroyWorker(requirePath);
        };
      }

      if (!isFunctionName<Module>(module, name)) {
        throw new Error(`'${name.toString()}' is not a function`);
      }

      type WorkerFunc = Functions<Module>[typeof name];
      type WorkerResult = Promise<ReturnType<WorkerFunc>>;
      return function <WorkerArgs extends Array<unknown>>(
        ...args: WorkerArgs
      ): WorkerResult {
        const api = createWorker<Module>(requirePath);
        return (api[name] as WorkerFunc)(...args) as WorkerResult;
      };
    },
  });
}

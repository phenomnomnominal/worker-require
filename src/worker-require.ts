import callsite from 'callsite';
import path from 'path';

import { getWorker, destroyWorker } from './factory';
import { setHandlers } from './handlers';
import { TO_CLONEABLE } from './cloneable';
import { AsyncWorkerModule, WorkerRequireOptions } from './types';

setHandlers();

export function workerRequire<Module>(
  id: string,
  options: WorkerRequireOptions = { cache: true }
): AsyncWorkerModule<Module> {
  const [, call] = callsite();
  const sourcePath = call.getFileName();

  const idPath = path.resolve(path.dirname(sourcePath), id);
  const requirePath = require.resolve(idPath);

  function destroy(): void {
    destroyWorker(requirePath);
  }

  return new Proxy({} as AsyncWorkerModule<Module>, {
    get(_: AsyncWorkerModule<Module>, name: string | symbol): unknown {
      if (name === 'destroy') {
        return destroy;
      }

      return new Proxy(() => void 0, {
        get(_: unknown, propertyName: string | symbol): unknown {
          if (propertyName === TO_CLONEABLE) {
            return null;
          }
          try {
            const api = getWorker<Module>(requirePath, options);
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            // @ts-expect-error Proxy magic, hard to type:
            return api[name][propertyName];
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
          } catch {
            destroy();
          }
        },
        apply(_: unknown, __: unknown, args: Array<unknown>): unknown {
          try {
            const api = getWorker<Module>(requirePath, options);
            /* eslint-disable @typescript-eslint/no-unsafe-call */
            // @ts-expect-error Proxy magic, hard to type:
            return api[name](...args);
            /* eslint-enable @typescript-eslint/no-unsafe-call */
          } catch {
            destroy();
          }
        },
      });
    },
  });
}

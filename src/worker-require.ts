import callsite from 'callsite';
import { releaseProxy, Remote, wrap } from 'comlink';
import nodeEndpoint from 'comlink/dist/umd/node-adapter';
import * as path from 'path';
import { Worker } from 'worker_threads';

import { TO_CLONEABLE, WORKER_PATH } from './constants';
import { setHandlers } from './handlers';
import {
  WorkerRequireCache,
  WorkerRequireModuleAsync,
  WorkerRequireOptions,
} from './types';

setHandlers();

export function createWorkerRequire<Module>(
  id: string,
  options?: WorkerRequireOptions
) {
  return (): WorkerRequireModuleAsync<Module> =>
    workerRequire<Module>(id, options);
}

export function workerRequire<Module>(
  id: string,
  options: WorkerRequireOptions = { cache: true }
): WorkerRequireModuleAsync<Module> {
  const [, call] = callsite();
  const sourcePath = call.getFileName();

  const idPath = path.resolve(path.dirname(sourcePath), id);
  const requirePath = require.resolve(idPath);

  function destroy(): void {
    destroyWorker(requirePath);
  }

  const api = getWorker<Module>(requirePath, options);

  return new Proxy({} as WorkerRequireModuleAsync<Module>, {
    get(_: WorkerRequireModuleAsync<Module>, name: string | symbol): unknown {
      if (name === 'destroy') {
        return destroy;
      }

      return new Proxy(() => void 0, {
        get(_: unknown, propertyName: string | symbol): unknown {
          if (propertyName === TO_CLONEABLE) {
            return null;
          }
          if (propertyName === 'then') {
            return null;
          }
          /* eslint-disable @typescript-eslint/no-unsafe-member-access */
          // @ts-expect-error Proxy magic, hard to type:
          return api[name][propertyName];
          /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        },
        apply(_: unknown, __: unknown, args: Array<unknown>): unknown {
          /* eslint-disable @typescript-eslint/no-unsafe-call */
          // @ts-expect-error Proxy magic, hard to type:
          return api[name](...args);
          /* eslint-enable @typescript-eslint/no-unsafe-call */
        },
      });
    },
  });
}

const cache = new Map() as WorkerRequireCache;

function getWorker<Module = unknown>(
  requirePath: string,
  options: WorkerRequireOptions
): Remote<Module> {
  const cached = cache.get(requirePath);
  if (options.cache && cached) {
    const [cacheItem] = cached;
    return cacheItem.remote as Remote<Module>;
  }
  return createWorker<Module>(requirePath);
}

function createWorker<Module = unknown>(requirePath: string): Remote<Module> {
  const cached = cache.get(requirePath) || [];
  const worker = new Worker(WORKER_PATH, { workerData: requirePath });
  const remote = wrap<Module>(nodeEndpoint(worker));
  cached.push({ remote, worker });
  cache.set(requirePath, cached);
  return remote;
}

function destroyWorker(requirePath: string): void {
  const cached = cache.get(requirePath);
  if (!cached) {
    return;
  }
  cache.delete(requirePath);
  cached.forEach((cacheItem) => {
    void cacheItem.remote[releaseProxy]();
    void cacheItem.worker.terminate();
  });
}

import callsite from 'callsite';
import * as path from 'path';
import { Worker } from 'worker_threads';

import { releaseProxy, wrap } from './vendor/comlink';
import nodeEndpoint from './vendor/node-adapter';

import { TO_CLONEABLE, WORKER_PATH } from './constants';
import { setHandlers } from './handlers';
import {
  WorkerRequireHandles,
  WorkerRequireHandle,
  WorkerRequireModuleAsync,
  WorkerRequireOptions,
} from './types';

setHandlers();

export function createWorkerRequire<Module>(
  id: string,
  options?: WorkerRequireOptions
): () => WorkerRequireModuleAsync<Module> {
  const [, call] = callsite();
  const sourcePath = call.getFileName();
  return (): WorkerRequireModuleAsync<Module> =>
    createProxy<Module>(sourcePath, id, options);
}

export function workerRequire<Module>(
  id: string,
  options: WorkerRequireOptions = { cache: true }
): WorkerRequireModuleAsync<Module> {
  const [, call] = callsite();
  const sourcePath = call.getFileName();
  return createProxy<Module>(sourcePath, id, options);
}

function createProxy<Module>(
  sourcePath: string,
  id: string,
  options: WorkerRequireOptions = { cache: true }
): WorkerRequireModuleAsync<Module> {
  const idPath = path.resolve(path.dirname(sourcePath), id);
  const requirePath = require.resolve(idPath);

  const handle = getWorker<Module>(requirePath, options);

  async function destroy(): Promise<void> {
    await destroyWorker(requirePath, handle);
  }

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
          return handle.remote[name][propertyName];
          /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        },
        apply(_: unknown, __: unknown, args: Array<unknown>): unknown {
          /* eslint-disable @typescript-eslint/no-unsafe-call */
          // @ts-expect-error Proxy magic, hard to type:
          return handle.remote[name](...args);
          /* eslint-enable @typescript-eslint/no-unsafe-call */
        },
      });
    },
  });
}

const HANDLES = new Map() as WorkerRequireHandles;

function getWorker<Module = unknown>(
  requirePath: string,
  options: WorkerRequireOptions
): WorkerRequireHandle<Module> {
  const cached = HANDLES.get(requirePath);
  if (options.cache && cached) {
    const [cachedItem] = cached;
    return cachedItem as WorkerRequireHandle<Module>;
  }
  return createWorker<Module>(requirePath);
}

function createWorker<Module = unknown>(
  requirePath: string
): WorkerRequireHandle<Module> {
  const cached = HANDLES.get(requirePath) || [];
  const worker = new Worker(WORKER_PATH, { workerData: requirePath });
  const remote = wrap<Module>(nodeEndpoint(worker));
  const handle = { remote, worker };
  cached.push(handle);
  HANDLES.set(requirePath, cached);
  return handle;
}

async function destroyWorker(
  requirePath: string,
  handle: WorkerRequireHandle<unknown>
): Promise<void> {
  const cached = HANDLES.get(requirePath);
  if (!cached) {
    return;
  }
  cached.splice(cached.indexOf(handle), 1);
  if (cached.length === 0) {
    HANDLES.delete(requirePath);
  }
  handle.remote[releaseProxy]();
  await handle.worker.terminate();
}

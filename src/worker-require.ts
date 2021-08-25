import callsite from 'callsite';
import * as path from 'path';
import { Worker } from 'worker_threads';

import { releaseProxy, Remote, wrap } from './vendor/comlink';
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
    wrapModule<Module>(sourcePath, id, options);
}

export function workerRequire<Module>(
  id: string,
  options: WorkerRequireOptions = { cache: true }
): WorkerRequireModuleAsync<Module> {
  const [, call] = callsite();
  const sourcePath = call.getFileName();
  return wrapModule<Module>(sourcePath, id, options);
}

function wrapModule<Module>(
  sourcePath: string,
  id: string,
  options: WorkerRequireOptions = { cache: true }
): WorkerRequireModuleAsync<Module> {
  const idPath = path.resolve(path.dirname(sourcePath), id);
  const requirePath = require.resolve(idPath);

  async function destroy(): Promise<void> {
    await destroyWorker(requirePath, handle);
  }

  const handle = getWorker<Module>(requirePath, options);

  function getModule(): Remote<Module> {
    if (process.env.WORKER_REQUIRE === 'false') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return require(requirePath);
    }
    return handle.remote;
  }

  return new Proxy({} as WorkerRequireModuleAsync<Module>, {
    get(_: WorkerRequireModuleAsync<Module>, name: string | symbol): unknown {
      if (name === 'destroy') {
        return destroy;
      }

      return createProxy(getModule, [name]);
    },
  });
}

function createProxy<Module>(
  getModule: () => Remote<Module>,
  path: Array<string | symbol>
) {
  return new Proxy(() => void 0, {
    get(_: unknown, name: string | symbol): unknown {
      if (name === TO_CLONEABLE) {
        return null;
      }
      if (name === 'then') {
        return null;
      }

      return createProxy(getModule, [...path, name]);
    },
    apply(_: unknown, thisArg: unknown, args: Array<unknown>): unknown {
      let obj = getModule();
      while (path.length > 1) {
        // @ts-expect-error Proxy Magic is hard to type:
        // eslint-disable-next-line
        obj = obj[path.shift()!];
      }
      const [prop] = path;
      // @ts-expect-error Proxy Magic is hard to type:
      // eslint-disable-next-line
      return Promise.resolve(obj[prop].call(thisArg, ...args));
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

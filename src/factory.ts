import { releaseProxy, Remote, wrap } from 'comlink';
import nodeEndpoint from 'comlink/dist/umd/node-adapter';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { WorkerRequireOptions } from './types';

const WORKER_PATH = path.resolve(
  require.resolve('@phenomnomnominal/worker-require'),
  '../worker.js'
);

const cache = new Map<string, Array<Remote<unknown>>>();

export function getWorker<Module = unknown>(
  requirePath: string,
  options: WorkerRequireOptions
): Remote<Module> {
  const cached = cache.get(requirePath) as Array<Remote<Module>>;
  if (!cached || !options.cache) {
    return createWorker<Module>(requirePath);
  }
  const [worker] = cached;
  return worker;
}

export function createWorker<Module = unknown>(
  requirePath: string
): Remote<Module> {
  const cached = cache.get(requirePath) || [];
  const worker = new Worker(WORKER_PATH, { workerData: requirePath });
  const api = wrap<Module>(nodeEndpoint(worker));
  cached.push(api);
  cache.set(requirePath, cached);
  return api;
}

export function destroyWorker(requirePath: string): void {
  const cached = cache.get(requirePath);
  if (!cached) {
    return;
  }
  cache.delete(requirePath);
  cached.forEach((api) => api[releaseProxy]());
}

export function destroyAll(): void {
  Array.from(cache.keys()).forEach((requirePath) => destroyWorker(requirePath));
}

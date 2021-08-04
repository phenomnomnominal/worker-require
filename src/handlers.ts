import assert from 'assert';
import { transferHandlers, expose, wrap } from 'comlink';
import nodeEndpoint from 'comlink/dist/umd/node-adapter';
import { MessageChannel, MessagePort } from 'worker_threads';

import { TO_CLONEABLE } from './constants';
import { WorkerRequireCloneableInstance, WorkerRequireFunc } from './types';

export function setHandlers(): void {
  transferHandlers.set('cloneable', {
    canHandle: (val): val is unknown => {
      return !!isCloneable(val);
    },
    serialize: (val: WorkerRequireCloneableInstance) => {
      return [val[TO_CLONEABLE](), []];
    },
    deserialize: (obj) => obj,
  });

  const cloneableHandle = transferHandlers.get('cloneable');
  const proxyHandler = transferHandlers.get('proxy');
  const throwHandler = transferHandlers.get('throw');

  assert(cloneableHandle && proxyHandler && throwHandler);

  transferHandlers.set('proxy', {
    canHandle(val): val is unknown {
      return (
        !throwHandler.canHandle(val) &&
        !cloneableHandle.canHandle(val) &&
        (proxyHandler.canHandle(val) ||
          isFunction(val) ||
          isPromise(val) ||
          hasFunctions(val))
      );
    },
    serialize(val: unknown) {
      const { port1, port2 } = new MessageChannel();
      expose(val, nodeEndpoint(port1));
      return [port2, [(port2 as unknown) as Transferable]];
    },
    deserialize(port: MessagePort) {
      port.start();
      return wrap(nodeEndpoint(port));
    },
  });
}

function isCloneable(val: unknown): val is WorkerRequireCloneableInstance {
  if (val === null) {
    return false;
  }
  const toClonable = (val as WorkerRequireCloneableInstance)?.[TO_CLONEABLE];
  return !!toClonable && isFunction(toClonable);
}

function isFunction(func: unknown): func is WorkerRequireFunc {
  return typeof func === 'function';
}

function isPromise(val: unknown): val is Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  return val != null && Object.is((val as any).constructor, Promise);
}

function hasFunctions(val: unknown): boolean {
  return (
    isObject(val) &&
    Object.getOwnPropertyNames(val).some((name) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const property: unknown = (val as any)[name];
      return isFunction(property) || hasFunctions(property);
    })
  );
}

function isObject(val: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  return val != null && Object.is((val as any).constructor, Object);
}

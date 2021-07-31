import { ok } from 'assert';
import { transferHandlers, expose, wrap } from 'comlink';
import nodeEndpoint from 'comlink/dist/umd/node-adapter';
import { MessageChannel, MessagePort } from 'worker_threads';

import { CloneableInstance, isCloneable, TO_CLONEABLE } from './cloneable';

import { hasFunctions, isFunction, isPromise } from './utils';

export function setHandlers(): void {
  transferHandlers.set('cloneable', {
    canHandle: (val): val is unknown => !!isCloneable(val),
    serialize: (val) => [(val as CloneableInstance)[TO_CLONEABLE](), []],
    deserialize: (obj) => obj,
  });

  const cloneableHandle = transferHandlers.get('cloneable');
  const proxyHandler = transferHandlers.get('proxy');
  const throwHandler = transferHandlers.get('throw');

  ok(cloneableHandle && proxyHandler && throwHandler);

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

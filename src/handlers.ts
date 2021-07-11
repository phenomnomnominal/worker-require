import { ok } from 'assert';
import { transferHandlers, expose, wrap } from 'comlink';
import nodeEndpoint from 'comlink/dist/umd/node-adapter';
import { MessageChannel, MessagePort } from 'worker_threads';
import { TO_CLONEABLE } from './toCloneable';
import { CloneableInstance } from './types';

import { hasFunctions, isCloneable, isFunction, isPromise } from './utils';

export function setHandlers(): void {
  const proxyHandler = transferHandlers.get('proxy');
  const throwHandler = transferHandlers.get('throw');

  ok(proxyHandler && throwHandler);

  transferHandlers.set('cloneable', {
    canHandle: (val): val is unknown => !!isCloneable(val),
    serialize: (val) => [(val as CloneableInstance)[TO_CLONEABLE]?.(), []],
    deserialize: (obj) => obj,
  });

  const cloneableHandle = transferHandlers.get('cloneable');
  ok(cloneableHandle);

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

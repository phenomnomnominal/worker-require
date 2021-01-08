import { ok } from 'assert';
import { transferHandlers, expose, wrap } from 'comlink';
import nodeEndpoint from 'comlink/dist/umd/node-adapter';
import { MessageChannel, MessagePort } from 'worker_threads';

import { Obj } from './types';
import { isFunction, isObject } from './utils';

export function setProxy(): void {
  const proxyHandler = transferHandlers.get('proxy');
  const throwHandler = transferHandlers.get('throw');

  ok(proxyHandler && throwHandler);

  transferHandlers.set('proxy', {
    canHandle(val): val is Obj {
      return (
        !throwHandler.canHandle(val) &&
        (proxyHandler.canHandle(val) || isObject(val) || isFunction(val))
      );
    },
    serialize(val: Obj) {
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

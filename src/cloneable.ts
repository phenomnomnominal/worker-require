import { isFunction } from './utils';

export const TO_CLONEABLE = Symbol('toCloneable');

export function isCloneable(val: unknown): val is CloneableInstance {
  if (val === null) {
    return false;
  }
  const toClonable = (val as CloneableInstance)?.[TO_CLONEABLE];
  return !!toClonable && isFunction(toClonable);
}

export type WorkerModuleCloneable =
  | CloneableValue
  | CloneableObject
  | CloneableInstance;

export type CloneableInstance = {
  [TO_CLONEABLE]: () => WorkerModuleCloneable;
};

type CloneableValue =
  | undefined
  | null
  | number
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Number
  | boolean
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Boolean
  | string
  // eslint-disable-next-line @typescript-eslint/ban-types
  | String
  | Date
  | RegExp
  | ArrayBuffer
  | ArrayBufferView;

interface CloneableObject {
  [index: string]: WorkerModuleCloneable;
}

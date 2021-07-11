import { TO_CLONEABLE } from './toCloneable';
import { CloneableInstance, Func } from './types';

export function isFunction(func: unknown): func is Func {
  return typeof func === 'function';
}

export function isPromise(val: unknown): val is Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  return val != null && Object.is((val as any).constructor, Promise);
}

export function hasFunctions(val: unknown): boolean {
  return (
    isObject(val) &&
    Object.getOwnPropertyNames(val).some((name) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const property: unknown = (val as any)[name];
      return isFunction(property) || hasFunctions(property);
    })
  );
}

export function isCloneable(val: unknown): val is CloneableInstance {
  return val != null && !!(val as CloneableInstance)[TO_CLONEABLE];
}

function isObject(val: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  return val != null && Object.is((val as any).constructor, Object);
}

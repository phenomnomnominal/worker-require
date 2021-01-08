import { Func, FunctionNames, Obj } from './types';

export function isFunction(func: unknown): func is Func {
  return typeof func === 'function';
}

export function isObject(val: unknown): val is Obj {
  return val != null && Object.is((val as Obj).constructor, Object);
}

export function isFunctionName<Module>(
  module: Module,
  name: unknown
): name is FunctionNames<Module> {
  return !!name && isFunction(module[name as FunctionNames<Module>]);
}

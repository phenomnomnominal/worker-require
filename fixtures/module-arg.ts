import { WorkerRequireModule, WorkerRequireModuleAsync } from '../src';

type FibModule = WorkerRequireModule<{
  fibonacci(num: number): number;
}>;

export function fib(
  mod: WorkerRequireModuleAsync<FibModule>,
  a: number
): Promise<number> {
  return mod.fibonacci(a);
}

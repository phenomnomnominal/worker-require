import {
  createWorkerRequire,
  workerRequire,
  WorkerRequireModule,
  WorkerRequireModuleAsync,
  TO_CLONEABLE,
} from '../src/index';

import * as basic from '../fixtures/basic';

jest.setTimeout(1000000);

describe('worker-require', () => {
  it('should wrap functions in a Worker', async () => {
    const { add, destroy, fibonacci } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    const [addResult, fibResult] = await Promise.all([
      add(1, 2),
      fibonacci(40),
    ]);

    expect(addResult).toEqual(3);
    expect(fibResult).toEqual(165580141);

    await destroy();
  });

  it('should let you destroy even if it is not used', async () => {
    const { destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    let thrown: Error | null = null;
    try {
      await destroy();
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).toBe(null);
  });

  it('should work with already default exports', async () => {
    const wait = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/default')>
    >('../dist/fixtures/default');

    const result = await wait.default();

    expect(result).toEqual('done');

    await wait.destroy();
  });

  it('should work with already async stuff', async () => {
    const { wait, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/async')>
    >('../dist/fixtures/async');

    const result = await wait();

    expect(result).toEqual('done');

    await destroy();
  });

  it('should work with arrays', async () => {
    const { array, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    const result = await array([1, 2], 3);

    expect(result).toEqual([1, 2, 3]);

    await destroy();
  });

  it('should work with weird values', async () => {
    const { edgy, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    const result = await edgy(null, undefined, NaN);

    expect(result).toEqual([null, undefined, NaN]);

    await destroy();
  });

  it('should work with instances', async () => {
    const { instance, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/value')>
    >('../dist/fixtures/value');

    const result = await instance.method(3, 4);

    expect(result).toEqual(12);

    await destroy();
  });

  it('should work with objects', async () => {
    const { obj, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/value')>
    >('../dist/fixtures/value');

    const result = await obj.func(3, 4);

    expect(result).toEqual(81);

    await destroy();
  });

  it('should work with async functions', async () => {
    const { obj, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/value')>
    >('../dist/fixtures/value');

    const result = await (async () => {
      await obj.func(1, 2);
      return obj; // Implicit call to `obj.then`
    })();

    expect(result).toEqual(obj);

    await destroy();
  });

  it('should work with TO_CLONEABLE', async () => {
    const { transferFoo, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/value')>
    >('../dist/fixtures/value');

    const result = await transferFoo();

    expect(result.a).toEqual(1000);
    expect(result.b).toEqual('foo');
    // @ts-expect-error check that this isn't a proxy:
    expect(result.c).not.toBeDefined();

    await destroy();
  });

  it('should work with function arguments', async () => {
    const { add, destroy: destroyBasic } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');
    const { callFunction, destroy: destroyFunctions } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/functions')>
    >('../dist/fixtures/functions');

    const result = await callFunction(add);

    expect(result).toEqual(3);

    await destroyBasic();
    await destroyFunctions();
  });

  it('should work with deep function arguments', async () => {
    const { add, destroy: destroyBasic } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');
    const { callFunctionOnObject, destroy: destroyFunctions } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/functions')>
    >('../dist/fixtures/functions');

    const result = await callFunctionOnObject({ add });

    expect(result).toEqual(3);

    await destroyBasic();
    await destroyFunctions();
  });

  it('should handle functions that require other modules', async () => {
    const { doubleFibonacci, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/dependency')>
    >('../dist/fixtures/dependency');

    const result = await doubleFibonacci(40);

    expect(result).toEqual(331160282);

    await destroy();
  });

  it('should handle an invalid require path', () => {
    let thrown: Error | null = null;
    try {
      workerRequire('../fixtures/doesnt-exist');
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).not.toBe(null);
  });

  it('should work when passing a worker modules', async () => {
    const basic = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    const moduleArg = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/module-arg')>
    >('../dist/fixtures/module-arg');

    const fibResult = await moduleArg.fib(basic, 40);

    expect(fibResult).toEqual(165580141);

    await basic.destroy();
    await moduleArg.destroy();
  });

  it('should handle when a worker throw an error', async () => {
    const { throwError, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/error')>
    >('../dist/fixtures/error');

    let thrown: Error | null = null;
    try {
      await throwError();
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).not.toBeNull();

    await destroy();
  });

  const isEnabled = process.env.WORKER_REQUIRE !== 'false';
  const withParallel = isEnabled ? it : it.skip;

  withParallel('actualy makes shit faster', async () => {
    const wr = createWorkerRequire<
      WorkerRequireModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic', { cache: false });

    const worker1 = wr();
    const worker2 = wr();
    const worker3 = wr();
    const worker4 = wr();

    const startSerial = Date.now();
    await Promise.all([
      basic.fibonacci(40),
      basic.fibonacci(40),
      basic.fibonacci(40),
      basic.fibonacci(40),
    ]);
    const serialTime = Date.now() - startSerial;

    const startParallel = Date.now();
    await Promise.all([
      worker1.fibonacci(40),
      worker2.fibonacci(40),
      worker3.fibonacci(40),
      worker4.fibonacci(40),
    ]);
    const parallelTime = Date.now() - startParallel;

    expect(parallelTime * 2).toBeLessThan(serialTime);

    await worker1.destroy();
    await worker2.destroy();
    await worker3.destroy();
    await worker4.destroy();
  });

  it('handles passing a sync or async function type to an async function arg', async () => {
    const { callAsyncFunction, destroy } = workerRequire<
      WorkerRequireModule<typeof import('../fixtures/functions')>
    >('../dist/fixtures/functions');

    const [result1, result2] = await Promise.all([
      callAsyncFunction(() => 1),
      callAsyncFunction(() => Promise.resolve(1)),
    ]);

    expect(result1).toEqual(2);
    expect(result2).toEqual(2);

    await destroy();
  });
});

// Types tests:
type AssertErrorMessage<
  Expected,
  Error extends { errorMessage: Expected }
> = Error;

export type WorkerModuleErrorValue = AssertErrorMessage<
  'Module should not export primitive values',
  WorkerRequireModule<{ value: number }>['value']
>;

export type WorkerModuleErrorNestedValue = AssertErrorMessage<
  'Module should not export primitive values',
  WorkerRequireModule<{ value: { nested: number } }>['value']
>;

export type WorkerModuleErrorFunctionArgFunction = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerRequireModule<{
    functionArgFunction: (a: () => number) => number;
  }>['functionArgFunction']
>;

export type WorkerModuleErrorFunctionArgObject = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerRequireModule<{
    functionArgObject: (a: (b: { c: () => number }) => number) => number;
  }>['functionArgObject']
>;

export type WorkerModuleErrorFunctionArgArray = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerRequireModule<{
    functionArgArray: (a: [() => number]) => number;
  }>['functionArgArray']
>;

export type WorkerModuleErrorFunctionArgSet = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerRequireModule<{
    functionArgSet: (a: Set<() => number>) => number;
  }>['functionArgSet']
>;

export type WorkerModuleErrorFunctionArgMapKey = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerRequireModule<{
    functionArgMapKey: (a: Map<() => number, number>) => number;
  }>['functionArgMapKey']
>;

export type WorkerModuleErrorFunctionArgMapValue = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerRequireModule<{
    functionArgMapValue: (a: Map<number, () => number>) => number;
  }>['functionArgMapValue']
>;

export type WorkerModuleErrorFunctionResultObjectFunctionArg = AssertErrorMessage<
  'Function return value should not contain synchronous functions',
  WorkerRequireModule<{
    functionResultObject: () => Promise<{ a: (b: () => number) => number }>;
  }>['functionResultObject']
>;

type AssertType<Expected, Recieved extends Expected> = Recieved;

export type AllowSyncToAsync = AssertType<
  () => Promise<string>,
  WorkerRequireModuleAsync<{
    init(): string;
  }>['init']
>;

class Cloneable {
  [TO_CLONEABLE](): string {
    return 'cloneable';
  }
}

export type AllowCloneable = AssertType<
  () => Promise<Cloneable>,
  WorkerRequireModuleAsync<{
    init(): Cloneable;
  }>['init']
>;

export type AllowSyncForAsync = AssertType<
  () => string | Promise<string>,
  Parameters<
    WorkerRequireModuleAsync<{
      init(a: () => Promise<string>): string;
    }>['init']
  >[0]
>;

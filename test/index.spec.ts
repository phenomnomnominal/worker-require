import { workerRequire, WorkerModule } from '../src/index';

import * as basic from '../fixtures/basic';

jest.setTimeout(1000000);

describe('worker-require', () => {
  it('should wrap functions in a Worker', async () => {
    const { add, destroy, fibonacci } = workerRequire<
      WorkerModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    const [addResult, fibResult] = await Promise.all([
      add(1, 2),
      fibonacci(40),
    ]);

    expect(addResult).toEqual(3);
    expect(fibResult).toEqual(165580141);

    destroy();
  });

  it('should let you destroy even if it is not used', () => {
    const { destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    let thrown: Error | null = null;
    try {
      destroy();
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).toBe(null);
  });

  it('should work with already async stuff', async () => {
    const { wait, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/async')>
    >('../dist/fixtures/async');

    const result = await wait();

    expect(result).toEqual('done');

    destroy();
  });

  it('should work with arrays', async () => {
    const { array, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    const result = await array([1, 2], 3);

    expect(result).toEqual([1, 2, 3]);

    destroy();
  });

  it('should work with weird values', async () => {
    const { edgy, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');

    const result = await edgy(null, undefined, NaN);

    expect(result).toEqual([null, undefined, NaN]);

    destroy();
  });

  it('should work with instances', async () => {
    const { instance, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/value')>
    >('../dist/fixtures/value');

    const result = await instance.method(3, 4);

    expect(result).toEqual(12);

    destroy();
  });

  it('should work with objects', async () => {
    const { obj, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/value')>
    >('../dist/fixtures/value');

    const result = await obj.func(3, 4);

    expect(result).toEqual(81);

    destroy();
  });

  it('should work with TO_CLONEABLE', async () => {
    const { transferFoo, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/value')>
    >('../dist/fixtures/value');

    const result = await transferFoo();

    expect(result.a).toEqual(1000);
    expect(result.b).toEqual('foo');
    // @ts-expect-error check that this isn't a proxy:
    expect(result.c).not.toBeDefined();

    destroy();
  });

  it('should work with function arguments', async () => {
    const { add, destroy: destroyBasic } = workerRequire<
      WorkerModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');
    const { callFunction, destroy: destroyFunctions } = workerRequire<
      WorkerModule<typeof import('../fixtures/functions')>
    >('../dist/fixtures/functions');

    const result = await callFunction(add);

    expect(result).toEqual(3);

    destroyBasic();
    destroyFunctions();
  });

  it('should work with deep function arguments', async () => {
    const { add, destroy: destroyBasic } = workerRequire<
      WorkerModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic');
    const { callFunctionOnObject, destroy: destroyFunctions } = workerRequire<
      WorkerModule<typeof import('../fixtures/functions')>
    >('../dist/fixtures/functions');

    const result = await callFunctionOnObject({ add });

    expect(result).toEqual(3);

    destroyBasic();
    destroyFunctions();
  });

  it('should handle functions that require other modules', async () => {
    const { doubleFibonacci, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/dependency')>
    >('../dist/fixtures/dependency');

    const result = await doubleFibonacci(40);

    expect(result).toEqual(331160282);

    destroy();
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

  it('should handle when a worker throw an error', async () => {
    const { throwError, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/error')>
    >('../dist/fixtures/error');

    let thrown: Error | null = null;
    try {
      await throwError();
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).not.toBeNull();

    destroy();
  });

  it('actualy makes shit faster', async () => {
    const { destroy, fibonacci } = workerRequire<
      WorkerModule<typeof import('../fixtures/basic')>
    >('../dist/fixtures/basic', { cache: false });

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
      fibonacci(40),
      fibonacci(40),
      fibonacci(40),
      fibonacci(40),
    ]);
    const parallelTime = Date.now() - startParallel;

    expect(parallelTime * 2).toBeLessThan(serialTime);

    destroy();
  });

  it('handles passing a sync or async function type to an async function arg', async () => {
    const { callAsyncFunction, destroy } = workerRequire<
      WorkerModule<typeof import('../fixtures/functions')>
    >('../dist/fixtures/functions');

    const [result1, result2] = await Promise.all([
      callAsyncFunction(() => 1),
      callAsyncFunction(() => Promise.resolve(1)),
    ]);

    expect(result1).toEqual(2);
    expect(result2).toEqual(2);

    destroy();
  });
});

// Types tests:

type AssertErrorMessage<Expected, Error extends { message: Expected }> = Error;

export type WorkerModuleErrorValue = AssertErrorMessage<
  'Module should not export primitive values',
  WorkerModule<{ value: number }>['value']
>;

export type WorkerModuleErrorNestedValue = AssertErrorMessage<
  'Module should not export primitive values',
  WorkerModule<{ value: { nested: number } }>['value']['nested']
>;

export type WorkerModuleErrorFunctionArgFunction = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerModule<{
    functionArgFunction: (a: () => number) => number;
  }>['functionArgFunction']
>;

export type WorkerModuleErrorFunctionArgObject = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerModule<{
    functionArgObject: (a: (b: { c: () => number }) => number) => number;
  }>['functionArgObject']
>;

export type WorkerModuleErrorFunctionArgArray = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerModule<{
    functionArgArray: (a: [() => number]) => number;
  }>['functionArgArray']
>;

export type WorkerModuleErrorFunctionArgSet = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerModule<{
    functionArgSet: (a: Set<() => number>) => number;
  }>['functionArgSet']
>;

export type WorkerModuleErrorFunctionArgMapKey = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerModule<{
    functionArgMapKey: (a: Map<() => number, number>) => number;
  }>['functionArgMapKey']
>;

export type WorkerModuleErrorFunctionArgMapValue = AssertErrorMessage<
  'Function arguments should not contain synchronous functions',
  WorkerModule<{
    functionArgMapValue: (a: Map<number, () => number>) => number;
  }>['functionArgMapValue']
>;

export type WorkerModuleErrorFunctionResultFunction = AssertErrorMessage<
  'Function return value should not contain synchronous functions',
  WorkerModule<{
    functionResultFunction: () => Promise<() => number>;
  }>['functionResultFunction']
>;

export type WorkerModuleErrorFunctionResultObject = AssertErrorMessage<
  'Function return value should not contain synchronous functions',
  WorkerModule<{
    functionResultObject: () => Promise<{ a: () => number }>;
  }>['functionResultObject']
>;

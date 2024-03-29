import { Worker } from 'worker_threads';
import { TO_CLONEABLE } from './constants';

import { Remote } from './vendor/comlink';

// OPTIONS:

export type WorkerRequireOptions = {
  cache: boolean;
};

// HANDLES:

export type WorkerRequireHandle<RemoteType> = {
  remote: Remote<RemoteType>;
  worker: Worker;
};

export type WorkerRequireHandles = Map<
  string,
  Array<WorkerRequireHandle<unknown>>
>;

// UTILS:

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WorkerRequireFunc = (...args: Array<any>) => any;

export type WorkerRequireUnknown<U> = keyof U extends never ? U : never;

// CLONEABLE:

export type WorkerRequireCloneable =
  | WorkerRequireCloneableInstance
  | WorkerRequireCloneableObject
  | WorkerRequireCloneableValue;

export type WorkerRequireCloneableInstance = {
  [TO_CLONEABLE]: () => WorkerRequireCloneable;
};

type WorkerRequireCloneableObject = {
  [index: string]: WorkerRequireCloneable;
};

type WorkerRequireCloneableValue =
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

// ERROR:

export type WorkerRequireError<
  Type,
  Message,
  Details = null
> = Details extends null
  ? {
      errorMessage: Message;
      errorType: Type;
    }
  : {
      errorMessage: Message;
      errorType: Type;
    };

// MODULE VALIDATION:

// A WorkerRequireModule is a Module that where all the functions passed to the Module
// must return a Promise, whether they are arguments, properties, or Array/Set/Map items.
//
// This is important because Comlink will transform all transferred functions from:
//
// `(...args: Array<unknown>) => unknown`
// to
// `(...args: Array<unknown>) => Promise<unknown>`
//
// If the given Module doesn't conform to this, that indicates that is expects a function
// to be synchronous but it will *actually* be async when it gets it!

export type WorkerRequireModule<Module> = {
  [Key in keyof Module]: Module[Key] extends WorkerRequireFunc
    ? WorkerFunction<Module[Key]>
    : Module[Key] extends WorkerRequireCloneable
    ? WorkerRequireError<
        Module[Key],
        'Module should not export primitive values',
        Module
      >
    : WorkerRequireModule<Module[Key]>;
};

export type WorkerFunction<F extends WorkerRequireFunc> = F extends (
  ...args: infer Args
) => infer Return
  ? Args extends WorkerArguments<Args>
    ? Return extends WorkerValue<Return>
      ? F
      : WorkerRequireError<
          F,
          'Function return value should not contain synchronous functions',
          WorkerValue<Return>
        >
    : WorkerRequireError<
        F,
        'Function arguments should not contain synchronous functions',
        WorkerArguments<Args>
      >
  : never;

export type WorkerObject<O, IsArgument = false> = {
  [Key in keyof O]: O[Key] extends WorkerValue<O[Key], IsArgument>
    ? O[Key]
    : WorkerRequireError<
        O,
        'Object properties should not contain synchronous functions',
        WorkerValue<O[Key], IsArgument>
      >;
};

export type WorkerArray<A extends Array<unknown>, IsArgument = false> = {
  [Index in keyof A]: A[Index] extends WorkerValue<A[Index], IsArgument>
    ? A[Index]
    : WorkerRequireError<
        A,
        'Array should not contain synchronous functions',
        WorkerValue<A[Index], IsArgument>
      >;
};

export type WorkerArguments<A extends Array<unknown>> = {
  [Index in keyof A]: A[Index] extends WorkerArgument<A[Index]>
    ? A[Index]
    : WorkerRequireError<
        A,
        'Arguments should not be synchronous functions',
        WorkerArgument<A[Index]>
      >;
};

export type WorkerFunctionArgument<F extends WorkerRequireFunc> = F extends (
  ...args: infer Args
) => infer Return
  ? Args extends WorkerArguments<Args>
    ? Return extends Promise<infer Value>
      ? Value extends WorkerValue<Value>
        ? F
        : WorkerRequireError<
            F,
            'Function return value should not contain synchronous functions',
            WorkerValue<Value>
          >
      : WorkerRequireError<F, 'Function should return a Promise'>
    : WorkerArguments<Args>
  : never;

export type WorkerSet<
  S extends Set<unknown>,
  IsArgument = false
> = S extends Set<infer Item>
  ? Item extends WorkerValue<Item, IsArgument>
    ? S
    : WorkerRequireError<
        S,
        'Set should not contain synchronous functions',
        WorkerValue<Item, IsArgument>
      >
  : never;

export type WorkerMap<
  M extends Map<unknown, unknown>,
  IsArgument = false
> = M extends Map<infer Key, infer Value>
  ? Key extends WorkerValue<Key, IsArgument>
    ? Value extends WorkerValue<Value, IsArgument>
      ? M
      : WorkerRequireError<
          M,
          'Map value should not contain synchronous functions',
          WorkerValue<Value, IsArgument>
        >
    : WorkerRequireError<
        M,
        'Map key should not contain synchronous functions',
        WorkerValue<Key, IsArgument>
      >
  : never;

export type WorkerError<E extends Error> = keyof E extends keyof Error
  ? E
  : WorkerRequireError<
      E,
      `Custom Error type has property that will not be transferred: "${Exclude<
        keyof E & string,
        keyof Error & string
      >}"`
    >;

export type WorkerPromiseValue<
  P extends Promise<unknown>,
  IsArgument = false
> = P extends Promise<infer Value>
  ? Value extends WorkerValue<Value, IsArgument>
    ? Value
    : WorkerRequireError<
        P,
        'Promise value should not contain synchronous functions',
        WorkerValue<Value, IsArgument>
      >
  : never;

export type WorkerArgument<Value> = Value extends WorkerRequireCloneable
  ? Value
  : Value extends Array<unknown>
  ? Value extends WorkerArray<Value, true>
    ? Value
    : WorkerArray<Value, true>
  : Value extends WorkerRequireFunc
  ? Value extends WorkerFunctionArgument<Value>
    ? Value
    : WorkerFunctionArgument<Value>
  : Value extends Set<unknown>
  ? Value extends WorkerSet<Value, true>
    ? Value
    : WorkerSet<Value, true>
  : Value extends Map<unknown, unknown>
  ? Value extends WorkerMap<Value, true>
    ? Value
    : WorkerMap<Value, true>
  : Value extends Promise<unknown>
  ? Value extends Promise<WorkerPromiseValue<Value, true>>
    ? Promise<WorkerPromiseValue<Value>>
    : WorkerPromiseValue<Value, true>
  : Value extends WorkerObject<Value, true>
  ? Value
  : WorkerObject<Value, true>;

export type WorkerValue<Value, IsArgument = false> = IsArgument extends true
  ? WorkerArgument<Value>
  : Value extends WorkerRequireCloneable
  ? Value
  : Value extends Array<unknown>
  ? Value extends WorkerArray<Value>
    ? Value
    : WorkerArray<Value>
  : Value extends WorkerRequireFunc
  ? Value extends WorkerFunction<Value>
    ? Value
    : WorkerFunction<Value>
  : Value extends Set<unknown>
  ? Value extends WorkerSet<Value>
    ? Value
    : WorkerSet<Value>
  : Value extends Map<unknown, unknown>
  ? Value extends WorkerMap<Value>
    ? Value
    : WorkerMap<Value>
  : Value extends Error
  ? Value extends WorkerError<Value>
    ? Value
    : WorkerError<Value>
  : Value extends Promise<unknown>
  ? Value extends Promise<WorkerPromiseValue<Value>>
    ? Promise<WorkerPromiseValue<Value>>
    : WorkerPromiseValue<Value>
  : Value extends WorkerRequireUnknown<Value>
  ? Value
  : Value extends WorkerObject<Value>
  ? Value
  : WorkerObject<Value>;

// MODULE ASYNCIFICATION:

// A WorkerRequireModuleAsync is a WorkerRequireModule that has been wrapped by Comlink, and all
// the WorkerRequireModule's exported properties are all asynchronous:
export type WorkerRequireModuleAsync<Module> = {
  [Key in keyof Module]: Module[Key] extends WorkerRequireFunc
    ? Module[Key] extends WorkerFunction<Module[Key]>
      ? AsyncWorkerModuleFunction<Module[Key]>
      : WorkerFunction<Module[Key]>
    : Module[Key] extends WorkerRequireCloneable
    ? WorkerRequireError<
        Module,
        'Module must be a WorkerRequireModule',
        WorkerRequireModule<Module>
      >
    : WorkerRequireModuleAsync<Module[Key]>;
} & {
  destroy: () => Promise<void>;
};

export type AsyncWorkerModuleFunction<F extends WorkerRequireFunc> = (
  ...args: AsyncWorkerArray<Parameters<F>> extends Array<unknown>
    ? AsyncWorkerArray<Parameters<F>>
    : never
) => ReturnType<F> extends Promise<infer Return>
  ? Promise<AsyncWorkerValue<Return>>
  : Promise<AsyncWorkerValue<ReturnType<F>>>;

export type AsyncWorkerModuleValue<V> = V extends Promise<unknown>
  ? V
  : Promise<V>;

export type AsyncWorkerObject<O> = {
  [Key in keyof O]: AsyncWorkerValue<O[Key]>;
};

export type AsyncWorkerArray<A extends Array<unknown>> = {
  [Index in keyof A]: A[Index] extends AsyncWorkerValue<A[Index]>
    ? AsyncWorkerValue<A[Index]>
    : never;
};

export type AsyncWorkerFunction<F extends WorkerRequireFunc> = (
  ...args: AsyncWorkerArray<Parameters<F>> extends Array<unknown>
    ? AsyncWorkerArray<Parameters<F>>
    : never
) => ReturnType<F> extends Promise<infer Return>
  ? AsyncWorkerValue<Return> | Promise<AsyncWorkerValue<Return>>
  : Promise<AsyncWorkerValue<ReturnType<F>>>;

export type AsyncWorkerSet<S extends Set<unknown>> = S extends Set<infer Item>
  ? Set<AsyncWorkerValue<Item>>
  : never;

export type AsyncWorkerMap<M extends Map<unknown, unknown>> = M extends Map<
  infer Key,
  infer Value
>
  ? Map<AsyncWorkerValue<Key>, AsyncWorkerValue<Value>>
  : never;

export type AsyncWorkerPromise<P extends Promise<unknown>> = P extends Promise<
  infer Value
>
  ? AsyncWorkerValue<Value> | Promise<AsyncWorkerValue<Value>>
  : never;

export type AsyncWorkerUnknown<U> = keyof U extends never
  ? unknown | Promise<unknown>
  : never;

export type AsyncWorkerValue<Value> = Value extends WorkerRequireCloneable
  ? Value
  : Value extends Array<unknown>
  ? AsyncWorkerArray<Value>
  : Value extends WorkerRequireFunc
  ? AsyncWorkerFunction<Value>
  : Value extends Set<unknown>
  ? AsyncWorkerSet<Value>
  : Value extends Map<unknown, unknown>
  ? AsyncWorkerMap<Value>
  : Value extends Promise<unknown>
  ? AsyncWorkerPromise<Value>
  : Value extends WorkerRequireUnknown<Value>
  ? AsyncWorkerUnknown<Value>
  : AsyncWorkerObject<Value>;

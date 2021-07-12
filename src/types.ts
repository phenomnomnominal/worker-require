import { TO_CLONEABLE } from './toCloneable';

export type WorkerRequireOptions = {
  cache: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Func = (...args: Array<any>) => any;

export type CloneableInstance = {
  [TO_CLONEABLE]?: () => WorkerModuleCloneable;
};

export type WorkerModuleError<
  Type,
  Message,
  Details = null
> = Details extends null
  ? {
      message: Message;
      type: Type;
    }
  : {
      message: Message;
      type: Type;
      details: Details;
    };

// A WorkerModule is a Module that where all the functions passed to the Module
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
export type WorkerModule<Module> = {
  [Key in keyof Module]: Module[Key] extends Func
    ? WorkerFunction<Module[Key]>
    : Module[Key] extends CloneableValue
    ? WorkerModuleError<
        Module[Key],
        'Module should not export primitive values',
        Module
      >
    : WorkerModule<Module[Key]>;
};

export type WorkerFunction<F extends Func> = F extends (
  ...args: infer Args
) => infer Return
  ? Args extends WorkerArguments<Args>
    ? Return extends WorkerValue<Return>
      ? F
      : WorkerModuleError<
          F,
          'Function return value should not contain synchronous functions',
          WorkerValue<Return>
        >
    : WorkerModuleError<
        F,
        'Function arguments should not contain synchronous functions',
        WorkerArguments<Args>
      >
  : never;

export type WorkerObject<O, IsArgument = false> = {
  [Key in keyof O]: O[Key] extends WorkerValue<O[Key], IsArgument>
    ? O[Key]
    : WorkerModuleError<
        O,
        'Object properties should not contain synchronous functions',
        WorkerValue<O[Key], IsArgument>
      >;
};

export type WorkerArray<A extends Array<unknown>, IsArgument = false> = {
  [Index in keyof A]: A[Index] extends WorkerValue<A[Index], IsArgument>
    ? A[Index]
    : WorkerModuleError<
        A,
        'Array should not contain synchronous functions',
        WorkerValue<A[Index], IsArgument>
      >;
};

export type WorkerArguments<A extends Array<unknown>> = {
  [Index in keyof A]: A[Index] extends WorkerArgument<A[Index]>
    ? A[Index]
    : WorkerModuleError<
        A,
        'Function arguments should not be synchronous functions',
        WorkerArgument<A[Index]>
      >;
};

export type WorkerFunctionArgument<F extends Func> = F extends (
  ...args: infer Args
) => infer Return
  ? Args extends WorkerArguments<Args>
    ? Return extends Promise<infer Value>
      ? Value extends WorkerValue<Value>
        ? F
        : WorkerModuleError<
            F,
            'Function return value should not contain synchronous functions',
            WorkerValue<Value>
          >
      : WorkerModuleError<F, 'Function should return a Promise'>
    : WorkerArguments<Args>
  : never;

export type WorkerSet<
  S extends Set<unknown>,
  IsArgument = false
> = S extends Set<infer Item>
  ? Item extends WorkerValue<Item, IsArgument>
    ? S
    : WorkerModuleError<
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
      : WorkerModuleError<
          M,
          'Map value should not contain synchronous functions',
          WorkerValue<Value, IsArgument>
        >
    : WorkerModuleError<
        M,
        'Map key should not contain synchronous functions',
        WorkerValue<Key, IsArgument>
      >
  : never;

export type WorkerPromiseValue<
  P extends Promise<unknown>,
  IsArgument = false
> = P extends Promise<infer Value>
  ? Value extends WorkerValue<Value, IsArgument>
    ? Value
    : WorkerModuleError<
        P,
        'Promise value should not contain synchronous functions',
        WorkerValue<Value, IsArgument>
      >
  : never;

export type WorkerArgument<Value> = Value extends WorkerModuleCloneable
  ? Value
  : Value extends Array<unknown>
  ? Value extends WorkerArray<Value, true>
    ? Value
    : WorkerArray<Value, true>
  : Value extends Func
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
  : Value extends WorkerModuleCloneable
  ? Value
  : Value extends Array<unknown>
  ? Value extends WorkerArray<Value>
    ? Value
    : WorkerArray<Value>
  : Value extends Func
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
  : Value extends Promise<unknown>
  ? Value extends Promise<WorkerPromiseValue<Value>>
    ? Promise<WorkerPromiseValue<Value>>
    : WorkerPromiseValue<Value>
  : Value extends WorkerObject<Value>
  ? Value
  : WorkerObject<Value>;

// A AsyncWorkerModule is a WorkerModule that has been wrapped by Comlink, and all
// the WorkerModule's exported properties are all asynchronous:
export type AsyncWorkerModule<Module> = {
  [Key in keyof Module]: Module[Key] extends Func
    ? Module[Key] extends WorkerFunction<Module[Key]>
      ? AsyncWorkerModuleFunction<Module[Key]>
      : WorkerFunction<Module[Key]>
    : Module[Key] extends WorkerModuleCloneable
    ? WorkerModuleError<
        Module,
        'Module must be a WorkerModule',
        WorkerModule<Module>
      >
    : AsyncWorkerModule<Module[Key]>;
} & {
  destroy: () => void;
};

export type AsyncWorkerModuleFunction<F extends Func> = (
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

export type AsyncWorkerFunction<F extends Func> = (
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

export type AsyncWorkerValue<Value> = Value extends WorkerModuleCloneable
  ? Value
  : Value extends Array<unknown>
  ? AsyncWorkerArray<Value>
  : Value extends Func
  ? AsyncWorkerFunction<Value>
  : Value extends Set<unknown>
  ? AsyncWorkerSet<Value>
  : Value extends Map<unknown, unknown>
  ? AsyncWorkerMap<Value>
  : Value extends Promise<unknown>
  ? AsyncWorkerPromise<Value>
  : AsyncWorkerObject<Value>;

export type CloneableValue =
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

export type WorkerModuleCloneable = CloneableValue | CloneableObject;

export interface CloneableObject {
  [index: string]: WorkerModuleCloneable;
}

export type A = Promise<string | number> extends Promise<infer Value>
  ? Value extends string | number
    ? Array<Value>
    : never
  : never;

export type B = Promise<string | number> extends Promise<infer Value>
  ? Value
  : never;
export type C = B extends string | number ? 1 : 0;
export type D = B extends string | number ? Array<B> : 0;

export type PromiseValue<P extends Promise<unknown>> = P extends Promise<
  infer Value
>
  ? Value extends string | number
    ? Value
    : never
  : never;

export type F = Promise<PromiseValue<Promise<string | number>>>;

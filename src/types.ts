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
    ? WorkerModuleFunction<Module[Key]>
    : Module[Key] extends CloneableValue
    ? WorkerModuleError<
        Module[Key],
        'Module should not export primitive values',
        Module
      >
    : WorkerModule<Module[Key]>;
};

export type WorkerModuleFunction<F extends Func> = F extends WorkerFunction<F>
  ? F
  : F extends (...args: infer Args) => infer Return
  ? Args extends WorkerArray<Args>
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
        WorkerArray<Args>
      >
  : never;

// Every property of a WorkerObject must be a WorkerValue:
export type WorkerObject<O> = {
  [Key in keyof O]: O[Key] extends WorkerValue<O[Key]>
    ? O[Key]
    : WorkerModuleError<
        O,
        'Object properties should not contain synchronous functions',
        WorkerValue<O[Key]>
      >;
};

// Every item of a WorkerArray must be a WorkerValue:
export type WorkerArray<A extends Array<unknown>> = {
  [Index in keyof A]: A[Index] extends WorkerValue<A[Index]>
    ? A[Index]
    : WorkerModuleError<
        A,
        'Array should not contain synchronous functions',
        WorkerValue<A[Index]>
      >;
};

// Every argument of a WorkerFunction must be a WorkerValue, and it must return a Promise<WorkerValue>
export type WorkerFunction<F extends Func> = F extends (
  ...args: infer Args
) => infer Return
  ? Args extends WorkerArray<Args>
    ? Return extends Promise<infer Value>
      ? Value extends WorkerValue<Value>
        ? F
        : WorkerModuleError<
            F,
            'Function return value should not contain synchronous functions',
            WorkerValue<Value>
          >
      : WorkerModuleError<F, 'Function should return a Promise'>
    : WorkerModuleError<
        F,
        'Function arguments should not contain synchronous functions',
        WorkerArray<Args>
      >
  : never;

// Every item of a WorkerSet must be a WorkerValue:
export type WorkerSet<S extends Set<unknown>> = S extends Set<infer Item>
  ? Item extends WorkerValue<Item>
    ? S
    : WorkerModuleError<
        S,
        'Set should not contain synchronous functions',
        WorkerValue<Item>
      >
  : never;

// Every key and value of a WorkerMap must be a WorkerValue:
export type WorkerMap<M extends Map<unknown, unknown>> = M extends Map<
  infer Key,
  infer Value
>
  ? Key extends WorkerValue<Key>
    ? Value extends WorkerValue<Value>
      ? M
      : WorkerModuleError<
          M,
          'Map value should not contain synchronous functions',
          WorkerValue<Value>
        >
    : WorkerModuleError<
        M,
        'Map key should not contain synchronous functions',
        WorkerValue<Key>
      >
  : never;

// The resolved value of a WorkerPromise must be a WorkerValue:
export type WorkerPromise<P extends Promise<unknown>> = P extends Promise<
  infer Value
>
  ? Value extends WorkerValue<Value>
    ? P
    : WorkerModuleError<
        P,
        'Promise value should not contain synchronous functions',
        WorkerValue<Value>
      >
  : never;

// A value is a WorkerValue if it is an WorkerObject,
// WorkerArray, WorkerFunc, WorkerSet, WorkerMap, Promise
// or just a value (boolean/string/number/Date/RegExp/etc):
export type WorkerValue<Value> = Value extends WorkerModuleCloneable
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
  ? Value extends WorkerPromise<Value>
    ? Value
    : WorkerPromise<Value>
  : Value extends WorkerObject<Value>
  ? Value
  : WorkerObject<Value>;

// A AsyncWorkerModule is a WorkerModule that has been wrapped by Comlink, and all
// the WorkerModule's exported properties are all asynchronous:
export type AsyncWorkerModule<Module> = {
  [Key in keyof Module]: Module[Key] extends Func
    ? Module[Key] extends WorkerModuleFunction<Module[Key]>
      ? AsyncWorkerModuleFunction<Module[Key]>
      : WorkerModuleFunction<Module[Key]>
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
  ? Promise<Return>
  : Promise<ReturnType<F>>;

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
) => AsyncWorkerValue<ReturnType<F>>;

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

import { TO_CLONEABLE } from '../src';

class Class {
  public method(c: number, d: number): number {
    return c * d;
  }
}

export const instance = new Class();

export const obj = {
  func(e: number, f: number): number {
    return e ** f;
  },
};

type FooData = {
  a: number;
  b: string;
};

class Foo implements FooData {
  public a = 1000;
  public b = 'foo';

  public method(): string {
    return 'boop';
  }

  public [TO_CLONEABLE](): FooData {
    return {
      a: this.a,
      b: this.b,
    };
  }
}

export function transferFoo(): FooData {
  return new Foo();
}

export function fibonacci(num: number): number {
  if (num <= 1) return 1;
  return fibonacci(num - 1) + fibonacci(num - 2);
}

export function add(a: number, b: number): number {
  return a + b;
}

export function array(a: Array<number>, b: number): Array<number> {
  return [...a, b];
}

export function edgy(
  a: null,
  b: undefined,
  c = NaN
): [null, undefined, number] {
  return [a, b, c];
}

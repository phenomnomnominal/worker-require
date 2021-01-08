export function callFunction(
  handler: (a: number, b: number) => Promise<number>
): Promise<number> {
  return handler(1, 2);
}

export function callFunctionOnObject(object: {
  add: (a: number, b: number) => Promise<number>;
}): Promise<number> {
  return object.add(1, 2);
}

export async function callAsyncFunction(
  value: () => Promise<number>
): Promise<number> {
  return (await value()) + (await value());
}

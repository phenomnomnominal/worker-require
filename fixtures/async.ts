export async function wait(): Promise<string> {
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
  return 'done';
}

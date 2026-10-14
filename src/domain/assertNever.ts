/** Exhaustiveness check: adding a union member without handling it fails compilation. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

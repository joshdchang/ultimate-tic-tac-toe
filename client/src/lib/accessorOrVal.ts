import { Accessor } from "solid-js";

export type AccessorOrVal<T> = T | Accessor<T>;

export function accessorOrVal<T>(val: AccessorOrVal<T>): T {
  // @ts-ignore
  return typeof val === "function" ? val() : val;
}

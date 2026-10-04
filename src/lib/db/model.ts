import { models } from "mongoose";

export function getModel<T = any>(name: string, factory: () => any): any {
  return models[name] ?? factory();
}

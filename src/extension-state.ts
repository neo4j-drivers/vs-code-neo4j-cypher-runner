import { Environment } from "./config";
import { QueryExecutor } from "./query-executor";
import ResultProvider from "./result-provider";


interface Supplier<T> {
  (): Promise<T> | T
}

interface Consumer<T> {
  (value: T): Promise<void> | void
}

interface ExtensionStateShape {
  readonly environment: Environment
  readonly queryExecutor: QueryExecutor
  readonly documentScheme: string
  readonly resultProvider: ResultProvider
}

export class ExtensionState implements ExtensionStateShape {
  readonly #map: Map<string, unknown>;

  constructor(initialValues: Partial<ExtensionStateShape>) {
    this.#map = new Map();

    for (const [k, v] of Object.entries(initialValues)) {
      this.#map.set(k, v);
    }
  }

  get environment(): Environment {
    return this.get('environment');
  }

  get queryExecutor(): QueryExecutor {
    return this.get('queryExecutor');
  }

  get documentScheme(): string {
    return this.get('documentScheme');
  }

  get resultProvider(): ResultProvider {
    return this.get('resultProvider');
  }

  async getOrPutIfAbsent<
    K extends keyof ExtensionStateShape = keyof ExtensionStateShape,
    V extends ExtensionStateShape[K] = ExtensionStateShape[K]
  >(key: K, supplier: Supplier<V>): Promise<V> {
    const value: V | undefined = this.#map.get(key) as V | undefined;

    if (value !== undefined) {
      return value;
    }

    const newValue = await supplier();
    this.#map.set(key, newValue);
    return newValue;
  }

  get<
    K extends keyof ExtensionStateShape = keyof ExtensionStateShape,
    V extends ExtensionStateShape[K] = ExtensionStateShape[K]
  >(key: K): V {
    const value: V | undefined = this.#map.get(key) as V | undefined;

    if (value === undefined) {
      throw new Error(`Value for '${key}' not found in the context`);
    }

    return value;
  }

  async apply<
    K extends keyof ExtensionStateShape = keyof ExtensionStateShape,
    V extends ExtensionStateShape[K] = ExtensionStateShape[K]
  >(key: K, consumer: Consumer<V>): Promise<void> {
    const value: V | undefined = this.#map.get(key) as V | undefined;

    if (value !== undefined) {
      await consumer(value);
    }
  }

  set<
    K extends keyof ExtensionStateShape = keyof ExtensionStateShape,
    V extends ExtensionStateShape[K] = ExtensionStateShape[K]
  >(key: K, value: V): void {
    this.#map.set(key, value);
  }
}

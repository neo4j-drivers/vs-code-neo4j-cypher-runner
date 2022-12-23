import neo4j, { auth, AuthToken, Driver } from 'neo4j-driver';

interface ExecuteInput {
  url: string
  authToken: AuthToken
  database?: string
  query: string
  parameters?: Record<string, any>
}

interface ExecuteOutput {
  summary: object
  records: object[]
}

export class QueryExecutor {
  #driver?: Driver;
  #lastInput?: ExecuteInput;

  constructor() {
    this.#driver = undefined;
  }

  async execute(input: ExecuteInput): Promise<ExecuteOutput> {
    const driver = await this.#fetchDriver(input);
    const session = driver.session({ database: input.database });

    try {
      return await session.writeTransaction(async tx => {
        const result = await tx.run(input.query, input.parameters);
        const records = result.records.map(x => x.toObject());
        const { updateStatistics, ...summary } = result.summary;
        return { summary, records };
      });
    } finally {
      session.close();
    }
  }

  async close(): Promise<void> {
    try {
      await this.#driver?.close();
    } finally {
      this.#driver = undefined;
      this.#lastInput = undefined;
    }
  }

  async #fetchDriver(input: ExecuteInput): Promise<Driver> {
    const lastInput = this.#lastInput;
    this.#lastInput = input;

    if (this.#driver
      && input.url === lastInput?.url
      && input.authToken.credentials === lastInput?.authToken.credentials
      && input.authToken.principal === lastInput?.authToken.principal
      && input.authToken.realm === lastInput?.authToken.realm
      && input.authToken.scheme === lastInput?.authToken.scheme) {
      return this.#driver;
    } else if (this.#driver) {
      await this.#driver.close();
    }

    this.#driver = neo4j.driver(input.url, input.authToken, {
      disableLosslessIntegers: true
    });

    return this.#driver;
  }
}

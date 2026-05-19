import pg from 'pg'

export type Db = {
  query<T extends pg.QueryResultRow = any>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>>
  end(): Promise<void>
}

export function createDb(databaseUrl: string): Db {
  const pool = new pg.Pool({ connectionString: databaseUrl })

  return {
    query(text, params) {
      return pool.query(text, params)
    },
    end() {
      return pool.end()
    },
  }
}

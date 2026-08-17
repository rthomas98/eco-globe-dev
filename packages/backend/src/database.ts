import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export type DatabaseHealth = {
  configured: boolean;
  connected: boolean;
  error?: string;
};

export type SchemaTable = {
  schemaName: string;
  tableName: string;
  rowCount: number;
};

export type QueryParameter = {
  name: string;
  type: sql.ISqlTypeFactoryWithNoParams | sql.ISqlType;
  value: unknown;
};

const connectionString =
  process.env.AZURE_SQL_CONNECTION_STRING ?? process.env.SQL_CONNECTION_STRING;

let poolPromise: Promise<sql.ConnectionPool> | undefined;

export function isDatabaseConfigured() {
  return Boolean(connectionString);
}

async function getPool() {
  if (!connectionString) {
    throw new Error("Azure SQL connection string is not configured.");
  }

  poolPromise ??= sql.connect(connectionString);
  return poolPromise;
}

export async function queryRows<T extends Record<string, unknown>>(query: string) {
  const pool = await getPool();
  const result = await pool.request().query(query);
  return result.recordset as T[];
}

export async function queryRowsWithParams<T extends Record<string, unknown>>(
  query: string,
  parameters: QueryParameter[] = [],
) {
  const pool = await getPool();
  const request = pool.request();

  for (const parameter of parameters) {
    request.input(parameter.name, parameter.type, parameter.value);
  }

  const result = await request.query(query);
  return result.recordset as T[];
}

export async function queryRowsWithParamsInTransaction<T extends Record<string, unknown>>(
  transaction: sql.Transaction,
  query: string,
  parameters: QueryParameter[] = [],
) {
  const request = transaction.request();

  for (const parameter of parameters) {
    request.input(parameter.name, parameter.type, parameter.value);
  }

  const result = await request.query(query);
  return result.recordset as T[];
}

export async function runInTransaction<T>(work: (transaction: sql.Transaction) => Promise<T>) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export { sql };

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
    };
  }

  try {
    await queryRows<{ ok: number }>("SELECT 1 AS ok;");

    return {
      configured: true,
      connected: true,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}

export async function getSchemaTables() {
  return queryRows<SchemaTable>(`
    SELECT
      s.name AS schemaName,
      t.name AS tableName,
      CONVERT(INT, SUM(p.rows)) AS [rowCount]
    FROM sys.tables t
    INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
    INNER JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
    WHERE t.is_ms_shipped = 0
    GROUP BY s.name, t.name
    ORDER BY s.name, t.name;
  `);
}

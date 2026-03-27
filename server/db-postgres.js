import pg from 'pg';

const { Pool } = pg;

const camelToSnake = (s) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const snakeToCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const mapRowKeysToCamel = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
};

const mapParams = (params) => params;

const convertPlaceholders = (sql) => {
  let i = 0;
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;

  for (let p = 0; p < sql.length; p++) {
    const ch = sql[p];
    const next = p + 1 < sql.length ? sql[p + 1] : '';

    if (inLineComment) {
      out += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (!inSingle && !inDouble && ch === '-' && next === '-') {
      out += ch + next;
      p++;
      inLineComment = true;
      continue;
    }

    if (!inDouble && ch === "'" && !inLineComment) {
      inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (!inSingle && ch === '"' && !inLineComment) {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    if (!inSingle && !inDouble && ch === '?') {
      i += 1;
      out += `$${i}`;
      continue;
    }

    out += ch;
  }

  return out;
};

const convertIdentifiers = (sql) => {
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;

  const isIdentStart = (c) => /[A-Za-z_]/.test(c);
  const isIdent = (c) => /[A-Za-z0-9_]/.test(c);
  const isAllUpper = (token) => /^[A-Z0-9_]+$/.test(token);

  for (let p = 0; p < sql.length; p++) {
    const ch = sql[p];
    const next = p + 1 < sql.length ? sql[p + 1] : '';

    if (inLineComment) {
      out += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (!inSingle && !inDouble && ch === '-' && next === '-') {
      out += ch + next;
      p++;
      inLineComment = true;
      continue;
    }

    if (!inDouble && ch === "'" && !inLineComment) {
      inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (!inSingle && ch === '"' && !inLineComment) {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    if (!inSingle && !inDouble && isIdentStart(ch)) {
      let j = p;
      while (j < sql.length && isIdent(sql[j])) j++;
      const token = sql.slice(p, j);
      const shouldConvert = /[a-z]/.test(token) && /[A-Z]/.test(token) && !isAllUpper(token);
      out += shouldConvert ? camelToSnake(token) : token;
      p = j - 1;
      continue;
    }

    out += ch;
  }

  return out;
};

const convertSqliteToPostgres = (sqliteSql) => {
  const trimmed = sqliteSql.trim();
  if (/^PRAGMA\b/i.test(trimmed)) {
    return { sql: 'SELECT 1', params: [] };
  }
  const withoutPlaceholders = convertPlaceholders(sqliteSql);
  const withConvertedIdentifiers = convertIdentifiers(withoutPlaceholders);
  return { sql: withConvertedIdentifiers, params: null };
};

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://symicrm:postgres@localhost:5432/symicrm';

const pool = new Pool({ connectionString: DATABASE_URL });

const createApi = (runner) => ({
  prepare: (sqliteSql) => ({
    all: async (...params) => {
      const { sql } = convertSqliteToPostgres(sqliteSql);
      const r = await runner(sql, mapParams(params));
      return r.rows.map(mapRowKeysToCamel);
    },
    get: async (...params) => {
      const { sql } = convertSqliteToPostgres(sqliteSql);
      const r = await runner(sql, mapParams(params));
      return r.rows.length ? mapRowKeysToCamel(r.rows[0]) : undefined;
    },
    run: async (...params) => {
      const { sql } = convertSqliteToPostgres(sqliteSql);
      const r = await runner(sql, mapParams(params));
      return { changes: typeof r.rowCount === 'number' ? r.rowCount : 0 };
    },
  }),
  transaction: (fn) => async (...args) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txApi = createApi((text, params) => client.query(text, params));
      const result = await fn(txApi, ...args);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }
  },
});

const db = createApi((text, params) => pool.query(text, params));

export { pool };
export default db;


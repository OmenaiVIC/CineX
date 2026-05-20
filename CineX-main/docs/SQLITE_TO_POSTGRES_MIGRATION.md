# SQLite → PostgreSQL Migration Guide

When CineX outgrows SQLite (concurrent writes, multi-process, production scale), migrate to PostgreSQL.

## Prerequisites

```bash
npm install pg knex
```

## Changes Required

### 1. `backend/package.json`

```json
{
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "pg": "^8.13.0",
    "knex": "^3.1.0"
  }
}
```

### 2. `backend/src/database.js` — Replace with Knex

```js
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgres://localhost:5432/cinex',
  pool: { min: 2, max: 10 },
});

export function getDb() {
  return db;
}
```

### 3. Schema Mapping

| SQLite Type  | PostgreSQL Type    | Notes                          |
|-------------|--------------------|--------------------------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | Auto-ID                        |
| `TEXT`      | `TEXT`             | Same                           |
| `INTEGER` (unix timestamp) | `INTEGER` or `TIMESTAMPTZ` | Optional: use `TIMESTAMPTZ WITH DEFAULT NOW()` |
| `TEXT DEFAULT '[]'` | `JSONB DEFAULT '[]'::jsonb` | Enables JSON queries |
| `CHECK(score >= 1 AND score <= 5)` | Same | Same SQL syntax |
| `ON CONFLICT(address) DO UPDATE SET` | Same | Same SQL syntax |
| `unixepoch()` | `EXTRACT(EPOCH FROM NOW())` | SQLite-specific function |
| `COALESCE(excluded.x, x)` | Same | Same SQL syntax |

### 4. Query Adjustments

- **Raw queries** — Knex wraps them; raw SQL strings passed to `db.raw()`.
- **`last_insert_rowid()`** → Use `RETURNING id` in INSERT statements:
  ```js
  const [row] = await db('ratings').insert({ ... }).returning('*');
  ```
- **`JSON.parse(media_urls)`** — PostgreSQL returns parsed JSON automatically for JSONB columns. Remove the `JSON.parse()` calls.

### 5. Migration Script

```bash
knex migrate:make initial_schema
knex migrate:latest
```

Example migration (`migrations/20250101_initial.js`):

```js
export function up(knex) {
  return knex.schema
    .createTable('profiles', (t) => {
      t.text('address').primary();
      t.text('username').unique();
      t.text('bio');
      t.text('avatar_url');
      t.text('social_twitter');
      t.text('social_instagram');
      t.text('social_website');
      t.text('verification_level').defaultTo('unverified');
      t.timestamps(true, true);
    })
    .createTable('portfolio_items', (t) => {
      t.serial('id').primary();
      t.text('address').notNullable().references('address').inTable('profiles').onDelete('CASCADE');
      t.text('title').notNullable();
      t.text('description');
      t.text('category');
      t.text('role');
      t.integer('year');
      t.jsonb('media_urls').defaultTo('[]');
      t.jsonb('awards').defaultTo('[]');
      t.timestamps(true, true);
    })
    .createTable('ratings', (t) => {
      t.serial('id').primary();
      t.text('rater_address').notNullable();
      t.text('target_address').notNullable().references('address').inTable('profiles').onDelete('CASCADE');
      t.integer('score').notNullable().checkBetween([1, 5]);
      t.text('comment');
      t.text('comment_hash');
      t.text('tx_id');
      t.text('project_id');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.unique(['rater_address', 'target_address', 'project_id']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTable('ratings')
    .dropTable('portfolio_items')
    .dropTable('profiles');
}
```

### 6. Startup Flag

Remove `--experimental-sqlite` from `package.json` scripts:

```json
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  }
}
```

Set environment variable:

```bash
export DATABASE_URL="postgres://user:password@localhost:5432/cinex"
```

## When to Migrate

- Daily active users exceed ~100 concurrent
- Backend needs to run as multiple processes (horizontal scaling)
- Need JSON queries on `portfolio_items`
- Need full-text search on profiles/bios
- Production deployment with high availability requirements

Until then, SQLite with WAL mode handles thousands of users fine for an MVP.

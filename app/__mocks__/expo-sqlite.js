/**
 * Mock expo-sqlite pour Jest.
 * Utilise better-sqlite3 (synchrone) et enveloppe les appels dans des Promises
 * pour satisfaire l'API async de SQLiteDatabase (expo-sqlite).
 */
const Database = require('better-sqlite3');

class MockSQLiteDatabase {
  constructor(name) {
    // :memory: => base en mémoire pure, parfaite pour les tests
    this._db = new Database(name === ':memory:' ? ':memory:' : name);
    this.databasePath = name;
  }

  async execAsync(sql) {
    this._db.exec(sql);
  }

  async runAsync(sql, params = []) {
    const stmt = this._db.prepare(sql);
    const info = stmt.run(...params);
    return { lastInsertRowId: info.lastInsertRowid, changes: info.changes };
  }

  async getFirstAsync(sql, params = []) {
    const stmt = this._db.prepare(sql);
    return stmt.get(...params) ?? null;
  }

  async getAllAsync(sql, params = []) {
    const stmt = this._db.prepare(sql);
    return stmt.all(...params);
  }

  async withTransactionAsync(task) {
    // better-sqlite3 ne supporte pas les transactions async.
    // En test, on exécute le task directement (pas de rollback auto, suffisant pour les tests).
    this._db.exec('BEGIN');
    try {
      await task();
      this._db.exec('COMMIT');
    } catch (e) {
      this._db.exec('ROLLBACK');
      throw e;
    }
  }

  async closeAsync() {
    this._db.close();
  }
}

function openDatabaseSync(name) {
  return new MockSQLiteDatabase(name);
}

module.exports = { openDatabaseSync };

import db from '../config/db.config';
import * as bcrypt from 'bcryptjs';

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT,
    lastName TEXT,
    phone TEXT,
    state TEXT,
    fbId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

export class User {
  id?: number;
  email?: string;
  password?: string;
  firstName: string | null = null;
  lastName: string | null = null;
  phone: string | null = null;
  state: string | null = null;
  fbId: string | null = null;

  constructor(data: Partial<User>) {
    Object.assign(this, data);
  }

  static async findByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row ? new User(row) : null);
      });
    });
  }

  async save(): Promise<number> {
    if (this.id) {
      // Implemente um método de atualização se necessário
      throw new Error("Update method not implemented");
    } else {
      const { email, firstName, lastName, phone, state, fbId, password } = this;

      // Criptografar a senha
      const hashedPassword = await bcrypt.hash(password!, 10);

      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (email, firstName, lastName, phone, state, fbId, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [email, firstName, lastName, phone, state, fbId, hashedPassword],
          function (this: any, err: Error) {
            if (err) reject(err);
            resolve(this.lastID);
          }
        );
      });
    }
  }
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'prayaspro_super_secret_jwt_key_pesu_dbms_level_3_2026';
const SALT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
  college: string;
}

export async function hashPassword(plainText: string): Promise<string> {
  return await bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  college: string;
  department: string;
  role?: 'STUDENT' | 'ADMIN';
}) {
  const { name, email, password, college, department, role = 'STUDENT' } = params;

  // Check email uniqueness
  const existing = await query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error(`Email '${email}' is already registered.`);
  }

  const passwordHash = await hashPassword(password);

  const res = await query(
    `INSERT INTO users (name, email, password_hash, college, department, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id, name, email, college, department, role, created_at, is_active`,
    [name, email.toLowerCase(), passwordHash, college, department, role]
  );

  const user = res.rows[0];
  const token = generateToken({
    userId: user.user_id,
    email: user.email,
    name: user.name,
    role: user.role,
    college: user.college
  });

  return { user, token };
}

export async function loginUser(email: string, plainTextPassword: string) {
  const res = await query(
    `SELECT user_id, name, email, password_hash, college, department, role, is_active
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  if (res.rowCount === 0) {
    throw new Error('Invalid email or password.');
  }

  const user = res.rows[0];
  if (!user.is_active) {
    throw new Error('Account is disabled. Please contact administrator.');
  }

  const isMatch = await comparePassword(plainTextPassword, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  const token = generateToken({
    userId: user.user_id,
    email: user.email,
    name: user.name,
    role: user.role,
    college: user.college
  });

  delete user.password_hash;
  return { user, token };
}

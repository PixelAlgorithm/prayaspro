"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = require("../db/connection");
const JWT_SECRET = process.env.JWT_SECRET || 'prayaspro_super_secret_jwt_key_pesu_dbms_level_3_2026';
const SALT_ROUNDS = 10;
async function hashPassword(plainText) {
    return await bcryptjs_1.default.hash(plainText, SALT_ROUNDS);
}
async function comparePassword(plainText, hash) {
    return await bcryptjs_1.default.compare(plainText, hash);
}
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (err) {
        return null;
    }
}
async function registerUser(params) {
    const { name, email, password, college, department, role = 'STUDENT' } = params;
    // Check email uniqueness
    const existing = await (0, connection_1.query)('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
        throw new Error(`Email '${email}' is already registered.`);
    }
    const passwordHash = await hashPassword(password);
    const res = await (0, connection_1.query)(`INSERT INTO users (name, email, password_hash, college, department, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id, name, email, college, department, role, created_at, is_active`, [name, email.toLowerCase(), passwordHash, college, department, role]);
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
async function loginUser(email, plainTextPassword) {
    const res = await (0, connection_1.query)(`SELECT user_id, name, email, password_hash, college, department, role, is_active
     FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
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

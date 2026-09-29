"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.listSkills = listSkills;
exports.createSkill = createSkill;
const connection_1 = require("../db/connection");
async function listCategories() {
    const res = await (0, connection_1.query)(`SELECT * FROM categories ORDER BY category_name ASC`);
    return res.rows;
}
async function listSkills(categoryId) {
    let sql = `SELECT * FROM skills`;
    const params = [];
    if (categoryId) {
        sql += ` WHERE category = $1`;
        params.push(categoryId);
    }
    sql += ` ORDER BY skill_name ASC`;
    const res = await (0, connection_1.query)(sql, params);
    return res.rows;
}
async function createSkill(skillName, category, description) {
    const res = await (0, connection_1.query)(`INSERT INTO skills (skill_name, category, description)
     VALUES ($1, $2, $3)
     RETURNING *`, [skillName, category, description || null]);
    return res.rows[0];
}

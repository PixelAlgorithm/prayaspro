import { query } from '../db/connection';

export async function listCategories() {
  const res = await query(`SELECT * FROM categories ORDER BY category_name ASC`);
  return res.rows;
}

export async function listSkills(categoryId?: string) {
  let sql = `SELECT * FROM skills`;
  const params: any[] = [];
  if (categoryId) {
    sql += ` WHERE category = $1`;
    params.push(categoryId);
  }
  sql += ` ORDER BY skill_name ASC`;
  const res = await query(sql, params);
  return res.rows;
}

export async function createSkill(skillName: string, category: string, description?: string) {
  const res = await query(
    `INSERT INTO skills (skill_name, category, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [skillName, category, description || null]
  );
  return res.rows[0];
}

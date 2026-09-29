import { query } from '../db/connection';
import { upsertEmbedding } from './vectorService';

export async function getUserById(userId: string) {
  const res = await query(
    `SELECT user_id, name, email, college, department, role, created_at, is_active
     FROM users WHERE user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

export async function getUserProfileWithStats(userId: string) {
  const userRes = await query(
    `SELECT * FROM view_student_performance WHERE user_id = $1`,
    [userId]
  );
  
  const user = userRes.rows[0];
  if (!user) {
    return await getUserById(userId);
  }

  // Fetch skills
  const skillsRes = await query(
    `SELECT ss.student_skill_id, ss.skill_id, s.skill_name, s.category, ss.proficiency_level, ss.years_experience
     FROM student_skills ss
     JOIN skills s ON ss.skill_id = s.skill_id
     WHERE ss.user_id = $1
     ORDER BY s.skill_name ASC`,
    [userId]
  );

  return {
    ...user,
    skills: skillsRes.rows
  };
}

export async function addStudentSkill(
  userId: string,
  skillId: string,
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT',
  yearsExperience: number
) {
  const res = await query(
    `INSERT INTO student_skills (user_id, skill_id, proficiency_level, years_experience)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, skill_id)
     DO UPDATE SET 
       proficiency_level = EXCLUDED.proficiency_level,
       years_experience = EXCLUDED.years_experience
     RETURNING *`,
    [userId, skillId, proficiencyLevel, yearsExperience]
  );

  // Re-generate and update student vector embedding
  await refreshStudentEmbedding(userId);

  return res.rows[0];
}

export async function removeStudentSkill(userId: string, skillId: string) {
  await query(
    `DELETE FROM student_skills WHERE user_id = $1 AND skill_id = $2`,
    [userId, skillId]
  );
  await refreshStudentEmbedding(userId);
}

export async function refreshStudentEmbedding(userId: string) {
  const profile = await getUserProfileWithStats(userId);
  if (!profile) return;

  const skillsText = (profile.skills || [])
    .map((s: any) => `${s.skill_name} (${s.category}) level:${s.proficiency_level} exp:${s.years_experience}yrs`)
    .join(', ');

  const contentText = `Student: ${profile.name}. Department: ${profile.department}. College: ${profile.college}. Skills: ${skillsText}. Completed Tasks: ${profile.completed_assignments || 0}. Rating: ${profile.average_rating || 5.0}.`;

  await upsertEmbedding('STUDENT', userId, contentText);
}

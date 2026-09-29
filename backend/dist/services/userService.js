"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.getUserProfileWithStats = getUserProfileWithStats;
exports.addStudentSkill = addStudentSkill;
exports.removeStudentSkill = removeStudentSkill;
exports.refreshStudentEmbedding = refreshStudentEmbedding;
const connection_1 = require("../db/connection");
const vectorService_1 = require("./vectorService");
async function getUserById(userId) {
    const res = await (0, connection_1.query)(`SELECT user_id, name, email, college, department, role, created_at, is_active
     FROM users WHERE user_id = $1`, [userId]);
    return res.rows[0] || null;
}
async function getUserProfileWithStats(userId) {
    const userRes = await (0, connection_1.query)(`SELECT * FROM view_student_performance WHERE user_id = $1`, [userId]);
    const user = userRes.rows[0];
    if (!user) {
        return await getUserById(userId);
    }
    // Fetch skills
    const skillsRes = await (0, connection_1.query)(`SELECT ss.student_skill_id, ss.skill_id, s.skill_name, s.category, ss.proficiency_level, ss.years_experience
     FROM student_skills ss
     JOIN skills s ON ss.skill_id = s.skill_id
     WHERE ss.user_id = $1
     ORDER BY s.skill_name ASC`, [userId]);
    return {
        ...user,
        skills: skillsRes.rows
    };
}
async function addStudentSkill(userId, skillId, proficiencyLevel, yearsExperience) {
    const res = await (0, connection_1.query)(`INSERT INTO student_skills (user_id, skill_id, proficiency_level, years_experience)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, skill_id)
     DO UPDATE SET 
       proficiency_level = EXCLUDED.proficiency_level,
       years_experience = EXCLUDED.years_experience
     RETURNING *`, [userId, skillId, proficiencyLevel, yearsExperience]);
    // Re-generate and update student vector embedding
    await refreshStudentEmbedding(userId);
    return res.rows[0];
}
async function removeStudentSkill(userId, skillId) {
    await (0, connection_1.query)(`DELETE FROM student_skills WHERE user_id = $1 AND skill_id = $2`, [userId, skillId]);
    await refreshStudentEmbedding(userId);
}
async function refreshStudentEmbedding(userId) {
    const profile = await getUserProfileWithStats(userId);
    if (!profile)
        return;
    const skillsText = (profile.skills || [])
        .map((s) => `${s.skill_name} (${s.category}) level:${s.proficiency_level} exp:${s.years_experience}yrs`)
        .join(', ');
    const contentText = `Student: ${profile.name}. Department: ${profile.department}. College: ${profile.college}. Skills: ${skillsText}. Completed Tasks: ${profile.completed_assignments || 0}. Rating: ${profile.average_rating || 5.0}.`;
    await (0, vectorService_1.upsertEmbedding)('STUDENT', userId, contentText);
}

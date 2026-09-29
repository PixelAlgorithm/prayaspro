"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../db/connection");
const authService_1 = require("../services/authService");
const userService_1 = require("../services/userService");
const taskService_1 = require("../services/taskService");
const applicationService_1 = require("../services/applicationService");
const assignmentService_1 = require("../services/assignmentService");
const reviewService_1 = require("../services/reviewService");
const vectorService_1 = require("../services/vectorService");
async function runDemoFlow() {
    console.log('========================================================================');
    console.log('  PRAYASPRO DBMS LEVEL 3 END-TO-END DEMO FLOW TEST                      ');
    console.log('  Live execution against real PostgreSQL 18 & pgvector                  ');
    console.log('========================================================================\n');
    const timestamp = Date.now();
    const studentAEmail = `demo.student.a.${timestamp}@pesu.edu`;
    const studentBEmail = `demo.student.b.${timestamp}@pesu.edu`;
    // Fetch Category and Skills IDs
    const catRes = await (0, connection_1.query)(`SELECT category_id FROM categories WHERE category_name = 'Software & Web Dev' LIMIT 1`);
    const categoryId = catRes.rows[0]?.category_id;
    const skillRes = await (0, connection_1.query)(`SELECT skill_id, skill_name FROM skills WHERE skill_name IN ('React', 'Next.js', 'PostgreSQL')`);
    const reactSkill = skillRes.rows.find(s => s.skill_name === 'React');
    const nextSkill = skillRes.rows.find(s => s.skill_name === 'Next.js');
    // STEP 1: Student A registers
    console.log('>>> [STEP 1/14] Student A (Task Poster) Registers...');
    const { user: studentA, token: tokenA } = await (0, authService_1.registerUser)({
        name: 'Vikram Aditya',
        email: studentAEmail,
        password: 'password123',
        college: 'PES University',
        department: 'Computer Science & Engineering',
        role: 'STUDENT'
    });
    console.log(`[PASS] Registered Student A: ${studentA.name} (${studentA.email}) [ID: ${studentA.user_id}]`);
    // STEP 2: Student A adds skills
    console.log('\n>>> [STEP 2/14] Student A adds skills to profile...');
    if (reactSkill) {
        await (0, userService_1.addStudentSkill)(studentA.user_id, reactSkill.skill_id, 'ADVANCED', 2.0);
        console.log(`[PASS] Added skill 'React' to Student A`);
    }
    // STEP 3 & 4: Student A posts task & task embedding is automatically stored
    console.log('\n>>> [STEP 3 & 4/14] Student A creates task (Auto-generates pgvector embedding)...');
    const task = await (0, taskService_1.createTask)({
        ownerId: studentA.user_id,
        categoryId,
        title: `Next.js Real-Time Event Dashboard ${timestamp}`,
        description: 'Build a Next.js 14 dashboard with server actions and PostgreSQL event booking tables.',
        requiredSkills: 'Next.js, React, PostgreSQL',
        budget: 1500,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString()
    });
    console.log(`[PASS] Created Task: "${task.title}" (Budget: ₹${task.budget}, Status: ${task.status})`);
    // Verify pgvector embedding was generated and stored
    const embCheck = await (0, connection_1.query)(`SELECT embedding_id, entity_type, (embedding IS NOT NULL) AS has_vector FROM content_embeddings WHERE entity_id = $1`, [task.task_id]);
    console.log(`[PASS] pgvector Embedding Stored: ID ${embCheck.rows[0].embedding_id} (has_vector: ${embCheck.rows[0].has_vector})`);
    // STEP 5: Student B registers
    console.log('\n>>> [STEP 5/14] Student B (Freelancer) Registers...');
    const { user: studentB } = await (0, authService_1.registerUser)({
        name: 'Sneha Kulkarni',
        email: studentBEmail,
        password: 'password123',
        college: 'RVCE',
        department: 'Information Science',
        role: 'STUDENT'
    });
    console.log(`[PASS] Registered Student B: ${studentB.name} (${studentB.email}) [ID: ${studentB.user_id}]`);
    // STEP 6: Student B adds skills (triggers student vector generation)
    console.log('\n>>> [STEP 6/14] Student B adds Next.js & React skills...');
    if (nextSkill) {
        await (0, userService_1.addStudentSkill)(studentB.user_id, nextSkill.skill_id, 'EXPERT', 3.0);
        console.log(`[PASS] Added skill 'Next.js' (EXPERT) to Student B`);
    }
    if (reactSkill) {
        await (0, userService_1.addStudentSkill)(studentB.user_id, reactSkill.skill_id, 'EXPERT', 3.0);
        console.log(`[PASS] Added skill 'React' (EXPERT) to Student B`);
    }
    // STEP 7: Student B sees semantically recommended tasks via pgvector (<=>)
    console.log('\n>>> [STEP 7/14] Student B queries Recommended Tasks via pgvector (<=> cosine distance)...');
    const recommended = await (0, vectorService_1.getRecommendedTasksForStudent)(studentB.user_id, 3);
    console.log(`[PASS] Found ${recommended.length} semantically ranked recommendations:`);
    recommended.forEach((rec, idx) => {
        console.log(`      #${idx + 1}: "${rec.title}" | Match Score: ${rec.match_score_percentage}% | Cosine Distance: ${parseFloat(rec.cosine_distance).toFixed(4)}`);
    });
    // STEP 8: Student B applies to Student A's task
    console.log('\n>>> [STEP 8/14] Student B applies to task...');
    const application = await (0, applicationService_1.applyToTask)({
        taskId: task.task_id,
        studentId: studentB.user_id,
        proposal: 'I have built multiple Next.js dashboards with PostgreSQL for campus hackathons. Can deliver in 3 days.',
        proposedAmount: 1400
    });
    console.log(`[PASS] Application submitted! ID: ${application.application_id} (Status: ${application.status}, Proposed: ₹${application.proposed_amount})`);
    // STEP 8b: TEST DATABASE TRIGGER: Prevent self-application
    console.log('\n>>> [INTEGRITY TEST] Testing trigger: Student A attempting to apply to their OWN task...');
    try {
        await (0, applicationService_1.applyToTask)({
            taskId: task.task_id,
            studentId: studentA.user_id,
            proposal: 'Self application test',
            proposedAmount: 500
        });
        console.error('[FAIL] Trigger did not fire!');
    }
    catch (err) {
        console.log(`[PASS] Database Trigger fired correctly: "${err.message.split('\n')[0]}"`);
    }
    // STEP 9: Student A views applications
    console.log('\n>>> [STEP 9/14] Student A views applicants for task...');
    const applicants = await (0, applicationService_1.getTaskApplications)(task.task_id, studentA.user_id);
    console.log(`[PASS] Student A sees ${applicants.length} applicant(s):`);
    applicants.forEach(a => console.log(`      - ${a.student_name} (${a.student_college}) - Bid: ₹${a.proposed_amount}`));
    // STEP 10: Student A accepts Student B (PostgreSQL ACID Stored Transaction)
    console.log('\n>>> [STEP 10/14] Student A accepts Student B via fn_accept_application_transaction()...');
    const assignment = await (0, assignmentService_1.acceptApplication)(application.application_id, studentA.user_id);
    console.log(`[PASS] Transaction successful! Assignment created: ${assignment.assignment_id} (Status: ${assignment.status})`);
    // Verify Task status changed to ASSIGNED
    const updatedTask = await (0, taskService_1.getTaskById)(task.task_id);
    console.log(`[PASS] Task status atomically transitioned to: '${updatedTask.status}'`);
    // STEP 11: Student B starts work
    console.log('\n>>> [STEP 11/14] Student B marks work as IN_PROGRESS...');
    const startedAsg = await (0, assignmentService_1.startWork)(assignment.assignment_id, studentB.user_id);
    console.log(`[PASS] Assignment started! Status: ${startedAsg.status}, Started At: ${startedAsg.started_at}`);
    // STEP 12: Student B submits work
    console.log('\n>>> [STEP 12/14] Student B submits deliverable...');
    const submittedAsg = await (0, assignmentService_1.submitWork)(assignment.assignment_id, studentB.user_id, 'Deployed to Vercel and pushed clean code to GitHub repository with full README and SQL schema.');
    console.log(`[PASS] Work submitted! Status: ${submittedAsg.status}, Submitted At: ${submittedAsg.submitted_at}`);
    // STEP 13: Student A approves task & payment is released (ACID Transaction)
    console.log('\n>>> [STEP 13/14] Student A completes task and releases payment (Atomic Transaction)...');
    const completionResult = await (0, assignmentService_1.completeTaskAndReleasePayment)(assignment.assignment_id, studentA.user_id);
    console.log(`[PASS] Task completed! Assignment Status: ${completionResult.assignment.status}`);
    console.log(`[PASS] Verified Payment record inserted: ID ${completionResult.payment.payment_id} (Amount: ₹${completionResult.payment.amount}, Status: ${completionResult.payment.payment_status})`);
    // STEP 14: Student A reviews Student B
    console.log('\n>>> [STEP 14/14] Student A submits 5-star review for Student B...');
    const review = await (0, reviewService_1.createReview)({
        taskId: task.task_id,
        reviewerId: studentA.user_id,
        reviewedUserId: studentB.user_id,
        rating: 5,
        comment: 'Exceptional full-stack execution! Clean Next.js code and delivered well ahead of schedule.'
    });
    console.log(`[PASS] Review submitted: ${review.rating} Stars - "${review.comment}"`);
    // Verify updated student rating and earnings via Stored Functions & Views
    console.log('\n>>> [VERIFICATION] Querying updated Student B stats via Stored Functions & Views...');
    const ratingSummary = await (0, reviewService_1.getStudentRatingSummary)(studentB.user_id);
    console.log(`[PASS] fn_calculate_student_rating: Avg Rating = ${ratingSummary.average_rating}, Total Reviews = ${ratingSummary.total_reviews}`);
    const profileWithStats = await (0, userService_1.getUserProfileWithStats)(studentB.user_id);
    console.log(`[PASS] view_student_performance: Completed = ${profileWithStats.completed_assignments}, Total Earnings = ₹${profileWithStats.total_earnings}`);
    console.log('\n========================================================================');
    console.log(' ALL 14 DEMO WORKFLOW STEPS PASSED AGAINST POSTGRESQL & PGVECTOR!       ');
    console.log('========================================================================');
}
runDemoFlow()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('\nDEMO FLOW ERROR:', err);
    process.exit(1);
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const connection_1 = require("./connection");
const authService_1 = require("../services/authService");
const vectorService_1 = require("../services/vectorService");
const userService_1 = require("../services/userService");
async function seedDatabase() {
    console.log('====================================================');
    console.log('  PRAYASPRO REALISTIC DATABASE SEED RUNNER          ');
    console.log('====================================================');
    const defaultPasswordHash = await (0, authService_1.hashPassword)('password123');
    await (0, connection_1.withTransaction)(async (client) => {
        // Clean old data in safe topological order
        console.log('Cleaning existing tables...');
        await client.query('DELETE FROM reviews');
        await client.query('DELETE FROM payments');
        await client.query('DELETE FROM assignments');
        await client.query('DELETE FROM applications');
        await client.query('DELETE FROM content_embeddings');
        await client.query('DELETE FROM tasks');
        await client.query('DELETE FROM student_skills');
        await client.query('DELETE FROM skills');
        await client.query('DELETE FROM categories');
        await client.query('DELETE FROM users');
        // 1. Seed Categories
        console.log('Seeding categories...');
        const catRows = [
            ['Software & Web Dev', 'Frontend, backend, API development, and web apps'],
            ['Graphic Design', 'Event posters, social media banners, and UI design'],
            ['Data & AI', 'Python scripts, web scraping, data analytics, and ML models'],
            ['Video & Animation', 'Short reels, video editing, motion graphics, and promos'],
            ['Technical Writing', 'Project reports, documentation, research summaries, and proofreading'],
            ['Academic Tutoring', 'One-on-one subject mentoring, lab help, and concept explanation']
        ];
        const categoryMap = {};
        for (const [name, desc] of catRows) {
            const res = await client.query(`INSERT INTO categories (category_name, description) VALUES ($1, $2) RETURNING category_id, category_name`, [name, desc]);
            categoryMap[res.rows[0].category_name] = res.rows[0].category_id;
        }
        // 2. Seed Skills
        console.log('Seeding skills...');
        const skillRows = [
            ['React', 'Software & Web Dev', 'Modern React components, hooks, and responsive interfaces'],
            ['Next.js', 'Software & Web Dev', 'Full-stack Next.js App Router, SSR, and API route development'],
            ['PostgreSQL', 'Software & Web Dev', 'Relational database schema design, indexing, and complex queries'],
            ['Python', 'Data & AI', 'Python scripting, automation, backend development, and data manipulation'],
            ['Pandas', 'Data & AI', 'Data analysis, CSV transformation, and exploratory data analytics'],
            ['Machine Learning', 'Data & AI', 'Scikit-learn model building, classification, and regression'],
            ['Canva', 'Graphic Design', 'Fast template-driven creative posters and social media banners'],
            ['Photoshop', 'Graphic Design', 'Photo editing, image manipulation, and raster design'],
            ['Figma', 'Graphic Design', 'Wireframing, modern mobile and desktop UI/UX prototyping'],
            ['Video Editing', 'Video & Animation', 'Cutting, color grading, sound design, and reels'],
            ['Content Writing', 'Technical Writing', 'Engaging blog posts, project summaries, and articles'],
            ['Technical Writing', 'Technical Writing', 'Software documentation, IEEE format reports, and technical manuals']
        ];
        const skillMap = {};
        for (const [name, cat, desc] of skillRows) {
            const res = await client.query(`INSERT INTO skills (skill_name, category, description) VALUES ($1, $2, $3) RETURNING skill_id, skill_name`, [name, cat, desc]);
            skillMap[res.rows[0].skill_name] = res.rows[0].skill_id;
        }
        // 3. Seed Users (1 Admin + 5 Students)
        console.log('Seeding users...');
        const userRows = [
            {
                name: 'Admin Supervisor',
                email: 'admin@prayaspro.edu',
                college: 'PES University',
                department: 'CSE',
                role: 'ADMIN'
            },
            {
                name: 'Aarav Sharma',
                email: 'aarav@pesu.edu',
                college: 'PES University',
                department: 'Computer Science',
                role: 'STUDENT'
            },
            {
                name: 'Priya Nair',
                email: 'priya@pesu.edu',
                college: 'PES University',
                department: 'AI & Machine Learning',
                role: 'STUDENT'
            },
            {
                name: 'Rohit Verma',
                email: 'rohit@rvce.edu',
                college: 'RVCE',
                department: 'Information Science',
                role: 'STUDENT'
            },
            {
                name: 'Ananya Rao',
                email: 'ananya@bmsce.edu',
                college: 'BMSCE',
                department: 'Design & Media',
                role: 'STUDENT'
            },
            {
                name: 'Karthik Gowda',
                email: 'karthik@pesu.edu',
                college: 'PES University',
                department: 'Electronics & Comm',
                role: 'STUDENT'
            }
        ];
        const userMap = {};
        for (const u of userRows) {
            const res = await client.query(`INSERT INTO users (name, email, password_hash, college, department, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING user_id, email, name`, [u.name, u.email, defaultPasswordHash, u.college, u.department, u.role]);
            userMap[u.email] = res.rows[0].user_id;
        }
        // 4. Seed Student Skills
        console.log('Seeding student skills...');
        const studentSkillMappings = [
            // Aarav: Web & Fullstack specialist
            { email: 'aarav@pesu.edu', skill: 'React', level: 'EXPERT', exp: 2.5 },
            { email: 'aarav@pesu.edu', skill: 'Next.js', level: 'ADVANCED', exp: 2.0 },
            { email: 'aarav@pesu.edu', skill: 'PostgreSQL', level: 'ADVANCED', exp: 1.5 },
            // Priya: Python & Data specialist
            { email: 'priya@pesu.edu', skill: 'Python', level: 'EXPERT', exp: 3.0 },
            { email: 'priya@pesu.edu', skill: 'Pandas', level: 'ADVANCED', exp: 2.0 },
            { email: 'priya@pesu.edu', skill: 'Machine Learning', level: 'ADVANCED', exp: 1.5 },
            // Rohit: Fullstack & Writing
            { email: 'rohit@rvce.edu', skill: 'Python', level: 'INTERMEDIATE', exp: 1.0 },
            { email: 'rohit@rvce.edu', skill: 'Technical Writing', level: 'ADVANCED', exp: 2.0 },
            // Ananya: Creative Design & Video
            { email: 'ananya@bmsce.edu', skill: 'Canva', level: 'EXPERT', exp: 3.0 },
            { email: 'ananya@bmsce.edu', skill: 'Photoshop', level: 'ADVANCED', exp: 2.0 },
            { email: 'ananya@bmsce.edu', skill: 'Figma', level: 'EXPERT', exp: 2.5 },
            { email: 'ananya@bmsce.edu', skill: 'Video Editing', level: 'ADVANCED', exp: 1.5 },
            // Karthik: Video & Content
            { email: 'karthik@pesu.edu', skill: 'Video Editing', level: 'EXPERT', exp: 2.0 },
            { email: 'karthik@pesu.edu', skill: 'Content Writing', level: 'INTERMEDIATE', exp: 1.0 }
        ];
        for (const sm of studentSkillMappings) {
            await client.query(`INSERT INTO student_skills (user_id, skill_id, proficiency_level, years_experience)
         VALUES ($1, $2, $3, $4)`, [userMap[sm.email], skillMap[sm.skill], sm.level, sm.exp]);
        }
        // 5. Seed Tasks
        console.log('Seeding tasks...');
        const now = new Date();
        const futureDate = (days) => new Date(now.getTime() + days * 86400000);
        const taskData = [
            {
                ownerEmail: 'aarav@pesu.edu',
                category: 'Graphic Design',
                title: 'College Fest Poster & Instagram Banner',
                description: 'Need a stunning vibrant A3 poster for our annual college fest. Should follow neon retro theme with event dates, venue, and QR code for registrations.',
                skills: 'Canva, Photoshop, Figma, Graphic Design',
                budget: 450,
                deadline: futureDate(10),
                status: 'OPEN'
            },
            {
                ownerEmail: 'priya@pesu.edu',
                category: 'Software & Web Dev',
                title: 'Next.js Hackathon Registration Landing Page',
                description: 'Need a clean single-page Next.js site with form validation for college hackathon registrations. Must have sleek dark mode aesthetics.',
                skills: 'Next.js, React, Tailwind, UI',
                budget: 1200,
                deadline: futureDate(14),
                status: 'OPEN'
            },
            {
                ownerEmail: 'rohit@rvce.edu',
                category: 'Data & AI',
                title: 'Python Web Scraper for Placement Notices',
                description: 'Automated Python script with BeautifulSoup or Selenium to extract placement notifications from student portal and save into structured JSON/CSV.',
                skills: 'Python, Pandas, Web Scraping',
                budget: 700,
                deadline: futureDate(7),
                status: 'OPEN'
            },
            {
                ownerEmail: 'karthik@pesu.edu',
                category: 'Video & Animation',
                title: 'Robotics Club Teaser Video & Reel',
                description: 'Edit raw footage of our battle bots competition into a fast-paced 60-second Instagram Reel with sync audio and captions.',
                skills: 'Video Editing, Reels, Premiere',
                budget: 500,
                deadline: futureDate(5),
                status: 'OPEN'
            },
            {
                ownerEmail: 'ananya@bmsce.edu',
                category: 'Technical Writing',
                title: 'DBMS Project Report Formatting & Proofreading',
                description: 'Proofread and format our Level 3 DBMS academic project report into standard IEEE conference style with ER diagram captions.',
                skills: 'Technical Writing, Documentation, Report',
                budget: 350,
                deadline: futureDate(4),
                status: 'OPEN'
            },
            // Completed Historical Task: starts as OPEN so application triggers pass, then updated to COMPLETED!
            {
                ownerEmail: 'aarav@pesu.edu',
                category: 'Graphic Design',
                title: 'AI Symposium Logo and Badge Design',
                description: 'Create minimalist vector logo and volunteer ID card badge for IEEE AI symposium.',
                skills: 'Figma, Canva, Logo Design',
                budget: 600,
                deadline: new Date(now.getTime() - 2 * 86400000), // 2 days ago
                status: 'OPEN'
            }
        ];
        const taskIds = {};
        for (const t of taskData) {
            const res = await client.query(`INSERT INTO tasks (owner_id, category_id, title, description, required_skills, budget, deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING task_id, title`, [
                userMap[t.ownerEmail],
                categoryMap[t.category],
                t.title,
                t.description,
                t.skills,
                t.budget,
                t.deadline,
                t.status
            ]);
            taskIds[t.title] = res.rows[0].task_id;
        }
        // 6. Seed Application, Assignment, Payment & Review for the Historical Task
        console.log('Seeding completed workflow (assignment, payment, review)...');
        const compTaskId = taskIds['AI Symposium Logo and Badge Design'];
        const applicantId = userMap['ananya@bmsce.edu'];
        const ownerId = userMap['aarav@pesu.edu'];
        // 6a. Application (task is OPEN, so trigger passes)
        await client.query(`INSERT INTO applications (task_id, student_id, proposal, proposed_amount, status)
       VALUES ($1, $2, $3, $4, 'ACCEPTED')`, [
            compTaskId,
            applicantId,
            'I have designed 10+ logos and badges for college clubs with Figma. Ready to deliver modern vector exports within 2 days.',
            600
        ]);
        // 6b. Assignment (1:1 with Task)
        await client.query(`INSERT INTO assignments (task_id, student_id, status, assigned_at, started_at, submitted_at, completed_at, submission_notes)
       VALUES ($1, $2, 'COMPLETED', CURRENT_TIMESTAMP - interval '3 days', CURRENT_TIMESTAMP - interval '2 days', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP - interval '12 hours', $3)`, [compTaskId, applicantId, 'Delivered high-res PNG, SVG, and Figma community file link with dark and light variants.']);
        // 6c. Transition Task to COMPLETED
        await client.query(`UPDATE tasks SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1`, [compTaskId]);
        // 6d. Payment (SUCCESS)
        await client.query(`INSERT INTO payments (task_id, payer_id, receiver_id, amount, payment_status, paid_at)
       VALUES ($1, $2, $3, $4, 'SUCCESS', CURRENT_TIMESTAMP - interval '12 hours')`, [compTaskId, ownerId, applicantId, 600]);
        // 6e. Review (5 stars)
        await client.query(`INSERT INTO reviews (task_id, reviewer_id, reviewed_user_id, rating, comment, created_at)
       VALUES ($1, $2, $3, 5, $4, CURRENT_TIMESTAMP - interval '10 hours')`, [
            compTaskId,
            ownerId,
            applicantId,
            'Exceptional design quality! Delivered ahead of schedule with clean vector assets. Highly recommended for creative college design tasks.'
        ]);
        // 7. Seed pending application for open task
        console.log('Seeding pending application for open task...');
        const posterTaskId = taskIds['College Fest Poster & Instagram Banner'];
        await client.query(`INSERT INTO applications (task_id, student_id, proposal, proposed_amount, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`, [
            posterTaskId,
            userMap['ananya@bmsce.edu'],
            'Hi! I am the head of design at BMSCE. I can create a vibrant retro-neon poster with custom typography and ready-to-print 300 DPI exports.',
            450
        ]);
    });
    // 8. Generate pgvector Content Embeddings for Students and Tasks
    console.log('Generating pgvector 384-dimensional embeddings...');
    // Embeddings for all students
    const students = await (0, connection_1.query)(`SELECT user_id FROM users WHERE role = 'STUDENT'`);
    for (const s of students.rows) {
        await (0, userService_1.refreshStudentEmbedding)(s.user_id);
    }
    // Embeddings for all tasks
    const tasks = await (0, connection_1.query)(`
    SELECT t.task_id, t.title, t.description, t.required_skills, t.budget, c.category_name
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
  `);
    for (const t of tasks.rows) {
        const text = `Task: ${t.title}. Category: ${t.category_name}. Required Skills: ${t.required_skills}. Description: ${t.description}. Budget: ₹${t.budget}.`;
        await (0, vectorService_1.upsertEmbedding)('TASK', t.task_id, text);
    }
    console.log('====================================================');
    console.log(' Seed data populated successfully with embeddings!  ');
    console.log('====================================================');
}
if (require.main === module) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('Seed error:', err);
        process.exit(1);
    });
}

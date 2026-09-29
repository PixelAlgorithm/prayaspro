import { query, withTransaction } from './connection';
import { hashPassword } from '../services/authService';
import { upsertEmbedding } from '../services/vectorService';
import { refreshStudentEmbedding } from '../services/userService';

export async function populateSyntheticData() {
  console.log('====================================================');
  console.log('  PRAYASPRO CONSISTENT SYNTHETIC DATA GENERATOR     ');
  console.log('====================================================');

  const defaultPasswordHash = await hashPassword('password123');

  const now = new Date();
  const pastDate = (days: number, hours = 0) => new Date(now.getTime() - (days * 86400000 + hours * 3600000));
  const futureDate = (days: number) => new Date(now.getTime() + days * 86400000);

  // 1. Synthetic Students Data
  const extraStudents = [
    { name: 'Devika Menon', email: 'devika@pesu.edu', college: 'PES University', department: 'Computer Science', role: 'STUDENT' },
    { name: 'Rohan Deshmukh', email: 'rohan@rvce.edu', college: 'RVCE', department: 'AI & Machine Learning', role: 'STUDENT' },
    { name: 'Sneha Kulkarni', email: 'sneha@bmsce.edu', college: 'BMSCE', department: 'Information Science', role: 'STUDENT' },
    { name: 'Varun Hegde', email: 'varun@msrit.edu', college: 'MSRIT', department: 'Electronics & Comm', role: 'STUDENT' },
    { name: 'Tanvi Joshi', email: 'tanvi@pesu.edu', college: 'PES University', department: 'Design & Interaction', role: 'STUDENT' },
    { name: 'Aditya Swamy', email: 'aditya@rvce.edu', college: 'RVCE', department: 'Computer Science', role: 'STUDENT' },
    { name: 'Meera Iyer', email: 'meera@bmsce.edu', college: 'BMSCE', department: 'Biotechnology & Data', role: 'STUDENT' },
    { name: 'Nikhil Rathi', email: 'nikhil@pesu.edu', college: 'PES University', department: 'Mechanical & Robotics', role: 'STUDENT' }
  ];

  await withTransaction(async (client) => {
    console.log('Adding consistent synthetic students...');
    const userMap: Record<string, string> = {};

    // Get existing users
    const existingUsers = await client.query('SELECT user_id, email FROM users');
    for (const u of existingUsers.rows) {
      userMap[u.email] = u.user_id;
    }

    // Insert new students if not exist
    for (const s of extraStudents) {
      if (!userMap[s.email]) {
        const res = await client.query(
          `INSERT INTO users (name, email, password_hash, college, department, role)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING user_id, email`,
          [s.name, s.email, defaultPasswordHash, s.college, s.department, s.role]
        );
        userMap[s.email] = res.rows[0].user_id;
      }
    }

    // Fetch Skills and Categories
    const skillsRes = await client.query('SELECT skill_id, skill_name FROM skills');
    const skillMap: Record<string, string> = {};
    for (const sk of skillsRes.rows) {
      skillMap[sk.skill_name] = sk.skill_id;
    }

    const catRes = await client.query('SELECT category_id, category_name FROM categories');
    const categoryMap: Record<string, string> = {};
    for (const c of catRes.rows) {
      categoryMap[c.category_name] = c.category_id;
    }

    // 2. Map Skills to Synthetic Students
    console.log('Mapping realistic skills to synthetic students...');
    const studentSkillsData = [
      { email: 'devika@pesu.edu', skill: 'React', level: 'EXPERT', exp: 2.5 },
      { email: 'devika@pesu.edu', skill: 'Next.js', level: 'ADVANCED', exp: 2.0 },
      { email: 'rohan@rvce.edu', skill: 'Python', level: 'EXPERT', exp: 3.0 },
      { email: 'rohan@rvce.edu', skill: 'Machine Learning', level: 'ADVANCED', exp: 2.0 },
      { email: 'rohan@rvce.edu', skill: 'Pandas', level: 'ADVANCED', exp: 1.5 },
      { email: 'sneha@bmsce.edu', skill: 'PostgreSQL', level: 'EXPERT', exp: 2.5 },
      { email: 'sneha@bmsce.edu', skill: 'Next.js', level: 'ADVANCED', exp: 2.0 },
      { email: 'tanvi@pesu.edu', skill: 'Canva', level: 'EXPERT', exp: 3.0 },
      { email: 'tanvi@pesu.edu', skill: 'Photoshop', level: 'EXPERT', exp: 2.5 },
      { email: 'tanvi@pesu.edu', skill: 'Figma', level: 'EXPERT', exp: 3.0 },
      { email: 'varun@msrit.edu', skill: 'Video Editing', level: 'ADVANCED', exp: 2.0 },
      { email: 'aditya@rvce.edu', skill: 'Python', level: 'ADVANCED', exp: 2.0 },
      { email: 'aditya@rvce.edu', skill: 'PostgreSQL', level: 'INTERMEDIATE', exp: 1.5 },
      { email: 'meera@bmsce.edu', skill: 'Technical Writing', level: 'EXPERT', exp: 3.0 },
      { email: 'meera@bmsce.edu', skill: 'Content Writing', level: 'ADVANCED', exp: 2.0 },
      { email: 'nikhil@pesu.edu', skill: 'Video Editing', level: 'INTERMEDIATE', exp: 1.5 }
    ];

    for (const ss of studentSkillsData) {
      if (userMap[ss.email] && skillMap[ss.skill]) {
        await client.query(
          `INSERT INTO student_skills (user_id, skill_id, proficiency_level, years_experience)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, skill_id) DO NOTHING`,
          [userMap[ss.email], skillMap[ss.skill], ss.level, ss.exp]
        );
      }
    }

    // 3. Synthetic Tasks across Diverse Categories
    console.log('Adding diverse marketplace tasks...');
    const syntheticTasks = [
      {
        ownerEmail: 'devika@pesu.edu',
        category: 'Data & AI',
        title: 'Pandas Script to Clean College Survey Data',
        description: 'Clean, normalize, and handle missing values in a 5,000-row CSV student survey dataset and generate summary charts.',
        skills: 'Python, Pandas, Data Analytics',
        budget: 650,
        deadline: futureDate(6),
        status: 'OPEN'
      },
      {
        ownerEmail: 'rohan@rvce.edu',
        category: 'Software & Web Dev',
        title: 'Responsive Portfolio Website in React',
        description: 'Convert Figma designs into responsive clean React components with smooth scrolling, project gallery, and contact form.',
        skills: 'React, Tailwind, UI/UX',
        budget: 1100,
        deadline: futureDate(12),
        status: 'OPEN'
      },
      {
        ownerEmail: 'tanvi@pesu.edu',
        category: 'Graphic Design',
        title: 'Tech Fest T-shirt and Hoodie Vector Artwork',
        description: 'Minimalist vector illustration for our annual technical symposium merchandise with front chest badge and back artwork.',
        skills: 'Photoshop, Figma, Vector Design',
        budget: 550,
        deadline: futureDate(8),
        status: 'OPEN'
      },
      {
        ownerEmail: 'varun@msrit.edu',
        category: 'Technical Writing',
        title: 'LaTeX Formatting for IEEE Conference Paper',
        description: 'Format a 6-page double-column research manuscript in Overleaf LaTeX, including equations, citation bibtex, and figure placements.',
        skills: 'Technical Writing, LaTeX, Documentation',
        budget: 450,
        deadline: futureDate(5),
        status: 'OPEN'
      },
      {
        ownerEmail: 'meera@bmsce.edu',
        category: 'Video & Animation',
        title: 'College Cultural Fest Aftermovie Edit',
        description: 'Compile 3 days of drone, camera, and smartphone footage into a cinematic 3-minute aftermovie with rhythmic beat-matching audio.',
        skills: 'Video Editing, Sound Design, Premiere',
        budget: 1300,
        deadline: futureDate(15),
        status: 'OPEN'
      },
      // Completed Historical Task 1: Web Development
      {
        ownerEmail: 'varun@msrit.edu',
        workerEmail: 'devika@pesu.edu',
        category: 'Software & Web Dev',
        title: 'Club Event Attendance QR Scanner Web App',
        description: 'Lightweight web tool allowing club coordinators to scan student tickets and mark attendance in PostgreSQL.',
        skills: 'Next.js, PostgreSQL, QR Scanner',
        budget: 950,
        deadline: pastDate(3),
        status: 'COMPLETED',
        proposal: 'I developed a similar QR scanner for PESU hackathon. Can implement with Next.js and camera API in 2 days.',
        bid: 950,
        submissionNotes: 'Delivered functional web app with live camera scanner and real-time database sync.',
        rating: 5,
        review: 'Fantastic work! The QR scanner operated flawlessly during our club orientation event.'
      },
      // Completed Historical Task 2: Graphic Design
      {
        ownerEmail: 'aditya@rvce.edu',
        workerEmail: 'tanvi@pesu.edu',
        category: 'Graphic Design',
        title: 'Robotics Workshop Brochure & Handout',
        description: 'Design a clean 2-fold informational brochure highlighting workshop schedule, speaker profiles, and hardware kits.',
        skills: 'Canva, Figma, Typography',
        budget: 500,
        deadline: pastDate(5),
        status: 'COMPLETED',
        proposal: 'Specialized in print design and typography. Will deliver print-ready CMYK PDFs.',
        bid: 500,
        submissionNotes: 'Delivered print-ready 300 DPI PDF files with crop marks and digital web view.',
        rating: 5,
        review: 'Superb aesthetic sense and rapid turnaround. Students loved the handouts!'
      },
      // Completed Historical Task 3: Data Analytics
      {
        ownerEmail: 'devika@pesu.edu',
        workerEmail: 'rohan@rvce.edu',
        category: 'Data & AI',
        title: 'Sentiment Analysis on Student Feedback Forms',
        description: 'Classify 1,200 open-ended course evaluation comments into positive, neutral, and negative using NLP.',
        skills: 'Python, Machine Learning, Pandas',
        budget: 800,
        deadline: pastDate(4),
        status: 'COMPLETED',
        proposal: 'I have pre-trained BERT and TF-IDF pipelines ready. Can deliver classified spreadsheet and charts.',
        bid: 800,
        submissionNotes: 'Provided cleaned dataset, confusion matrix, and interactive HTML summary report.',
        rating: 4,
        review: 'Very thorough analysis and clear visualizations. Accurate classification.'
      },
      // In-Progress Task (Active assignment)
      {
        ownerEmail: 'aditya@rvce.edu',
        workerEmail: 'sneha@bmsce.edu',
        category: 'Software & Web Dev',
        title: 'PostgreSQL Database Query Optimization for College Portal',
        description: 'Analyze slow queries with EXPLAIN ANALYZE, add proper composite indexes, and write aggregation views.',
        skills: 'PostgreSQL, SQL, Indexing',
        budget: 850,
        deadline: futureDate(7),
        status: 'IN_PROGRESS',
        proposal: 'Experienced with PostgreSQL indexing, vacuuming, and query plan optimization. Starting today.',
        bid: 850
      }
    ];

    for (const item of syntheticTasks) {
      const ownerId = userMap[item.ownerEmail];
      const categoryId = categoryMap[item.category];

      // Insert Task as OPEN first so triggers pass
      const taskRes = await client.query(
        `INSERT INTO tasks (owner_id, category_id, title, description, required_skills, budget, deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')
         RETURNING task_id`,
        [ownerId, categoryId, item.title, item.description, item.skills, item.budget, item.deadline]
      );
      const taskId = taskRes.rows[0].task_id;

      // If this task has a worker (completed or in-progress)
      if (item.workerEmail) {
        const workerId = userMap[item.workerEmail];

        // 1. Insert Application (ACCEPTED)
        await client.query(
          `INSERT INTO applications (task_id, student_id, proposal, proposed_amount, status)
           VALUES ($1, $2, $3, $4, 'ACCEPTED')`,
          [taskId, workerId, item.proposal, item.bid]
        );

        if (item.status === 'COMPLETED') {
          // 2. Insert Assignment
          await client.query(
            `INSERT INTO assignments (task_id, student_id, status, assigned_at, started_at, submitted_at, completed_at, submission_notes)
             VALUES ($1, $2, 'COMPLETED', CURRENT_TIMESTAMP - interval '4 days', CURRENT_TIMESTAMP - interval '3 days', CURRENT_TIMESTAMP - interval '2 days', CURRENT_TIMESTAMP - interval '1 day', $3)`,
            [taskId, workerId, item.submissionNotes]
          );

          // 3. Update Task to COMPLETED
          await client.query(
            `UPDATE tasks SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP - interval '1 day' WHERE task_id = $1`,
            [taskId]
          );

          // 4. Insert Payment record
          await client.query(
            `INSERT INTO payments (task_id, payer_id, receiver_id, amount, payment_status, paid_at)
             VALUES ($1, $2, $3, $4, 'SUCCESS', CURRENT_TIMESTAMP - interval '1 day')`,
            [taskId, ownerId, workerId, item.budget]
          );

          // 5. Insert Review
          if (item.rating) {
            await client.query(
              `INSERT INTO reviews (task_id, reviewer_id, reviewed_user_id, rating, comment, created_at)
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP - interval '20 hours')`,
              [taskId, ownerId, workerId, item.rating, item.review]
            );
          }
        } else if (item.status === 'IN_PROGRESS') {
          // Insert active in-progress assignment
          await client.query(
            `INSERT INTO assignments (task_id, student_id, status, assigned_at, started_at)
             VALUES ($1, $2, 'IN_PROGRESS', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP - interval '12 hours')`,
            [taskId, workerId]
          );
          await client.query(
            `UPDATE tasks SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1`,
            [taskId]
          );
        }
      }
    }
  });

  // 4. Generate & Sync pgvector Embeddings for all Students & Tasks
  console.log('Generating pgvector 384-dimensional embeddings for all new records...');
  
  const allStudents = await query(`SELECT user_id FROM users WHERE role = 'STUDENT'`);
  for (const s of allStudents.rows) {
    await refreshStudentEmbedding(s.user_id);
  }

  const allTasks = await query(`
    SELECT t.task_id, t.title, t.description, t.required_skills, t.budget, c.category_name
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
  `);

  for (const t of allTasks.rows) {
    const text = `Task: ${t.title}. Category: ${t.category_name}. Required Skills: ${t.required_skills}. Description: ${t.description}. Budget: ₹${t.budget}.`;
    await upsertEmbedding('TASK', t.task_id, text);
  }

  console.log('====================================================');
  console.log(' Consistent synthetic data populated successfully!  ');
  console.log('====================================================');
}

if (require.main === module) {
  populateSyntheticData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Synthetic data generation error:', err);
      process.exit(1);
    });
}

--
-- PostgreSQL database dump
--

\restrict vsjUci2wg8WMMec3uMsUrpGcMAxrcHaNK2sK8McugATEgovoxx69n4XQDcpf5fO

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: DOMAIN; Schema: public; Owner: postgres
--

CREATE DOMAIN public.vector AS real[];


ALTER DOMAIN public.vector OWNER TO postgres;

--
-- Name: cosine_distance_fallback(public.vector, public.vector); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cosine_distance_fallback(a public.vector, b public.vector) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    dot_product double precision := 0;
    norm_a double precision := 0;
    norm_b double precision := 0;
    len integer;
    i integer;
    arr_a real[] := a::real[];
    arr_b real[] := b::real[];
BEGIN
    len := array_length(arr_a, 1);
    IF len IS NULL OR len != array_length(arr_b, 1) THEN
        RETURN 1.0;
    END IF;

    FOR i IN 1..len LOOP
        dot_product := dot_product + (arr_a[i] * arr_b[i]);
        norm_a := norm_a + (arr_a[i] * arr_a[i]);
        norm_b := norm_b + (arr_b[i] * arr_b[i]);
    END LOOP;

    IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 1.0;
    END IF;

    RETURN 1.0 - (dot_product / (sqrt(norm_a) * sqrt(norm_b)));
END;
$$;


ALTER FUNCTION public.cosine_distance_fallback(a public.vector, b public.vector) OWNER TO postgres;

--
-- Name: fn_accept_application_transaction(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_accept_application_transaction(p_application_id uuid, p_owner_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_task_id UUID;
    v_student_id UUID;
    v_task_owner UUID;
    v_task_status VARCHAR(20);
    v_new_assignment_id UUID;
BEGIN
    -- Check application existence
    SELECT task_id, student_id INTO v_task_id, v_student_id
    FROM applications
    WHERE application_id = p_application_id;

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Application % does not exist', p_application_id;
    END IF;

    -- Validate task owner and task status
    SELECT owner_id, status INTO v_task_owner, v_task_status
    FROM tasks
    WHERE task_id = v_task_id
    FOR UPDATE; -- Lock row for concurrency control

    IF v_task_owner != p_owner_id THEN
        RAISE EXCEPTION 'Unauthorized: User % is not the owner of task %', p_owner_id, v_task_id;
    END IF;

    IF v_task_status != 'OPEN' THEN
        RAISE EXCEPTION 'Cannot accept application: Task is already in status %', v_task_status;
    END IF;

    -- 1. Mark selected application as ACCEPTED
    UPDATE applications
    SET status = 'ACCEPTED'
    WHERE application_id = p_application_id;

    -- 2. Mark all other pending applications for this task as REJECTED
    UPDATE applications
    SET status = 'REJECTED'
    WHERE task_id = v_task_id AND application_id != p_application_id AND status = 'PENDING';

    -- 3. Create the 1:1 Assignment record
    INSERT INTO assignments (task_id, student_id, status, assigned_at)
    VALUES (v_task_id, v_student_id, 'ASSIGNED', CURRENT_TIMESTAMP)
    RETURNING assignment_id INTO v_new_assignment_id;

    -- 4. Update the Task status to ASSIGNED
    UPDATE tasks
    SET status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP
    WHERE task_id = v_task_id;

    RETURN v_new_assignment_id;
END;
$$;


ALTER FUNCTION public.fn_accept_application_transaction(p_application_id uuid, p_owner_id uuid) OWNER TO postgres;

--
-- Name: fn_calculate_student_earnings(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_calculate_student_earnings(p_user_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    total_amount NUMERIC(10, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0.00)
    INTO total_amount
    FROM payments
    WHERE receiver_id = p_user_id AND payment_status = 'SUCCESS';
    
    RETURN total_amount;
END;
$$;


ALTER FUNCTION public.fn_calculate_student_earnings(p_user_id uuid) OWNER TO postgres;

--
-- Name: fn_calculate_student_rating(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_calculate_student_rating(p_user_id uuid) RETURNS TABLE(average_rating numeric, total_reviews bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00)::NUMERIC(3,2) AS average_rating,
        COUNT(review_id)::BIGINT AS total_reviews
    FROM reviews
    WHERE reviewed_user_id = p_user_id;
END;
$$;


ALTER FUNCTION public.fn_calculate_student_rating(p_user_id uuid) OWNER TO postgres;

--
-- Name: trg_fn_prevent_self_application(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_prevent_self_application() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_owner UUID;
BEGIN
    SELECT owner_id INTO task_owner FROM tasks WHERE task_id = NEW.task_id;
    
    IF task_owner = NEW.student_id THEN
        RAISE EXCEPTION 'Database Integrity Constraint: A student cannot apply to a task they own (Task ID: %, User ID: %)',
            NEW.task_id, NEW.student_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_fn_prevent_self_application() OWNER TO postgres;

--
-- Name: trg_fn_update_task_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_update_task_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_fn_update_task_timestamp() OWNER TO postgres;

--
-- Name: trg_fn_validate_task_status_for_application(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_validate_task_status_for_application() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_status VARCHAR(20);
BEGIN
    SELECT status INTO current_status FROM tasks WHERE task_id = NEW.task_id;
    
    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Task does not exist (Task ID: %)', NEW.task_id;
    END IF;
    
    IF current_status != 'OPEN' THEN
        RAISE EXCEPTION 'Application rejected: Task is not open for applications. Current status: %', current_status;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_fn_validate_task_status_for_application() OWNER TO postgres;

--
-- Name: <=>; Type: OPERATOR; Schema: public; Owner: postgres
--

CREATE OPERATOR public.<=> (
    FUNCTION = public.cosine_distance_fallback,
    LEFTARG = public.vector,
    RIGHTARG = public.vector,
    COMMUTATOR = OPERATOR(public.<=>)
);


ALTER OPERATOR public.<=> (public.vector, public.vector) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    application_id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    student_id uuid NOT NULL,
    proposal text NOT NULL,
    proposed_amount numeric(10,2) NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    CONSTRAINT applications_proposed_amount_check CHECK ((proposed_amount > (0)::numeric)),
    CONSTRAINT applications_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'WITHDRAWN'::character varying])::text[])))
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignments (
    assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    student_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    status character varying(20) DEFAULT 'ASSIGNED'::character varying NOT NULL,
    submission_notes text,
    CONSTRAINT assignments_status_check CHECK (((status)::text = ANY ((ARRAY['ASSIGNED'::character varying, 'IN_PROGRESS'::character varying, 'SUBMITTED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    category_id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: content_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_embeddings (
    embedding_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(20) NOT NULL,
    entity_id uuid NOT NULL,
    content_text text NOT NULL,
    embedding public.vector,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT content_embeddings_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['STUDENT'::character varying, 'TASK'::character varying])::text[])))
);


ALTER TABLE public.content_embeddings OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    payer_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    paid_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['PENDING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    review_id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewed_user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    version character varying(100) NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    skill_id uuid DEFAULT gen_random_uuid() NOT NULL,
    skill_name character varying(100) NOT NULL,
    description text,
    category character varying(100) NOT NULL
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: student_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_skills (
    student_skill_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency_level character varying(20) DEFAULT 'INTERMEDIATE'::character varying NOT NULL,
    years_experience numeric(4,1) DEFAULT 1.0 NOT NULL,
    CONSTRAINT student_skills_proficiency_level_check CHECK (((proficiency_level)::text = ANY ((ARRAY['BEGINNER'::character varying, 'INTERMEDIATE'::character varying, 'ADVANCED'::character varying, 'EXPERT'::character varying])::text[]))),
    CONSTRAINT student_skills_years_experience_check CHECK ((years_experience >= (0)::numeric))
);


ALTER TABLE public.student_skills OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    task_id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    category_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    required_skills text,
    budget numeric(10,2) NOT NULL,
    deadline timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT tasks_budget_check CHECK ((budget > (0)::numeric)),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'ASSIGNED'::character varying, 'IN_PROGRESS'::character varying, 'SUBMITTED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    college character varying(150) NOT NULL,
    department character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'STUDENT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['STUDENT'::character varying, 'ADMIN'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: view_student_earnings_ledger; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_student_earnings_ledger AS
 SELECT p.payment_id,
    p.task_id,
    t.title AS task_title,
    c.category_name,
    p.amount,
    p.payment_status,
    p.paid_at,
    payer.user_id AS payer_id,
    payer.name AS payer_name,
    payer.college AS payer_college,
    receiver.user_id AS receiver_id,
    receiver.name AS receiver_name,
    receiver.college AS receiver_college
   FROM ((((public.payments p
     JOIN public.tasks t ON ((p.task_id = t.task_id)))
     JOIN public.categories c ON ((t.category_id = c.category_id)))
     JOIN public.users payer ON ((p.payer_id = payer.user_id)))
     JOIN public.users receiver ON ((p.receiver_id = receiver.user_id)));


ALTER VIEW public.view_student_earnings_ledger OWNER TO postgres;

--
-- Name: view_student_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_student_performance AS
 SELECT u.user_id,
    u.name,
    u.email,
    u.college,
    u.department,
    u.role,
    u.is_active,
    u.created_at AS member_since,
    COALESCE(sk.total_skills, (0)::bigint) AS total_skills,
    COALESCE(ap.total_applications_submitted, (0)::bigint) AS total_applications_submitted,
    COALESCE(ap.accepted_applications, (0)::bigint) AS accepted_applications,
    COALESCE(asg.completed_assignments, (0)::bigint) AS completed_assignments,
    (COALESCE(pay.total_earnings, 0.00))::numeric(10,2) AS total_earnings,
    (COALESCE(rev.average_rating, 0.00))::numeric(3,2) AS average_rating,
    COALESCE(rev.total_reviews_received, (0)::bigint) AS total_reviews_received
   FROM (((((public.users u
     LEFT JOIN ( SELECT student_skills.user_id,
            count(DISTINCT student_skills.skill_id) AS total_skills
           FROM public.student_skills
          GROUP BY student_skills.user_id) sk ON ((u.user_id = sk.user_id)))
     LEFT JOIN ( SELECT applications.student_id,
            count(applications.application_id) AS total_applications_submitted,
            count(
                CASE
                    WHEN ((applications.status)::text = 'ACCEPTED'::text) THEN 1
                    ELSE NULL::integer
                END) AS accepted_applications
           FROM public.applications
          GROUP BY applications.student_id) ap ON ((u.user_id = ap.student_id)))
     LEFT JOIN ( SELECT assignments.student_id,
            count(assignments.assignment_id) AS completed_assignments
           FROM public.assignments
          WHERE ((assignments.status)::text = 'COMPLETED'::text)
          GROUP BY assignments.student_id) asg ON ((u.user_id = asg.student_id)))
     LEFT JOIN ( SELECT payments.receiver_id,
            sum(payments.amount) AS total_earnings
           FROM public.payments
          WHERE ((payments.payment_status)::text = 'SUCCESS'::text)
          GROUP BY payments.receiver_id) pay ON ((u.user_id = pay.receiver_id)))
     LEFT JOIN ( SELECT reviews.reviewed_user_id,
            round(avg(reviews.rating), 2) AS average_rating,
            count(reviews.review_id) AS total_reviews_received
           FROM public.reviews
          GROUP BY reviews.reviewed_user_id) rev ON ((u.user_id = rev.reviewed_user_id)))
  WHERE ((u.role)::text = 'STUDENT'::text);


ALTER VIEW public.view_student_performance OWNER TO postgres;

--
-- Name: view_task_marketplace_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_task_marketplace_stats AS
 SELECT c.category_id,
    c.category_name,
    c.description AS category_description,
    COALESCE(t.total_tasks, (0)::bigint) AS total_tasks,
    COALESCE(t.open_tasks, (0)::bigint) AS open_tasks,
    COALESCE(t.in_progress_tasks, (0)::bigint) AS in_progress_tasks,
    COALESCE(t.completed_tasks, (0)::bigint) AS completed_tasks,
    (COALESCE(t.average_budget, 0.00))::numeric(10,2) AS average_budget,
    (COALESCE(t.total_budget_volume, 0.00))::numeric(10,2) AS total_budget_volume,
    COALESCE(app.total_applications, (0)::bigint) AS total_applications_received
   FROM ((public.categories c
     LEFT JOIN ( SELECT tasks.category_id,
            count(tasks.task_id) AS total_tasks,
            count(
                CASE
                    WHEN ((tasks.status)::text = 'OPEN'::text) THEN 1
                    ELSE NULL::integer
                END) AS open_tasks,
            count(
                CASE
                    WHEN ((tasks.status)::text = ANY ((ARRAY['ASSIGNED'::character varying, 'IN_PROGRESS'::character varying])::text[])) THEN 1
                    ELSE NULL::integer
                END) AS in_progress_tasks,
            count(
                CASE
                    WHEN ((tasks.status)::text = 'COMPLETED'::text) THEN 1
                    ELSE NULL::integer
                END) AS completed_tasks,
            round(avg(tasks.budget), 2) AS average_budget,
            sum(tasks.budget) AS total_budget_volume
           FROM public.tasks
          GROUP BY tasks.category_id) t ON ((c.category_id = t.category_id)))
     LEFT JOIN ( SELECT t_sub.category_id,
            count(a.application_id) AS total_applications
           FROM (public.applications a
             JOIN public.tasks t_sub ON ((a.task_id = t_sub.task_id)))
          GROUP BY t_sub.category_id) app ON ((c.category_id = app.category_id)));


ALTER VIEW public.view_task_marketplace_stats OWNER TO postgres;

--
-- Name: view_top_rated_freelancers; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_top_rated_freelancers AS
 SELECT u.user_id,
    u.name,
    u.college,
    u.department,
    round(avg(r.rating), 2) AS avg_rating,
    count(r.review_id) AS review_count,
    count(DISTINCT asg.assignment_id) AS completed_tasks
   FROM ((public.users u
     JOIN public.reviews r ON ((u.user_id = r.reviewed_user_id)))
     LEFT JOIN public.assignments asg ON (((u.user_id = asg.student_id) AND ((asg.status)::text = 'COMPLETED'::text))))
  GROUP BY u.user_id, u.name, u.college, u.department
 HAVING (count(r.review_id) >= 1)
  ORDER BY (round(avg(r.rating), 2)) DESC, (count(r.review_id)) DESC;


ALTER VIEW public.view_top_rated_freelancers OWNER TO postgres;

--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.applications (application_id, task_id, student_id, proposal, proposed_amount, applied_at, status) FROM stdin;
57bb57c0-7d3a-44bf-9547-a9444c58f1cd	16ddb780-99e3-4a02-8dee-52e289850649	3372584b-11df-4dbe-9c7c-4b87da4c2187	I have designed 10+ logos and badges for college clubs with Figma. Ready to deliver modern vector exports within 2 days.	600.00	2026-09-29 22:53:17.141063+05:30	ACCEPTED
8e3a2ef9-7ae6-4921-9f82-a754e6be3df2	aee1c4bd-688e-42b6-b745-b1c20d27a80c	3372584b-11df-4dbe-9c7c-4b87da4c2187	Hi! I am the head of design at BMSCE. I can create a vibrant retro-neon poster with custom typography and ready-to-print 300 DPI exports.	450.00	2026-09-29 22:53:17.141063+05:30	PENDING
2139cb3d-f1d9-47ed-9b0d-c350c2d79669	d6e3ace6-72c9-4811-ac56-7ba5e63379a6	bb461a1e-fd43-464b-99d3-f909373e45c0	I developed a similar QR scanner for PESU hackathon. Can implement with Next.js and camera API in 2 days.	950.00	2026-09-29 22:53:17.305068+05:30	ACCEPTED
47ea8540-a371-4198-a6ab-4b5e0f254df3	9c746442-fba6-46dc-ac44-1f266077ef12	a290d37f-202c-4251-aff1-ebb2283e436c	Specialized in print design and typography. Will deliver print-ready CMYK PDFs.	500.00	2026-09-29 22:53:17.305068+05:30	ACCEPTED
f389591a-92dd-4eaf-9a05-ac1d7778324d	59e1263d-34e1-4d6a-a445-a855b3fc65c6	d82aadf4-a980-4b41-b4a4-adcecf1b863b	I have pre-trained BERT and TF-IDF pipelines ready. Can deliver classified spreadsheet and charts.	800.00	2026-09-29 22:53:17.305068+05:30	ACCEPTED
106cee0e-a73b-4381-bac9-60b47b067c8a	fd780065-0fcb-4a1e-865b-8814b88757d2	97edacb5-7c99-48ff-aa2f-4c2897f9ebf9	Experienced with PostgreSQL indexing, vacuuming, and query plan optimization. Starting today.	850.00	2026-09-29 22:53:17.305068+05:30	ACCEPTED
c7ed0d9a-3ef8-4608-a38e-bc8e01839b83	56dcad08-c5f7-42e5-a6a2-fcd36963e7da	3073a443-b87f-412f-93e6-7016c53f5365	I have built multiple Next.js dashboards with PostgreSQL for campus hackathons. Can deliver in 3 days.	1400.00	2026-09-30 10:48:27.656682+05:30	ACCEPTED
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignments (assignment_id, task_id, student_id, assigned_at, started_at, submitted_at, completed_at, status, submission_notes) FROM stdin;
2769b2d5-5f72-4341-a2ec-15569a2abf5b	16ddb780-99e3-4a02-8dee-52e289850649	3372584b-11df-4dbe-9c7c-4b87da4c2187	2026-09-26 22:53:17.141063+05:30	2026-09-27 22:53:17.141063+05:30	2026-09-28 22:53:17.141063+05:30	2026-09-29 10:53:17.141063+05:30	COMPLETED	Delivered high-res PNG, SVG, and Figma community file link with dark and light variants.
5999ffb9-7353-4c6d-8588-8a2cb29dc2ac	d6e3ace6-72c9-4811-ac56-7ba5e63379a6	bb461a1e-fd43-464b-99d3-f909373e45c0	2026-09-25 22:53:17.305068+05:30	2026-09-26 22:53:17.305068+05:30	2026-09-27 22:53:17.305068+05:30	2026-09-28 22:53:17.305068+05:30	COMPLETED	Delivered functional web app with live camera scanner and real-time database sync.
211fe818-d1ef-4d9d-abae-32e30932f368	9c746442-fba6-46dc-ac44-1f266077ef12	a290d37f-202c-4251-aff1-ebb2283e436c	2026-09-25 22:53:17.305068+05:30	2026-09-26 22:53:17.305068+05:30	2026-09-27 22:53:17.305068+05:30	2026-09-28 22:53:17.305068+05:30	COMPLETED	Delivered print-ready 300 DPI PDF files with crop marks and digital web view.
c8aa3a92-03a3-49e4-994b-6d9af346cffb	59e1263d-34e1-4d6a-a445-a855b3fc65c6	d82aadf4-a980-4b41-b4a4-adcecf1b863b	2026-09-25 22:53:17.305068+05:30	2026-09-26 22:53:17.305068+05:30	2026-09-27 22:53:17.305068+05:30	2026-09-28 22:53:17.305068+05:30	COMPLETED	Provided cleaned dataset, confusion matrix, and interactive HTML summary report.
9e7e0191-3fb8-4566-9e15-4ff9904cb5ba	fd780065-0fcb-4a1e-865b-8814b88757d2	97edacb5-7c99-48ff-aa2f-4c2897f9ebf9	2026-09-28 22:53:17.305068+05:30	2026-09-29 10:53:17.305068+05:30	\N	\N	IN_PROGRESS	\N
bc9d4154-11af-421d-a6bb-e899297e3f96	56dcad08-c5f7-42e5-a6a2-fcd36963e7da	3073a443-b87f-412f-93e6-7016c53f5365	2026-09-30 10:48:27.731114+05:30	2026-09-30 10:48:27.760079+05:30	2026-09-30 10:48:27.765117+05:30	2026-09-30 10:48:27.771995+05:30	COMPLETED	Deployed to Vercel and pushed clean code to GitHub repository with full README and SQL schema.
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (category_id, category_name, description) FROM stdin;
8442cf84-bf6e-4b43-b0dc-85a696580e03	Software & Web Dev	Frontend, backend, API development, and web apps
60c12ae3-0df6-4077-8129-ae9ec73fa476	Graphic Design	Event posters, social media banners, and UI design
593e89cb-402b-45f5-a72d-6a87c282ebea	Data & AI	Python scripts, web scraping, data analytics, and ML models
54c34649-c5c5-4250-aae4-c3dc956705a1	Video & Animation	Short reels, video editing, motion graphics, and promos
96a75d13-0530-4ed7-9a4c-8c0770a8eac8	Technical Writing	Project reports, documentation, research summaries, and proofreading
1feb04f3-78a1-4f94-b517-95cb6fa81a68	Academic Tutoring	One-on-one subject mentoring, lab help, and concept explanation
\.


--
-- Data for Name: content_embeddings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_embeddings (embedding_id, entity_type, entity_id, content_text, embedding, created_at, updated_at) FROM stdin;
bdca0516-fd70-4a5c-a9d7-9d4bf95bc815	STUDENT	518c8f59-bc40-492c-a6e6-ab86c8f27954	Student: Priya Nair. Department: AI & Machine Learning. College: PES University. Skills: Machine Learning (Data & AI) level:ADVANCED exp:1.5yrs, Pandas (Data & AI) level:ADVANCED exp:2.0yrs, Python (Data & AI) level:EXPERT exp:3.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.011765,-0.011765,0,-0.011765,0,0,0.023531,0,0,0,0,0,0,-0.023531,0,-0.023531,0,0,0,-0.023531,0,0,0.011765,0,0,-0.011765,0,-0.011765,0,0,0,0,0,0,0.011765,0,0,-0.011765,0,0,0,-0.011765,0,0,0,0,0.023531,0,0,0,0,-0.023531,0,0,0.011765,0,0,0,0,0,0,0,0,0,0,0,0.035473,0.019689,0.032462,0.05352,0.08824,0.05352,0.032462,-0.015607,0.011942,0,0,0,0,0,0,0,0,0,0,0,0.011765,0,0,0,0,0,0,-0.023531,0,0,0,0,0,-0.011765,0,-0.011765,0.011765,-0.011765,0,-0.011765,0,0,0,0,0,0,0,0,0,-0.011765,0,0,0,-0.023531,0,-0.011765,0.035296,0,0,0,0,0,0,0,0,-0.011765,0,0,0,0,0,0,0,-0.011765,0.011765,0,0.035296,0,0,0,0,0,0,0,0.047061,-0.035296,0,0,0,0,0,-0.011765,0,0,0,-0.011765,0,-0.023531,0.023531,-0.011765,0.011765,0,0,0,0,0,0,-0.035296,0.011765,0,0,0,0,0,0.011765,-0.011765,0,0,0.011765,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.011765,0,0,0.011765,0,0,0,0.011765,0,0.023531,0,0,0,0.035296,0,0,0,0.011765,0,0,0,0,0,0.011765,0,0,0,0,0,0,0,0,0,0,0,0,-0.011765,0,-0.011765,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.023531,0,0,0,0,-0.023531,0.023531,-0.011765,0,-0.011765,0.011765,-0.011765,0,-0.011765,0,0,0,0,0,-0.023531,0,-0.129419,0.011765,0,0,0,0,-0.011765,0,0,0,-0.011765,0,-0.011765,0,0,0,0,0,-0.011765,0,-0.011765,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.035826,0.059067,0.109327,0.18025,0.297183,0.214082,0.233394,0.191344,0.233784,0.273149,0.441769,0.340812,0.33879,0.239318,0.200932,0.069368,0.056346,0.019689,0.023707,0,0,0,0.047061,-0.011765,0,0,0,0,0,0,0,0,0.023531,0,0.035296,0,0,0,0,0,0,0,0,-0.035296,0,0,0,0,0.011765,0,0.011765,0,0.011765,0,0,0,0,0,0,-0.011765,0,0,0,0}	2026-09-29 22:53:17.229578+05:30	2026-09-29 22:53:17.337873+05:30
ad2cf4dc-9604-496b-8ed0-993917f4f2dc	STUDENT	a734fc91-fc42-4d07-a7ff-401023cb4778	Student: Rohit Verma. Department: Information Science. College: RVCE. Skills: Python (Data & AI) level:INTERMEDIATE exp:1.0yrs, Technical Writing (Technical Writing) level:ADVANCED exp:2.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.030194,-0.030194,0,-0.030194,0,0,0,-0.060388,0.090583,0,0.060388,0,0.060388,0,0,-0.030194,0,0,0,-0.030194,0,0,0.030194,0,0,-0.120777,0.030194,0,0,-0.060388,0,-0.030194,0,0,0,0,0,0,0,0,0,-0.030194,0.030194,0,0,0,0.060388,0,0,0,0,-0.030194,0,0,0.030194,0,0,0,0,0,0,0,0,0,0,0,0.060842,0.050529,0.083309,0.137353,0.226457,0.137353,0.083309,-0.009859,0.030648,0,0.030194,0,0,0,0,0,0.030194,0,0,0,0.030194,0,0,0,0,0,0,0,0,0,0.060388,0,0,-0.030194,0,-0.030194,0,0,0,-0.030194,0.030194,0,0,0,0.060388,0,0,0,0,-0.030194,0,0,0,-0.060388,0,-0.030194,0.060388,0,0,0,0,0,0,0,0,-0.030194,0,0,0.060388,0,0,0,0.030194,-0.030194,0.030194,0,0.030194,0,0,0,0.030194,0,0,0,0.090583,-0.030194,0,0,0,0,0,0,0.060388,0,0,-0.030194,0,-0.090583,0,-0.030194,0.030194,0,0,-0.060388,0,0,0,-0.030194,0,0,0.030194,0,0,-0.030194,0.030194,0,0,0,0,0,0,0,0,0,0,-0.030194,0,0,0,0,0,0,0,-0.030194,0,-0.030194,0,-0.030194,0,0,0.030194,0,0.060388,0,0,0,0.060388,0,0,0,0.030194,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.061295,0.101059,0.166618,0.274706,0.452914,0.274706,0.166618,0.101059,0.061295,0,0,0,0,-0.060388,0.030194,-0.030194,0,-0.030194,0.060388,-0.030194,0,0,0,0,0,0,0.030194,-0.060388,0,-0.181165,0,0,0,-0.030194,0,-0.030194,0,0,0,0,0,-0.030194,0,0,0,0,0,-0.030194,0,0,0,0,0,0,0,-0.030194,0,0,0,0,0,0,0,0,0.030648,0.050529,0.083309,0.137353,0.226457,0.137353,0.113956,0.101059,0.113956,0.137353,0.226457,0.137353,0.083309,0.050529,0.091036,0,0,0,0.030194,0,0,0,0.030194,0,0,0,0.030194,0,0.030194,0,0,-0.030194,0.030194,-0.030194,0.090583,0,0,0,0,0,0,0,0,-0.090583,0,0,0,-0.030194,0,0,0.030194,0,0.030194,0,0,0,0,0,0,-0.030194,0.030194,0,0,0}	2026-09-29 22:53:17.235014+05:30	2026-09-29 22:53:17.340013+05:30
af4e1901-7672-4d83-96a7-46ef15a9e05c	STUDENT	3372584b-11df-4dbe-9c7c-4b87da4c2187	Student: Ananya Rao. Department: Design & Media. College: BMSCE. Skills: Canva (Graphic Design) level:EXPERT exp:3.0yrs, Figma (Graphic Design) level:EXPERT exp:2.5yrs, Photoshop (Graphic Design) level:ADVANCED exp:2.0yrs, Video Editing (Video & Animation) level:ADVANCED exp:1.5yrs. Completed Tasks: 1. Rating: 5.00.	{0.012012,-0.012012,0.036037,-0.012012,0.012012,0,0,0,0.012012,0,0,0,0.012012,0,0,-0.036037,0,-0.024025,0.012012,0,0,-0.012012,0.012012,0,0,-0.072075,0.012012,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.012012,0.04805,0,0,0,0.024025,0,0,0,0,-0.024025,0,0,0.012012,0,0,0,0,0,0,0,0,0,0,0,0.024025,0,0,0,0,0,0,-0.024025,0,0,0.012012,0,0,0,0,0,0,0,0,0,0.04805,0,0,0,0,0,0,0,0,0,0,0,0,-0.012012,0,-0.012012,0,-0.024025,0,-0.012012,0,0,0,0,0,0,0,0,0,-0.012012,0,0,0.012012,-0.024025,0,-0.012012,0.04805,-0.04805,0,-0.012012,0,0,0,0,0.012193,0.00809,0.057349,0.074747,0.13543,0.129391,0.217164,0.209801,0.268003,0.293324,0.417722,0.23868,0.181345,0.128705,0.196251,0.163933,0.27028,0.163933,0.09943,0.060308,0.072616,0,0,0,0,-0.012012,0,0,0.012012,0,0.012012,-0.04805,0,-0.024025,0,-0.012012,0.012012,0,0,0,0.012012,0,0,0,0,0,0,0,0,0,0.012012,-0.012012,0,-0.012012,0.012012,0,0.012012,0,0,0,0,0,0,0,0.024386,0.040205,0.07848,0.129391,0.21333,0.163933,0.15638,0.082837,0.069722,0.040205,0.045336,0.042632,0.102106,0.054644,0.057168,-0.027947,0.012193,0,0.04805,0,0,0,0.012012,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.024025,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.024025,0.060062,-0.012012,0,-0.012012,0.072075,-0.012012,0,0,0.012012,0,0,0,0,-0.024025,0,-0.192199,0,0,0,0,0,0,0,0,0,0,0,-0.012012,0,0,0,0,0,-0.012012,0,0,0,0,0,0,0,0,0,0,0,-0.012012,0,-0.012012,0,0,0.012012,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.012012,0,0.012012,0,0.012012,0,0.024025,0,0,0,0,0,0.012012,0,0,0,0.012012,0,0.024025,0,0,0,0,0,0,-0.012012,0,-0.036037,0.012012,0,0,0,0,-0.036037,0,0,0.012012,0,0,-0.012012,0,-0.012012,0,0,0.012012,0,0,0}	2026-09-29 22:53:17.237624+05:30	2026-09-29 22:53:17.343097+05:30
99cea402-a973-405b-a813-ffaba8fba6bf	TASK	34021728-6a60-492f-98b0-685a961bf775	Task: Next.js Hackathon Registration Landing Page. Category: Software & Web Dev. Required Skills: Next.js, React, Tailwind, UI. Description: Need a clean single-page Next.js site with form validation for college hackathon registrations. Must have sleek dark mode aesthetics.. Budget: ₹1200.00.	{0.035836,0,0.035836,0,0,0,0.036374,0.024134,0.242217,0.055509,0.340439,0.163016,0.098874,0.05997,0.072209,0,0.035836,0,0.072209,0.05997,0.098874,0.163016,0.268767,0.163016,0.098874,-0.011701,0.21609,0.05997,0.098874,0.163016,0.268767,0.163016,0.098874,0.05997,0.072209,0,0,0,0.035836,0,0,0,0,0,0,-0.035836,0.107507,0,0.035836,0,0.035836,0,0,0,0,0,0.035836,0,0,0,0,0,0.107507,0,0,0,0,0,0.035836,0,0,0,0,-0.035836,0,-0.035836,0,0,0,-0.035836,0,0,0,0,0.071671,0,0.035836,0,0,0,0.071671,0,0.035836,0,0,0,0,0,0,0,0,-0.035836,0,0,0,0,0.035836,0,0,0,0,0,0.107507,0,0,-0.035836,0,-0.035836,0.035836,0,0,-0.035836,0,0,0,-0.035836,0,-0.071671,0,0,0,-0.035836,0,0,0.035836,-0.071671,0,0,0.143343,0,0,-0.035836,0,0,0,0,0.035836,0,0,-0.107507,0.215014,-0.035836,0,-0.035836,0.107507,0,0.035836,-0.107507,0,0,0,-0.035836,0,0,0,-0.071671,0.035836,-0.035836,0,0,0,0,0,0,0,0,0,-0.071671,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.035836,-0.035836,0,-0.071671,0,-0.071671,0,-0.035836,0,0,0.035836,0,0.035836,-0.071671,0,0,0.035836,0,0,0,0.035836,0,0,0,0.035836,0,0.071671,0,0,0,0.035836,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.071671,0,0,0,0,0,-0.071671,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.071671,-0.035836,0,0,0.035836,0,0.107507,0,0,-0.071671,0.035836,0,0.071671,-0.035836,0.035836,-0.035836,0,0,0,0,0.035836,0,0.071671,0,0.035836,-0.215014,0,-0.071671,0,0,0,0,0,-0.035836,0,0,0.035836,0,0,-0.071671,0,0,0.107507,0,0.035836,0,0,0,0,0,0,0,0,0,0,0,0,0,0.035836,0,0,0,0,-0.035836,0,0,0,0,0,0,0,0,0,0,0.035836,-0.035836,0,0,0.035836,-0.035836,0,0,0,0,0,0,0.107507,-0.035836,0,0,0.071671,0,0,-0.035836,0,0,0.035836,-0.035836,0,0,0,0,0,0,0,-0.071671,0.035836,0,0.035836,0,0,-0.107507,0,0,0,-0.071671,0,0,0,0}	2026-09-29 22:53:17.243895+05:30	2026-09-29 22:53:17.370355+05:30
485f775e-0ed6-4e54-90dc-32e0a90e402d	TASK	16ddb780-99e3-4a02-8dee-52e289850649	Task: AI Symposium Logo and Badge Design. Category: Graphic Design. Required Skills: Figma, Canva, Logo Design. Description: Create minimalist vector logo and volunteer ID card badge for IEEE AI symposium.. Budget: ₹600.00.	{0,0,0.018556,0,0.018556,-0.018556,0,0,0.018556,0,0.018556,0,0,0,0,0,0,0,0.018556,0,0,0,0.037112,0,0,-0.055668,0.018556,0,0,0,0,0,0,0,0.018556,0,0.037112,0,0,0,0,0,0,0,0.037112,-0.018556,0.055668,0,0,0,0,0,0,0,0.018556,0,0.018556,0,0,0,0,0,0,0,0,0,0,0,0,-0.018556,0,0,0,-0.037112,0,0,0,0,0,0,0,0,0.018556,-0.018556,0,0,0.055668,0,0,0,0.018556,0,0.018556,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.018556,0,-0.018556,0.018556,0,0,-0.018556,0,-0.055668,0,0,0,0,0,0,0.018835,0.031053,0.051198,0.010187,0.158004,0.115464,0.102395,0.115464,0.17656,0.084411,0.051198,0.012497,0.037669,0.012497,0.163369,0.17757,0.329875,0.337643,0.468707,0.284285,0.172428,0.037491,0.056504,0,0,0,0,0,0.018556,0,0,-0.018556,0,0,0,0,0.018556,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037112,0,0,0.055668,-0.018556,0,0,0,-0.018556,0,0,0,0,0.018556,0,0,-0.055668,0.018556,-0.018556,0.037112,0,0,-0.018556,0,0,0,0,0,0,0.018556,-0.037112,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.018556,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.018556,0,0,-0.037112,0.074224,0,0.037112,0,0.037112,0,0,0,0,0,0,0,0.037112,0,0,0,0,0,0,0,0,-0.055668,0,-0.018556,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.018556,0,0,-0.018556,0,-0.018556,0,0,0,0,0.055668,0,0,0,0.037669,0.024994,0.102395,0.168821,0.278339,0.168821,0.102395,0.062106,0.037669,0,0.018556,0,0.018835,0.031053,0.069754,0.084411,0.157726,0.047299,0.08831,0.031053,0.018835,0,0.037112,0,0,-0.018556,0,0,0,0,0.018556,-0.018556,0,0,0,-0.018556,0,0,0,0,0,0,0,-0.037112,0.018556,0,0,0,0,0,0,0,0,-0.018556,0,0,0,0}	2026-09-29 22:53:17.245133+05:30	2026-09-29 22:53:17.372638+05:30
cd6d3d01-3cb1-439f-9316-e6a079b39fbc	TASK	aee1c4bd-688e-42b6-b745-b1c20d27a80c	Task: College Fest Poster & Instagram Banner. Category: Graphic Design. Required Skills: Canva, Photoshop, Figma, Graphic Design. Description: Need a stunning vibrant A3 poster for our annual college fest. Should follow neon retro theme with event dates, venue, and QR code for registrations.. Budget: ₹450.00.	{0.038434,0,0.038434,0,0.038434,0,0,0,0.038434,0,0.019217,0,0,-0.019217,0,-0.019217,0,0,0,-0.019217,0,0,0,0,0,-0.076868,0.038434,0,0,0,0,0,0,-0.019217,0.019217,0,0,0,0,0,0,0,0,0,0,-0.019217,0.038434,0,0.019217,0,0,0,0,0,0,0,0.019217,0,0,0,0,0,0,0,0,0,0,0,0.019217,0,0,0,0,-0.019217,0,0,0,0,0,0,0,0,0,0,0,0,0.076868,0,0,0,0.019217,0,0.019217,0,0,0,0,0,0,0,0,-0.038434,0,0,0,0,0,0,0,-0.019217,0,-0.019217,0,0,0,-0.019217,0,-0.019217,0.019217,0,0,-0.019217,0,-0.038434,0,0,0,0,0,0,0.019506,-0.006275,0.091744,0.119577,0.255089,0.187778,0.250171,0.206995,0.274884,0.183896,0.197788,0.187778,0.346773,0.200721,0.288955,0.239155,0.365701,0.174836,0.106043,0.064319,0.058228,-0.019217,0,0,0.019217,0,0,-0.019217,0.019217,-0.019217,0.019217,-0.038434,0,-0.019217,0.038434,-0.038434,0.019217,0,0,-0.019217,0.019217,0,0,0,0,0,0,-0.019217,0,0,0.019217,-0.019217,0,0,0,0,0.038434,0,0,0,0,0,0,0,0,-0.019217,0,-0.019217,0.019217,0,0,-0.057651,0,0,0.019217,-0.019217,0.038434,-0.019217,0,-0.057651,0,0,0.076868,0,0,0,0.019217,0,0,0,0,0,0.019217,0,0,0,0.019217,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.038434,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.019217,0,0,0,0,0.057651,0,0.019217,-0.057651,0.057651,0,0.057651,0,0.019217,0,0.019217,0,0,-0.019217,0,0,0.019217,-0.038434,0,-0.057651,0.019217,-0.019217,0,0,0,-0.038434,0,-0.019217,0,0,0,-0.019217,0,-0.057651,0,-0.019217,0,0,0,0,0,0,0,0,0,-0.019217,0,-0.019217,0,0,0,0,0.019217,0,0,0,0,0,0,0,0,0,0,0,0,-0.019217,0.019217,0,0,0,0,0,0.019217,-0.019217,0,0,0,0,0,0,0,0,0.019217,-0.038434,0.019217,0,0,-0.019217,0,-0.019217,0,-0.019217,0,-0.019217,0.019217,0,0.019217,0,0,-0.076868,0.019217,0,0.019217,-0.019217,0,-0.019217,0.019217,-0.019217,0.019217,0,0,0,0.019217,0}	2026-09-29 22:53:17.246362+05:30	2026-09-29 22:53:17.373413+05:30
d3281f87-a3e7-443c-bfc1-c464030aeee4	STUDENT	031ff5de-dbb0-4999-be82-6874bba70fb4	Student: Aarav Sharma. Department: Computer Science. College: PES University. Skills: Next.js (Software & Web Dev) level:ADVANCED exp:2.0yrs, PostgreSQL (Software & Web Dev) level:ADVANCED exp:1.5yrs, React (Software & Web Dev) level:EXPERT exp:2.5yrs. Completed Tasks: 0. Rating: 0.00.	{0.024517,-0.049033,0,-0.024517,0,0,0.024885,0.041028,0.067644,0.111526,0.257425,0.111526,0.09216,0.041028,0.024885,-0.07355,0,0,0.024517,0,0,0,0.024517,0,0,-0.049033,0.074654,0.098567,0.202931,0.334577,0.551625,0.334577,0.202931,0.123084,0.074654,0,0,0,0,0,0,-0.024517,0,0,0,0,0.049033,0,0,0,0.024517,-0.049033,0,0,0.024517,0,0,0,0,0,0,0,0.07355,0,0,0,0.049033,0,0,0,0,0,0,-0.049033,0,0,0,0,0.024517,0,0.024517,0,0.024517,0,0.1471,0,0.024517,0,0,0,0.024517,0,0.024517,0,0,0,0,0,0,-0.024517,0,-0.024517,0.024517,-0.024517,0,-0.024517,0,0,0,0,0,0,0.024517,0,0,-0.024517,0,0,0,-0.024517,0,-0.024517,0.07355,0,0,-0.07355,0,0,0,0,0,-0.049033,0,0,0.024517,0,0,0,0,0,0.024517,0,0,0,0.024517,0,0,0,0,0,0.049033,0,0,-0.024517,0,0,0,0,0,0,0,-0.024517,0,-0.049033,0,-0.024517,0.07355,-0.024517,0,0,0,0,0.024517,0,0.024517,0,0,0,0,0,0.024517,0,0,0,0.024517,0,0,0,0,0,0,-0.024517,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.024517,0,0.07355,0,0,0,0.098067,0,0,0,0.024517,0,0,0,0,0,0.024517,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.024517,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.049033,0.098067,-0.024517,0,-0.024517,0.049033,-0.024517,0,-0.07355,0,0,0,0,0.024517,-0.049033,0,-0.269683,0.024517,0,0.024517,-0.07355,0,-0.024517,0,0,0,0,0,-0.024517,0,0,0,0,0,-0.024517,0,0,0.024517,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.024517,0.024517,0,0,0,0,0,0,0,0,0,0.07355,0,0,0,0.049033,0,0,0,0.024517,0,0,0,0,-0.024517,0,0,0.024517,0,0,0,0,0,0.07355,-0.07355,0,-0.07355,0,0,0,0,0.024517,0,0.024517,0,0.024517,0,0,-0.024517,0,-0.024517,0,0,0,0,0,0}	2026-09-29 22:53:17.222806+05:30	2026-09-29 22:53:17.334753+05:30
1aec117b-5d86-4ad9-8d14-0aab5723f2f7	TASK	e1ca24f1-1ee8-4e9e-9266-3128546725f9	Task: Robotics Club Teaser Video & Reel. Category: Video & Animation. Required Skills: Video Editing, Reels, Premiere. Description: Edit raw footage of our battle bots competition into a fast-paced 60-second Instagram Reel with sync audio and captions.. Budget: ₹500.00.	{0,-0.020578,0.020578,-0.020578,0,0,0,0,0.082313,0,0.041156,0,0,0,0.020578,-0.041156,0,-0.082313,0.020578,0,0.020578,0,0.020578,0,0,-0.061734,0.082313,0,0,0,0,-0.020578,0,0,0.041156,0,0,-0.020578,0,0,0,0,0.102891,0,0,-0.020578,0.061734,0,0,0,0,-0.020578,0,0,0,0,0.020578,0,0.020578,0,0,0,0,-0.020578,0,0,0.020578,0,0,0,0,0,0,-0.020578,0,0,0.061734,0,0,0,0,-0.020578,0,0,0,0,0.061734,-0.020578,0.020578,0,0.020578,0,0.020578,0,0,0,0.020578,0,0,0,0,0,0,0,0,0,0,0,0.020578,-0.020578,0,0,0,0,0,-0.041156,0,-0.020578,0.020578,0,0,-0.020578,0,0,0,0,0,-0.020578,0,0,0.020578,0,0,0,0,0,0,0,0,0,0.020578,-0.020578,0,0,0,0,0.041156,0,0,-0.020578,0.020578,0,0.020578,0,0.061734,0,0.020578,-0.020578,0.061734,0,0.020578,-0.020578,0,0,0.020578,0,0.020578,0,0.020578,0,0,0,0,0,0.020578,0,0.020578,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.062661,0.103311,0.191218,0.274109,0.540363,0.333282,0.345554,0.210779,0.176215,0.128047,0.216688,0.128047,0.134132,0.128047,0.175223,0.09361,0.056777,0.034437,0.020887,0,0,0,0,0,0,-0.020578,0,0,0.020578,0,0,0,0.020578,0,0,0,0,-0.020578,0,0,0,0,0,0,0,0,0,0,0,-0.020578,0,-0.020578,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.020578,0,0,0,0,0.061734,0,0.020578,-0.041156,0.082313,0,0,0,0.020578,0,0,0,0.020578,0,0,0,0.020578,-0.020578,0,0,0,-0.020578,0,0,0,0,0,-0.020578,0,0,0.041156,0,0,-0.020578,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.020578,0,0,0,-0.020578,0.020578,0,0,0,0,0,0.020578,0,0,0,0,0,0,-0.020578,0,0,0.041156,0,0,0,0.020578,-0.041156,0,0,0,0,0.020578,0,0.020578,0,0.020578,0,0.020578,0,0,-0.061734,0,0,0,-0.020578,0,0,0.020578,0,0.041156,-0.020578,0,-0.020578,0.020578,0,0.020578,0,0,0,0,-0.020578,0,0,0.020578,0,0,0}	2026-09-29 22:53:17.248509+05:30	2026-09-29 22:53:17.377811+05:30
56cd79ae-1264-4145-ac31-0aaab7a417f6	TASK	0ff604ef-22fb-4201-8ee8-a8ef90ab1ae0	Task: DBMS Project Report Formatting & Proofreading. Category: Technical Writing. Required Skills: Technical Writing, Documentation, Report. Description: Proofread and format our Level 3 DBMS academic project report into standard IEEE conference style with ER diagram captions.. Budget: ₹350.00.	{0,0,0.022028,0,0,0,0.044056,-0.044056,0.11014,-0.022028,0.066084,0,0,0,0.022028,0,0,0,0,0,0,0,0.044056,0,0,-0.088112,0.066084,0,0,-0.044056,0,0,0,-0.022028,0.044056,0,0.066084,-0.022028,0.022028,0,0,0,0,0,0,-0.022028,0.044056,0,0,0,0,0,0,0,0,0,0.022028,0,0,0,0,0,0,0,0,0,0,0,0,-0.022028,0,0,0,-0.044056,0,0,0,0,0,0,0,0,0.044717,0.051699,0.121555,0.20041,0.396503,0.20041,0.143582,0.073727,0.066745,0,0.022028,0,0,0,0,0,0,0,0,0,0,0,0,0,0.044056,0,0,0,0.044056,0,0,-0.066084,0,-0.022028,0,-0.022028,0.022028,0,0,-0.022028,0,-0.044056,0,0,0,0,0,0,0,0,0,0,0.044056,-0.022028,0.044056,0,0,0,0.022028,-0.022028,0,0,0,0,0.022028,0,0,-0.022028,0.022028,0,0,0,0,0,0,-0.022028,0.066084,0,0.022028,-0.044056,0,-0.044056,0,0,0.022028,-0.022028,0,-0.044056,0,0,0,0,0,-0.044056,0,0,0,0,0,0,0,0,0.044056,0,0,-0.022028,0,0,0,0,0,0,0,0,0,-0.022028,0,-0.022028,0,-0.044056,0,0,0.022028,-0.044056,0.022028,0,0.022028,0,0.044056,-0.066084,0.022028,0,0,0,0,0,0,0,0,0,0.022028,0,0,0,0.022028,0,0,0,0,0,0,0,0.044056,-0.022028,0,0,0,0,0,0,0,-0.044056,0,0,0,0,0,0,0,0,0,0,0,0,0.022359,0.036863,0.060777,0.100205,0.209927,0.173931,0.182332,0.237273,0.419193,0.215245,0.182332,0.173931,0.231955,0.100205,0.104833,0.036863,0.022359,-0.044056,0.066084,-0.022028,0,-0.044056,0.022028,0,0,-0.044056,0,-0.022028,0,-0.11014,0.022028,0,0,0,0,0,0,0,0,0,0,-0.022028,0,0,0.022028,-0.11014,0,0,0,0,0.022028,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.022028,0.022028,0,0,0,0.022028,0,0.044056,0,0,0,0,-0.022028,0.044056,-0.022028,0,0,0.022028,0,0,0,0.022028,-0.044056,0,0,0.022028,-0.022028,0,0,0,0,0.044056,0,0.088112,0,0,-0.044056,0,-0.022028,0,-0.044056,0,-0.022028,0,0,0,-0.022028,0,-0.022028,0.022028,0,0.022028,0,0,0,0,0,0,0,0.022028,0,0,-0.022028}	2026-09-29 22:53:17.24928+05:30	2026-09-29 22:53:17.379718+05:30
7c4e4d24-5a42-4555-80bf-5d751e76dd14	STUDENT	23d84a15-a015-43b4-a53d-14c8a7f441a2	Student: Karthik Gowda. Department: Electronics & Comm. College: PES University. Skills: Content Writing (Technical Writing) level:INTERMEDIATE exp:1.0yrs, Video Editing (Video & Animation) level:EXPERT exp:2.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.020539,-0.041077,0.020539,-0.020539,0,0,0,-0.020539,0.061616,0,0.041077,0,0,0,0,-0.041077,0,-0.041077,0.020539,0,0,0,0.041077,0,0,-0.102693,0.020539,-0.020539,0,-0.041077,0,0,0,0,0,0,0,0,0,0,0,-0.020539,0.082154,0,0,0,0.041077,0,0,0,0,0,0.020539,0,0.020539,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061616,0,0,0.020539,0,0,0,0,-0.020539,0,0,0,0,0.020539,0,0,0,0,0,0,0,0,0,0.020539,0,0,-0.041077,0,-0.020539,0.020539,-0.020539,0,-0.020539,0,0,0,0,0.041077,0,0,0,0,-0.020539,0,0,0,-0.041077,0,-0.020539,0.041077,0,0,0,0,0,0,0,0,-0.020539,0,0,0,0,0,0,0.020539,0,0.020539,0,0,0,0,0,0.020539,0,0,0,0.061616,0,0,0,0,0,0,0,0.061616,0,0,-0.041077,0,-0.020539,0,-0.020539,0.020539,0,0,-0.020539,0,0,0,0,0.020539,0,0,0,0,-0.020539,0.020539,0,0,0,0,0,0,0,0,0,0,0,0,0,0.041694,0.068742,0.134183,0.22123,0.364746,0.280288,0.267375,0.162171,0.119209,0.068742,0.077515,0.093429,0.174578,0.093429,0.056668,0.013832,0.020847,0,0.041077,0,0,0,0.020539,0,0,0,0,0,0.020539,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.020539,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.020539,0,0,0,0.041694,0.068742,0.134183,0.22123,0.364746,0.280288,0.267375,0.162171,0.098362,0.034371,0.041385,0,0,-0.041077,0.082154,-0.020539,0,-0.020539,0.020539,-0.020539,0,0,0,0,0,0,0,-0.041077,0,-0.184847,0.041077,0,0,-0.020539,0,-0.020539,0,0,0,0,0,-0.020539,0,0,0,0,0,-0.020539,0,-0.020539,0,0,0,0,0,0,0,0,0,0,0,-0.020539,0,0,0,0,0,0,0,0,0,0,0.020539,0,0,0,0,0,0.020539,-0.020539,0,0,0.020539,0,0,0,0,0,0,0,0,0,0.061616,0,0,-0.041077,0.020539,0,0.082154,0,0,0,0.020539,0,0,0,0.020539,-0.082154,0,0,0,-0.020539,0.020539,0,0.020539,0,0.020539,-0.041077,0,0,0,0,0,0,0.020539,0,0,0}	2026-09-29 22:53:17.240928+05:30	2026-09-29 22:53:17.345763+05:30
5b46ece5-3063-4105-9505-249a4a6c83cd	STUDENT	bb461a1e-fd43-464b-99d3-f909373e45c0	Student: Devika Menon. Department: Computer Science. College: PES University. Skills: Next.js (Software & Web Dev) level:ADVANCED exp:2.0yrs, React (Software & Web Dev) level:EXPERT exp:2.5yrs. Completed Tasks: 1. Rating: 5.00.	{0.033606,-0.067213,0,-0.033606,0,0,0.034111,0.056239,0.092723,0.152874,0.31926,0.152874,0.126329,0.056239,0.034111,-0.067213,0,0,0.033606,0,0,0,0.033606,0,0.033606,-0.067213,0.068222,0.078872,0.185446,0.305749,0.504094,0.305749,0.185446,0.112479,0.068222,0,0,0,0,0,0,-0.033606,0,0,0,0,0.067213,0,0,0,0.033606,-0.033606,0,0,0.033606,0,0,0,0,0,0,0,0.067213,0,0,0,0.033606,0,0,0,0,0,0,-0.067213,0,0,0,0,0,0,0,0,0.033606,0,0.134425,0,0.067213,0,0,0,0,0,0,0,0,0,0,0,0,-0.033606,0,-0.033606,0.033606,-0.033606,0,-0.033606,0,0,0,0,0,0,0.033606,0,0,-0.033606,0,0,0,-0.033606,0,-0.033606,0.067213,0,0,-0.067213,0,0,0,0,0,-0.033606,0,0,0,0,0,0,0,0,0.033606,0,0,0,0,0,0,0,0,0,0.067213,0,0,0,0,0,0,0,0,0,0,-0.033606,0,-0.033606,0,-0.033606,0.067213,0,0,0,0,0,0,0,0.033606,0,0,0,0,0,0.033606,0,0,-0.033606,0,0,0,0,0,0,0,-0.033606,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033606,0.033606,0,0.067213,0,0,0,0.067213,0,0,0,0.067213,0,0,0,0,0,0.033606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033606,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.067213,0.100819,-0.033606,0,-0.033606,0.033606,-0.033606,0,-0.100819,0,0,0,0,0,-0.067213,0,-0.26885,0.033606,0,0,-0.100819,0,-0.033606,0,0,0,0,0,-0.033606,0,0,0,0,0,-0.067213,0,0,0.033606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033606,0.033606,0,0,0,0,0,0,0,0,0,0.067213,0,0,0,0.033606,0,0,0,0.033606,0,0,0,0,0,0,0,0.033606,0,0,0,0.033606,0,0.067213,-0.067213,0,-0.100819,0,0,0,0,0.033606,0,0,0,0.033606,0,0,-0.033606,0,-0.033606,0,0,0,0,0,0}	2026-09-29 22:53:17.347913+05:30	2026-09-29 22:53:17.347913+05:30
152aeddd-5c48-476f-8877-cea5c2e6a635	STUDENT	d82aadf4-a980-4b41-b4a4-adcecf1b863b	Student: Rohan Deshmukh. Department: AI & Machine Learning. College: RVCE. Skills: Machine Learning (Data & AI) level:ADVANCED exp:2.0yrs, Pandas (Data & AI) level:ADVANCED exp:1.5yrs, Python (Data & AI) level:EXPERT exp:3.0yrs. Completed Tasks: 1. Rating: 4.00.	{0.011793,-0.011793,0,-0.011793,0,0,0.023585,0,0,0,0,0,0.011793,-0.023585,0,-0.023585,0,0,0,-0.023585,0,0,0.011793,0,0,-0.011793,0,0,0,0,0,-0.011793,0,0,0,0,0,0,0,0,0,-0.011793,0,0,0,0,0.023585,0,0,0,0,-0.023585,0,0,0.011793,0,0,0,0,0,0,0,0,0,0,0,0.035555,0.019735,0.032537,0.053645,0.088445,0.053645,0.032537,-0.003851,0.01197,0,0,0,0,0,0,0,0,0,0,0,0.011793,0,0,0,0,0,0,-0.023585,0,0,0,0,0,-0.011793,0,-0.011793,0,-0.011793,0,-0.011793,0,0,0,0,0,0,0,-0.011793,0,-0.011793,0,0,0,-0.023585,0,-0.011793,0.047171,0,0,0,0,0,0,0,0,-0.011793,0,0,0,0,0,0,0,-0.011793,0.011793,0,0.035378,0,0.011793,0,0,0,0,-0.011793,0.035378,-0.035378,0,0,0,0,0,-0.011793,0,0,0,-0.011793,0,-0.023585,0.023585,-0.011793,0.011793,0,0.011793,0,0,0,0,-0.035378,0,0,0,0,0,0,0.011793,-0.011793,0,0,0.023585,0,0,0,0,0,0,0,0,0,0,-0.011793,0,0,0,-0.011793,0,0,0,-0.011793,0,0,0.011793,0,0.023585,0,0,0,0.035378,0,0,0,0.011793,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.011793,0,-0.011793,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.023585,0,0,0,0,-0.023585,0.023585,-0.011793,0,-0.011793,0.035378,-0.011793,0,-0.011793,0,0,0,0,0,-0.023585,0,-0.129719,0,0,0,0,0,0,0,0,0,0,0,-0.011793,0,0,0,0,0,-0.011793,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.035909,0.059204,0.109581,0.180668,0.297872,0.214578,0.233935,0.191788,0.222534,0.273783,0.442793,0.341602,0.339575,0.239873,0.201398,0.069529,0.056477,0.019735,0.023762,0,0,0,0.047171,-0.011793,0,0,0,0,0,0,0,0,0.023585,0,0.035378,0,0,0,0,0,0,0,0,-0.035378,0,0,0,0,0,0,0,0,0.011793,0,0.011793,0,0,0,0,-0.011793,0,0,0,0}	2026-09-29 22:53:17.350903+05:30	2026-09-29 22:53:17.350903+05:30
3b21b6c0-dd55-408b-b0a4-236124d0a797	STUDENT	97edacb5-7c99-48ff-aa2f-4c2897f9ebf9	Student: Sneha Kulkarni. Department: Information Science. College: BMSCE. Skills: Next.js (Software & Web Dev) level:ADVANCED exp:2.0yrs, PostgreSQL (Software & Web Dev) level:EXPERT exp:2.5yrs. Completed Tasks: 0. Rating: 0.00.	{0.036807,-0.036807,0,-0.036807,0,0,0,0,0.036807,0,0.073613,0,0.073613,0,0,-0.036807,0,0,0,0,0,-0.036807,0.036807,0,0,-0.073613,0.111525,0.12319,0.203106,0.334866,0.5521,0.334866,0.203106,0.12319,0.074719,0,0,0,0,0,0,-0.036807,0,0,0,0,0.073613,0,0,0,0,-0.036807,0,0,0.036807,0,0,0,0,0,0,0,0.073613,0,0,0,0.073613,0,0,0,0,0,0,-0.036807,0,0,0,0,0.036807,0,0,0,0.036807,0,0.147227,0,0.036807,0,0,0,0.036807,0,0,-0.036807,0,0,0,0,0,-0.036807,0,-0.036807,0,-0.036807,0,-0.036807,0.036807,0,0,0,0,0,0.036807,0,0,-0.036807,0,0,0,-0.036807,0,-0.036807,0.073613,0,0,-0.11042,0,0,0,0,0,-0.073613,0,0,0.036807,0,0.036807,0,0,0,0.036807,0,0,0,0.036807,0,0,0,0,0,0.11042,0,0,0,0,0,0,0,0.036807,0,0,-0.036807,0,-0.036807,0,-0.036807,0.073613,0,0,0,0,0,0,-0.036807,0,0,0,0,0,0,0.036807,0,0,0,0,0,0,0,0,0,0,-0.036807,0,0,0.036807,0,0,0,0,0,0,-0.036807,0,0,0,0,0.036807,0,0.073613,0,0,0,0.11042,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.036807,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.073613,0.073613,-0.036807,0,-0.073613,0.036807,-0.036807,0,-0.073613,0,0,0,0,0,-0.073613,0,-0.294454,0,0,0.036807,-0.073613,0,0,0,0,0,0,0,-0.036807,0,0,0,0,0,-0.036807,0,0,0.036807,0,0.036807,0,0,-0.036807,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.036807,-0.036807,0,0,0.036807,0,0,0,0.036807,0,0.036807,0,0,-0.036807,0.036807,-0.036807,0.036807,0,0,0,0,0,0.073613,-0.073613,0.036807,-0.11042,0,0,0,0,0,0,0.036807,0,0.036807,0,0,-0.036807,0,-0.036807,0,0,0,0,0,0}	2026-09-29 22:53:17.353802+05:30	2026-09-29 22:53:17.353802+05:30
15a7f6d1-54f8-48f4-b498-cf7a5fe10bc5	STUDENT	9f183314-ffb3-48d4-a186-e94785e58885	Student: Varun Hegde. Department: Electronics & Comm. College: MSRIT. Skills: Video Editing (Video & Animation) level:ADVANCED exp:2.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.028321,-0.056642,0,-0.028321,0,0,0,0,0.056642,0,0,-0.028321,0,0,0,-0.056642,0,-0.056642,0.028321,0,0,0,0.056642,0,0,-0.084963,0.028321,0,0,-0.028321,0,0,0,0,0,0,0,0,0,0,0.028321,-0.028321,0.084963,0,0,0,0.056642,0,0,0,0,-0.028321,0,0,0.028321,0,0,0,0,0,0,0,0,0,0,0,0.028321,0,0,0,0,0,0,-0.028321,0,0,0,0,0,0,0,0,0,0,0,0,0.028321,0,0,0,0,0,0,0,0,0,0,0,0,-0.056642,0.028321,-0.028321,0,0,0,-0.028321,0.028321,0,0,0,0,0,0,0,0,-0.028321,0,0,0,-0.028321,0,-0.028321,0.028321,0,0,0,0,0,0,0,0.028321,-0.028321,0,0,0,0,0,0,0,0,0.056642,0,0,0,0,0,0,0,0,0,0.084963,0,0,0,0,0,0,0,0.028321,0,0,-0.056642,0,-0.028321,0,-0.028321,0.028321,-0.028321,0,0,0,0,0,0,0,0,0,0,0,0,0.028321,0,0,0,0,0,0,0,0,0,0,0,0,0,0.057492,0.094789,0.185027,0.305058,0.502955,0.386495,0.368688,0.223621,0.164379,0.094789,0.106887,0.100511,0.240728,0.128832,0.106461,0.019074,0.028746,0,0.028321,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.056642,0,0,-0.056642,0.113284,-0.028321,0,-0.028321,0,-0.028321,0,0,0,0,0,0,0,-0.056642,0,-0.084963,0.028321,0,0,0,0,0,0,0,0,0,0,-0.028321,0,0,0,0,0,-0.028321,0,-0.028321,0,0,0,0,0,0,0,0,0,0,0,-0.028321,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.028321,0,0,0.028321,0,0,0,0.028321,0,0,0,0,0,0.028321,0,0,0,0.028321,0,0.056642,0,0,0,0,0,0,0,0.028321,-0.084963,0,0,0,0,0,0,0.028321,0,0.028321,0,0,0,0,0,0,0,0,0,0,0}	2026-09-29 22:53:17.356832+05:30	2026-09-29 22:53:17.356832+05:30
b26a02b0-72ef-451e-85f7-1243b5c25343	STUDENT	a290d37f-202c-4251-aff1-ebb2283e436c	Student: Tanvi Joshi. Department: Design & Interaction. College: PES University. Skills: Canva (Graphic Design) level:EXPERT exp:3.0yrs, Figma (Graphic Design) level:EXPERT exp:3.0yrs, Photoshop (Graphic Design) level:EXPERT exp:2.5yrs. Completed Tasks: 1. Rating: 5.00.	{0.01319,-0.01319,0.039571,-0.01319,0.01319,0,0,0,0.01319,0,0,0,0,0,0,0,0,0,0.01319,0,0,0,0.01319,0,0,-0.065952,0.01319,-0.01319,0,0,0,0,0,-0.01319,0,0,0,0,0,0,0,-0.01319,0,0,0,0,0.026381,0,0,0,0,0,0,0,0.01319,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039571,0,0,0,0,0,0,0,0,0,0,0.01319,0,0.052762,0,0,0,0,0,0,0,0,0,0,0,0,-0.01319,0,-0.01319,0.01319,-0.039571,0,-0.01319,0,0,0,0,0,0,0,0,0,-0.01319,0,0,0,-0.026381,0,-0.01319,0.039571,-0.052762,0,0,0,0,0,0,0.013389,0.008883,0.076163,0.082077,0.148711,0.142081,0.225271,0.230376,0.294286,0.32209,0.458688,0.262087,0.19913,0.141327,0.215498,0.18001,0.296786,0.18001,0.122372,0.066222,0.066547,0,0.01319,0,0,0,0,0,0,0,0,-0.065952,0,0,0,-0.01319,0.01319,0,0,0,0.01319,0,0,0,0.01319,0,0,0,0,0,0.026381,-0.026381,0,-0.01319,0,0,0.01319,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.01319,0,0,0,-0.01319,0.026381,0,0,-0.052762,0,0,0.039571,0,0,0,0.026381,0,0,0,0,0,0.01319,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.039571,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.026381,0.026381,-0.01319,0,-0.01319,0.065952,-0.01319,0,0,0,0,0,0,0,-0.026381,0,-0.197857,0.01319,0,0,-0.01319,0,-0.01319,0,0,0,0,0,-0.01319,0,0,0,0,0,-0.026381,0,0,0,0,0,0,0,0,0,0,0,-0.01319,0,0,0,0,0,0,0,0,0,0,0,0,0.01319,0,0,0,0,-0.01319,0,0,0.01319,0,0.01319,0,0,0,0,0,0,0,0,0,0,0,0,-0.01319,0,0,0.01319,0,0,0,0,0,0,-0.026381,0,-0.039571,0,0,0,-0.01319,0.01319,-0.039571,0,0,0,0,0,-0.01319,0,-0.01319,0,0,0,0,0,0}	2026-09-29 22:53:17.359256+05:30	2026-09-29 22:53:17.359256+05:30
25f44254-f488-44d7-8f04-ada9bb30d270	STUDENT	cce49998-ae75-411e-91d8-c3c360ab1298	Student: Aditya Swamy. Department: Computer Science. College: RVCE. Skills: PostgreSQL (Software & Web Dev) level:INTERMEDIATE exp:1.5yrs, Python (Data & AI) level:ADVANCED exp:2.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.038176,-0.076353,0,-0.038176,0,0,0,0,0,0,0.038176,0,0.076353,0,0,-0.114529,0,0,0,0,0,0,0.038176,0,0,-0.076353,0.03875,0.063887,0.105332,0.173664,0.286323,0.135487,0.105332,0.063887,0.03875,0,0,0,0.038176,0,0,-0.038176,0.038176,0,0,0,0.076353,0,0,0,0.038176,-0.038176,0,0,0.038176,0,0,0,0,0,0,0,0.038176,0,0,0,0.076926,0.063887,0.105332,0.173664,0.286323,0.173664,0.105332,0.025711,0.03875,0,0.038176,0,0.038176,0,0,0,0.038176,0,0.076353,0,0.038176,0,0,0,0.038176,0,0,0,0,0,0.038176,0,0,-0.038176,0,-0.038176,0,0,0,-0.038176,0,0,0,0,0,0,0,0,0,-0.038176,0,0,0,-0.038176,0,-0.038176,0.076353,0,0.038176,-0.038176,0,0,0,0,0,-0.076353,0,0,0,0,0,0,0.038176,-0.038176,0.038176,0,0.038176,0,0.038176,0,0.038176,0,0,0,0.076353,-0.038176,0,0,0,0,0,0,0,0,0,-0.038176,0,-0.038176,0,-0.038176,0.114529,0,0,0,0,0,0,-0.038176,0.038176,0,0,0,0,0,0.038176,0,0,0,0.038176,0,0,0,0,0,0,-0.038176,0,0,0,0,0,0,0,-0.038176,0,0,0,0,0,0,0.038176,0,0.076353,0,0,0,0.114529,0,0,0,0.038176,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.038176,0,0,0,0,0.038176,0,0,0,0,0,0,0,0,0,0,-0.076353,0.076353,-0.038176,0,-0.038176,0.038176,-0.038176,0,-0.038176,0,0,0,0,0,-0.076353,0,-0.229059,0,0,0.038176,-0.076353,0,0,0,0,0,0,0,-0.038176,0,0,0,0,0,-0.038176,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03875,0.063887,0.105332,0.173664,0.286323,0.173664,0.144082,0.127775,0.144082,0.173664,0.286323,0.173664,0.105332,0.025711,0.03875,0,0,0,0.076353,0,0,0,0.038176,0,0,0,0.038176,0,0.038176,0,0,-0.076353,0,0,0.038176,-0.038176,0,0,0,0,0.038176,-0.038176,0,-0.114529,0,0,0,-0.038176,0,0,0.038176,0,0.038176,0,0,0,0,0,0,-0.038176,0.038176,0,0,0}	2026-09-29 22:53:17.360806+05:30	2026-09-29 22:53:17.360806+05:30
c520d48b-41c9-457f-84d8-53c18ccf3c2f	STUDENT	a7ac217d-ab10-44b0-8fc6-19e004b7df40	Student: Meera Iyer. Department: Biotechnology & Data. College: BMSCE. Skills: Content Writing (Technical Writing) level:ADVANCED exp:2.0yrs, Technical Writing (Technical Writing) level:EXPERT exp:3.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.017943,-0.017943,0.017943,-0.017943,0,0,0,-0.053828,0.071771,0,0.071771,0,0.017943,0,0.017943,-0.017943,0,0,0,0,0,-0.017943,0.017943,0,0,-0.089714,0,0,0,-0.071771,0,0,0,-0.017943,0,0,0,0,0,0,0,-0.017943,0,0,0,0,0.035886,0,0,0,0,-0.017943,0,0,0.017943,0,0,0,0,0,0,0,0,0,0,0,0.017943,0,0,0,0,0,0,-0.035886,0,0,0,-0.017943,0,0,0,0,0.017943,0,0.017943,0,0.017943,0,0,0,0,0,0,0,0,0,0,-0.017943,0,-0.017943,0,-0.017943,0.017943,-0.017943,0,-0.017943,0,0,0,0,0.071771,0,0,0,0,-0.017943,0,0,0,-0.035886,0,-0.017943,0.035886,0,0,-0.017943,0,0,0,0,0,-0.017943,0,0,0,0,0.017943,0,0,0,0.017943,0,0.017943,0,0,0,0,0,0,0,0.035886,-0.017943,0,0,0,0,0,0,0.071771,0,0.017943,-0.035886,0,-0.071771,0,-0.017943,0.017943,0,0,-0.089714,0,0,0,0,0,0,0,0,0,0,0.017943,-0.017943,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.017943,0,0,0,0,0,0,-0.017943,0,0,0.017943,0,0.017943,0,0,0,0.035886,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.017943,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.072849,0.120107,0.216235,0.356512,0.587789,0.408106,0.332594,0.201728,0.122354,0.030027,0.018212,0,0,-0.035886,0.017943,-0.017943,0,-0.017943,0.071771,-0.017943,0,0,0,0,0,0,0,-0.035886,0,-0.161485,0,0,0,0,0,0,0,0,0,0,0,-0.017943,0,0,0,0,0,-0.017943,0,0,0.017943,0,0,-0.017943,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.053828,0,0,0,0.017943,0,0,0,0.017943,0,0,0,0,0,0,0,0,-0.017943,0,0,0.089714,0,0,0,0,0,0,0,0,-0.071771,0,0,0,0,0,0,0.017943,0,0.017943,-0.017943,0,0,0,0,0,0,0,0,0,0}	2026-09-29 22:53:17.363663+05:30	2026-09-29 22:53:17.363663+05:30
71d4710b-fc5b-4a25-bb39-760574ce9950	STUDENT	d985957d-e8c0-4f82-a459-6570e78a8fb5	Student: Nikhil Rathi. Department: Mechanical & Robotics. College: PES University. Skills: Video Editing (Video & Animation) level:INTERMEDIATE exp:1.5yrs. Completed Tasks: 0. Rating: 0.00.	{0.028597,-0.028597,0,-0.028597,0,0,0,-0.028597,0.057193,0,0.028597,-0.028597,0,0,0.028597,-0.028597,0.028597,-0.057193,0.028597,0,0,0,0.028597,0,0,-0.08579,0.028597,-0.028597,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.028597,0.114386,0,0,0,0.057193,0,0,0,0,0,0,0,0.028597,0,0,0,0,0,0,0,0.028597,0,0,0,0,0,0,0,0,0,0,-0.028597,0,-0.028597,0.028597,0,0,0,0,0,0,0,0,0,0.028597,0,0,0,0,0,0,0,0,0,0.028597,0,0,-0.028597,0,-0.028597,0.028597,0,0,-0.028597,0,0,0,0,0,0,0,0,0,-0.028597,0,0,0,0,0,-0.028597,0.028597,0,0,0,0,0,0,0,0,-0.028597,0,0,0,0,0,0,0.028597,0,0.028597,0,0,0,0,0,0.028597,0,0,-0.057193,0.08579,0,0,0,0,0,0.028597,0,0.028597,0,0,-0.028597,0,0,0.028597,-0.057193,0.028597,0,0,0,0,0,0.028597,0,0.028597,0,0,0,0,0,0.028597,0,0,0,0.028597,0,0,0,0,0,0,0,0,0,0.058052,0.095711,0.186827,0.279429,0.507849,0.361659,0.372275,0.225796,0.165978,0.095711,0.107926,0.130085,0.243071,0.130085,0.078901,0.047856,0.029026,0,0.028597,0,0,0,0.028597,0,0,0,0,0,0.028597,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.028597,0,0,0,0,0,0,-0.057193,0.114386,-0.028597,0,-0.028597,0.028597,-0.028597,0,0,0,0,0,0,0,-0.057193,0,-0.08579,0.028597,0,0,-0.028597,0,-0.028597,0,0,0,0,0,-0.028597,0,0,0,0,0,-0.028597,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.028597,0,0,0,0,0,0,0,0,0,0,0.028597,0,0,0,0,-0.028597,0.028597,0,0,0,0.028597,0,0,0,0,0,0,0,0,0,0.08579,0,0,-0.028597,0.028597,0,0.057193,0,0,0,0,0,0,0,0,-0.08579,0,0,0,-0.028597,0.028597,0,0.028597,0,0,-0.028597,0,0,0,0,0,0,0.057193,0,0,0}	2026-09-29 22:53:17.366296+05:30	2026-09-29 22:53:17.366296+05:30
62e0231f-641c-4af0-b7fe-850895e6f0aa	TASK	fd780065-0fcb-4a1e-865b-8814b88757d2	Task: PostgreSQL Database Query Optimization for College Portal. Category: Software & Web Dev. Required Skills: PostgreSQL, SQL, Indexing. Description: Analyze slow queries with EXPLAIN ANALYZE, add proper composite indexes, and write aggregation views.. Budget: ₹850.00.	{0.035442,-0.035442,0,0,0,0,0,0,0.106326,0,0.070884,0,0,0,0.035442,0,0,0,0.035442,0,0,0,0,0,0.035442,-0.035442,0.1423,0.059311,0.097788,0.090341,0.265815,0.161225,0.097788,0.023869,0.071416,0,0.035442,0,0,0,0,0,0,0,0.035442,-0.035442,0.070884,0,0,0,0,-0.035442,0,0,0,0,0.035442,0,0,0,0,0,0.035442,0,0,0,0,0,0,0,0,0,0,-0.035442,0,0,0.035974,0.059311,0.204114,0.161225,0.301789,0.220536,0.231017,0.220536,0.372673,0.161225,0.13323,0.023869,0.035974,0,0.141768,-0.035442,0.070884,0,0,0,0,0,0.070884,0,0,-0.070884,0,0,0,0,0,0,0.035442,0,0.035442,0,0,-0.035442,0,-0.070884,0,-0.035442,0.035442,0,0,-0.035442,0,0,0,-0.035442,0,-0.035442,0,-0.035442,0,-0.106326,0,-0.035442,0,0,0,0,0,0,0,-0.106326,0.035442,0,0.070884,0,0.070884,0,0.070884,-0.035442,0.070884,-0.035442,0,-0.070884,0.070884,0,0,-0.070884,0,-0.035442,0,0,0,0,0,0,0.106326,0,0,0,0,0,0,-0.035442,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070884,0,0,0,-0.035442,0.035442,0,0,-0.035442,0,0,0,0,0.035442,0,0,0,0,-0.106326,0.141768,0,0,0,0,0,0,0,0,0,0.106326,0,0,0,0.035442,-0.035442,0,0,0,0,0,0,0,0,0,0,0,-0.070884,0,0,0,-0.070884,0.035442,0,0,0,0,0,0,0,0,0,0,0,0,-0.035442,0,0,0,0,0,0,0,0,0,0,0,0,0.035442,0,0,-0.070884,0.070884,0,0.035442,-0.070884,0.070884,-0.070884,0,0,0,0,0,-0.070884,0.035442,0,0.070884,0,0,0,0,0,0.035442,0,0,-0.035442,0,0,0,-0.035442,0.070884,-0.035442,0,0,0,0,0,0,0.035442,0,0,0,0,0,0,0,0,0,0,0,0.035442,0,0,-0.035442,0,0,0,0,0,0,0,0,0,0,0.035442,0,0.035442,0,0.070884,0,0.035442,-0.035442,0,0,0.035442,0,0,0,0,-0.17721,0.035442,0,0.035442,0,0.070884,-0.070884,0,0,0.035442,-0.035442,0,0,0,0,0,0,0,-0.035442,0.035442,0,0,0,0,0,0,0,0,0,0,0,0,0}	2026-09-29 22:53:17.367664+05:30	2026-09-29 22:53:17.367664+05:30
62d54eb0-2633-4c17-8855-be6ffa252ac6	TASK	d6e3ace6-72c9-4811-ac56-7ba5e63379a6	Task: Club Event Attendance QR Scanner Web App. Category: Software & Web Dev. Required Skills: Next.js, PostgreSQL, QR Scanner. Description: Lightweight web tool allowing club coordinators to scan student tickets and mark attendance in PostgreSQL.. Budget: ₹950.00.	{0,0,0,-0.053784,0,0,0,0,0.026892,-0.026892,0.080675,0,0.026892,0,0.026892,0,0,-0.107567,0.026892,0,0.026892,0,0,0,0,-0.026892,0.108778,0.135008,0.222591,0.36699,0.605065,0.36699,0.222591,0.081225,0.108778,0,0,0,0,0,0,0,0,0,0.026892,-0.026892,0.053784,0,0,0,0,0,0,0,0.026892,0,0.026892,0,0,0,0,0,0.026892,0,0,0,0.026892,0,0,0,0,0,0,-0.026892,0,0,0,0,0.053784,0,0,0,0,0,0.107567,0,0.026892,0,0,0,0.134459,-0.026892,0.026892,0,0,0,0,-0.026892,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.026892,0.053784,0,0,-0.026892,0,-0.026892,0.026892,0,0,-0.026892,0,0,0,-0.026892,0,0,0,0,0,-0.053784,0,0,0,0,0,0,0.053784,0,0,-0.026892,0,0,0.053784,-0.053784,0.026892,0,0,0,0,0,0,0,0,0,0.026892,-0.026892,0,0,0,-0.080675,0,0,0.026892,-0.053784,0.080675,0,0,0,0,0,0,0,0.026892,0,0,0,0,-0.053784,0.026892,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.026892,0,-0.026892,0,0,0,0,0,0,0,0,0.026892,0,0.053784,0,0,0,0.134459,0,0,-0.026892,0,0,0,0,0.026892,0,0.026892,0,0,0,0,0,0,0,0,0,0,0,0,-0.053784,0,0,0,0,0,0,0,-0.053784,0,0,0,-0.026892,0,0,0,0,0,-0.026892,0,0,0,-0.026892,0,0,0,0,0,0,0,0,0,0,0,-0.026892,0,0,0,-0.053784,0.026892,0,0,-0.026892,0.026892,0,0,0,0,-0.053784,0,-0.053784,0.026892,-0.026892,0.053784,-0.080675,0,0,0,0,0,0,0,-0.026892,0,0,0.053784,0,0,0,0,0,0.026892,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.026892,0,0,0,0,0,0,0,0,0,0,0,0,0,0.080675,0,0,0,0,0,0.080675,-0.026892,0,0,0,-0.053784,0.026892,0,0.026892,-0.053784,0,-0.053784,0.026892,0,0,-0.080675,0,0,0.026892,-0.026892,0,-0.080675,0,0,0,0,0,-0.026892,0.026892,0,0,0,0,-0.026892,0,-0.053784,0,0,0,0,0,0}	2026-09-29 22:53:17.368353+05:30	2026-09-29 22:53:17.368353+05:30
dc93a5a0-352f-4bba-a1f2-e5206eae92d8	TASK	a74357fd-067b-47d3-95cb-546c543bc4f4	Task: Responsive Portfolio Website in React. Category: Software & Web Dev. Required Skills: React, Tailwind, UI/UX. Description: Convert Figma designs into responsive clean React components with smooth scrolling, project gallery, and contact form.. Budget: ₹1100.00.	{0,-0.02436,0.048721,0,0.02436,0,0.049452,0.081533,0.158785,0.221629,0.414125,0.221629,0.134425,0.057173,0.049452,0,0,-0.02436,0.146528,0.040766,0.091573,0.110815,0.231789,0.151581,0.134425,0.127221,0.256515,0.151581,0.134425,0.127221,0.232155,0.151581,0.134425,0.151581,0.256149,0.110815,0.067212,0.040766,0.024726,0,0,0,0,0,0.02436,-0.02436,0.073081,0,0,0,0.048721,0,0,0,0,0,0.02436,0,0,0,0,0,0.048721,0,0,0,0,0,0,0,0,0,0,-0.02436,0,0,0,0,0,0,0,0,0,-0.02436,0.073081,0,0.02436,0,0,0,0.02436,0,0.02436,-0.02436,0,0,0.02436,0,0,0,0,-0.02436,0,-0.02436,0,-0.02436,0.02436,0,0.02436,0,0,0,0,-0.02436,0,-0.02436,0,-0.02436,0.02436,0,0,-0.02436,0,-0.02436,0,-0.02436,0,0,0,0,0.048721,0,0,0,0.024726,0.040766,0.067212,0.110815,0.182702,0.110815,0.067212,0.016406,0.024726,-0.02436,0.02436,0,0.02436,0,0,0,0.02436,0,0,0,0.02436,0,0.02436,-0.048721,0,0,0,0,0,-0.02436,0,0,0.02436,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.02436,0.02436,-0.02436,0,0,0,-0.02436,0,0,0,-0.02436,0.02436,-0.097441,0,-0.02436,0,-0.02436,0,0,0,0,0.048721,0,0,0,0.02436,0,0.048721,0,0.048721,0,0.02436,0,0,0,0,0,0,0,0.02436,-0.02436,0,-0.02436,0,0,0,-0.02436,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.048721,0,0,0,0,0,0.073081,0,0.02436,-0.048721,0.048721,0,0,-0.02436,0.02436,-0.02436,0,-0.02436,0,0,0.02436,0,0.02436,0,0.048721,-0.02436,0,-0.02436,0,0,0,0,0,-0.02436,0,0,0.02436,-0.02436,0,-0.02436,0,0,0,0,0.02436,0,0,0,0.02436,0,0,-0.02436,0,-0.02436,0,0,0,0,0.02436,0,0.048721,0,0,-0.073081,0,0,0,0,0,0,0,0,0,0,0.073081,0,0,-0.02436,0.02436,-0.02436,0,0,0,-0.02436,0,0,0,-0.02436,0,0,0.02436,0,0.02436,-0.02436,0.02436,0,0.02436,-0.048721,0,-0.02436,0.02436,-0.02436,0,-0.02436,0,-0.02436,0.02436,0,0.048721,-0.02436,0.02436,-0.02436,0,0,0,0,0,0,0,0}	2026-09-29 22:53:17.369054+05:30	2026-09-29 22:53:17.369054+05:30
22d21d21-4bba-4926-917e-f978d73c9eb6	TASK	9c746442-fba6-46dc-ac44-1f266077ef12	Task: Robotics Workshop Brochure & Handout. Category: Graphic Design. Required Skills: Canva, Figma, Typography. Description: Design a clean 2-fold informational brochure highlighting workshop schedule, speaker profiles, and hardware kits.. Budget: ₹500.00.	{0,-0.029957,0.029957,0,0.029957,-0.059915,0.029957,0,0.059915,-0.029957,0.059915,-0.029957,0,0,0.029957,0,0,0,0,0,0.059915,0,0,0,0.029957,-0.179745,0.11983,0,0,0,0,0,0,0,0.029957,0,0,0,0,0,0.029957,0,0,0,0,-0.029957,0.11983,0,0,0,0,0,0,0,0.059915,0,0.059915,0,0,0,0,-0.029957,0,0,0,0,0,0,0,0,0,0,0,-0.029957,0,0,0,0,0,0,0,0,0,-0.029957,0.029957,0,0.089872,0,0.029957,0,0.089872,0,0.029957,0,0,0,0,0,0,0,0,-0.029957,0,0,0.11983,0,0.029957,0,0,0,0,-0.029957,0,0,0.029957,-0.029957,0,-0.029957,0.029957,0,0,-0.029957,0,-0.059915,0,0,0,0,0.059915,0,0.030407,0.050133,0.082656,0.136276,0.285046,0.186409,0.195718,0.236542,0.397659,0.242594,0.307336,0.156452,0.14347,0.070309,0.172978,0.136276,0.254638,0.136276,0.082656,0.020176,0.060365,0,0,-0.059915,0.029957,0,0,0,0,0,0.029957,-0.059915,0,0,0.029957,0,0.029957,0,0.029957,0,0,-0.029957,0,0,0,0,0.059915,0,0,-0.029957,0,0,0,0,0,0,0.059915,0,0,0,0,0,0,0,0,-0.029957,0,-0.059915,0.059915,-0.029957,0.029957,-0.11983,0.029957,0,0,0,0.059915,0,0,-0.059915,0,0,0,0,0.029957,0,0,0,0,0,0,0,0.029957,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.029957,0,-0.029957,0,0,0,-0.029957,0,-0.029957,0,0,0,0,0,0,0,0,0,-0.029957,0,-0.029957,0.029957,0,0,0,0.029957,0,0,-0.029957,0,-0.059915,0.089872,0,0,0,0.029957,0,0,0,0.029957,0,0.029957,0,0.029957,-0.059915,0,0,0.029957,0,0,0,0,-0.059915,0,-0.029957,0,0,0,-0.029957,0.029957,0,0,0,0,0,0,0,0,-0.029957,0,0,0,-0.029957,0,0,0,0,0,0,0.029957,0,0,0,0,0,0,0,0,0,0,0,0,-0.029957,0.029957,0,0.029957,0,0,0,0.029957,-0.059915,0,0,0,0,0,-0.029957,0,0,0.029957,-0.029957,0.059915,0,0,-0.029957,0,0,0.029957,-0.029957,0,0,0,0,0,0,0,-0.059915,0.029957,0,0,0,0,0,0,0,0,-0.029957,0.029957,0,0,0}	2026-09-29 22:53:17.371189+05:30	2026-09-29 22:53:17.371189+05:30
943ea743-34cf-4eb5-adfd-64d2973f5849	TASK	3b7566f7-b4fa-409c-a4af-b72574832389	Task: Tech Fest T-shirt and Hoodie Vector Artwork. Category: Graphic Design. Required Skills: Photoshop, Figma, Vector Design. Description: Minimalist vector illustration for our annual technical symposium merchandise with front chest badge and back artwork.. Budget: ₹550.00.	{0.021313,0,0.021313,0,0.042626,0,0,-0.021313,0.063939,-0.021313,0.085252,0,0,0,0.021313,0,0.021313,-0.021313,0.021313,0,0,-0.042626,0.085252,0,0,-0.042626,0.085252,0,0,0,0,0,0,0,0.021313,0,0.021313,0,0,0,0,0,0,0,0.021313,-0.021313,0.042626,0,0,0,0,0,0.021313,0,0,0,0.021313,0,0,0,0,0,0,0,0,0,0.021313,0,0,0,0,0,0,-0.021313,0,0,0.042626,0,0,0,0,0,0,0,0,0,0.063939,0,0,0,0.063939,0,0.021313,0,0,0,0,0,0,-0.042626,0,0,0,0,0.042626,0,0,-0.021313,0,0,0,0,0,0,0,-0.021313,0,-0.042626,0.021313,0,0,-0.021313,0,-0.063939,0,0,0,0,0,0,0,0,0.064259,-0.006959,0.123064,0.13262,0.218653,0.193906,0.239966,0.13262,0.080438,0.014354,0.043266,0.014354,0.101431,0.096953,0.202794,0.13262,0.11761,0.111307,0.224107,0.096953,0.058805,0.035667,0.021633,0,0.021313,-0.021313,0.063939,0,0.021313,-0.021313,0,-0.021313,0,-0.021313,0.021313,0,0,-0.021313,0.021313,0,0,0,0,0,0,-0.021313,0,0,0.021313,-0.021313,0,0,0,0,0.021313,0,0,0,0,0,0,-0.021313,0,0,0,-0.021313,0,0,0.021313,-0.042626,0,0,0.021313,-0.021313,0.021313,0,0,-0.063939,0.021313,0,0.021313,0,0,-0.085252,0.021313,0,0,0,0,0,0.021313,-0.021313,0,0,0.021313,0,0,0,0,0,0,0,0,-0.021313,0,0,0,0,0,0,0,-0.042626,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.042626,0.106565,0,0.085252,0,0.042626,0,0,0,0,0,0,0,0.042626,0,0,0,0,-0.042626,0,0,0,-0.042626,0,-0.042626,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.021313,0,-0.021313,0,0,0,0,0.042626,0,0,0,0,-0.021313,0,0,0,0,0,0,0.021313,0,0,0,0.064899,0.107001,0.176415,0.290858,0.500858,0.226919,0.197728,0.107001,0.064899,0,0.021313,0,0,0,0.021313,-0.021313,0,0,0.021313,-0.021313,0,0,0,0,0,0,0,0,0,0,0,-0.042626,0.021313,0,0,-0.063939,0,-0.021313,0,0,0.021313,0,0,0,0,0}	2026-09-29 22:53:17.371821+05:30	2026-09-29 22:53:17.371821+05:30
06a97a20-6483-45fa-9c46-8b1a39cb4011	TASK	59e1263d-34e1-4d6a-a445-a855b3fc65c6	Task: Sentiment Analysis on Student Feedback Forms. Category: Data & AI. Required Skills: Python, Machine Learning, Pandas. Description: Classify 1,200 open-ended course evaluation comments into positive, neutral, and negative using NLP.. Budget: ₹800.00.	{0,-0.033751,0,-0.033751,0,0,0.033751,0,0.067503,-0.067503,0.033751,0,0,-0.033751,0,0,0,0,0,-0.033751,0,0,0.033751,0,0.033751,-0.033751,0.067503,0,0,0,0,0,0,-0.067503,0.033751,-0.033751,0.033751,0,0,0,0,0,0,0,0,-0.033751,0.101254,0,0.033751,0,0.033751,0,0,0,0.033751,0,0.067503,0,0,0,0.033751,0,0,0,0,0,0.034258,0.056482,0.126875,0.153535,0.286888,0.153535,0.126875,0.022731,0.034258,0,0,0,0,0,0,0,0,0,0,0,0.101254,0,0,0,0.033751,0,0.067503,-0.033751,0,0,0,0,0,0,0,0,0,0,0,0,0.033751,0,0,0,0,0,0,0,0.033751,-0.033751,0,-0.033751,0.067503,0,0,-0.033751,0,0,0.033751,0,0,-0.033751,0,-0.033751,0,0,0.033751,-0.033751,0.067503,0,0,-0.033751,0,-0.067503,0,-0.033751,0.033751,-0.033751,0,0,0.033751,0,0,0,0.101254,-0.033751,0.033751,-0.033751,0,0,0,-0.067503,0.067503,0,0,-0.033751,0,-0.033751,0.033751,0,0.033751,0,0,0,0.033751,0,0,-0.067503,0,0,0,0,0,-0.033751,0.033751,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.033751,-0.033751,0,-0.033751,0,-0.033751,0,0,0.033751,0,0.033751,0,0.067503,0,0,0,0.033751,0,0,0,0.101254,0,0,0,0,-0.033751,0.067503,0,0,0,0,0,0,0,0,0,0,0,0,-0.033751,0,0,0,-0.033751,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033751,0,0,0.033751,0,0.033751,0,0,0,0,-0.033751,0,0,0.033751,-0.067503,0.033751,0,0,0,0.033751,0,0.033751,-0.033751,0,0,0,0,0.067503,0,0,0,0,-0.033751,0.033751,0,0,0,0,-0.033751,0.033751,0,0,0,0.033751,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.034258,0.022731,0.126875,0.153535,0.286888,0.119783,0.093124,0.056482,0.068516,0.056482,0.127382,0.210017,0.34626,0.30707,0.34626,0.142514,0.127382,0.056482,0.034258,0,0.033751,0,0.067503,-0.067503,0,0,0.033751,-0.033751,0,0,0,0,0.033751,0,0.067503,-0.033751,0,-0.033751,0,0,0.033751,-0.033751,0,-0.135006,0,-0.033751,0,-0.033751,0,-0.033751,0.033751,0,0,0,0,0,0.033751,0,0,-0.033751,0,0,0,0}	2026-09-29 22:53:17.374119+05:30	2026-09-29 22:53:17.374119+05:30
08b1f043-6f2f-46e6-b06d-ff8744dd7c76	TASK	82770f40-eb5e-475c-878c-a24b01ec077a	Task: Pandas Script to Clean College Survey Data. Category: Data & AI. Required Skills: Python, Pandas, Data Analytics. Description: Clean, normalize, and handle missing values in a 5,000-row CSV student survey dataset and generate summary charts.. Budget: ₹650.00.	{0.022277,0,0,-0.022277,0,0,0,0,0.022277,0,0.022277,0,0,0,0.022277,0,0,0,0,0,0,-0.022277,0,0,0,-0.066832,0.022277,0,0,-0.022277,0,0,0,-0.044554,0.044554,0,0,0,0,0,0,0,0.022277,0,0,-0.066832,0.044554,0,0.022277,0,0,0,0,0,0.022277,0,0.022277,0,0,0,0,0,0.022277,0,0,0,0.022612,0.03728,0.061465,0.101339,0.167079,0.101339,0.061465,0.015003,0.022612,0,0,0,0,0,0.022277,0,0,0,0.022277,0,0.022277,0,0,0,0.044554,0,0.022277,-0.022277,0,0,0,-0.022277,0.022277,-0.044554,0,-0.022277,0,0,0.022277,0,0.022277,0,0,0,0,0,0,0,0,-0.044554,0,-0.022277,0.022277,0,0,-0.066832,0,0,0,0,0,0,0,0,0,-0.022277,0,0,0.066832,-0.022277,0,-0.044554,0,-0.022277,0,-0.022277,0.089109,0,0,0,0.044554,0,0,-0.022277,0.044554,-0.089109,0,-0.044554,0,0,0.022277,-0.044554,0,0,0,-0.022277,0,0,0,-0.022277,0.044554,0,0,0,0,0,0,-0.022277,0.022277,0,0,0,0,0,0.022277,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.022277,0,-0.022277,0,0,0,-0.022277,0,0,0.022277,0,0.044554,-0.044554,0,0,0,0,0,-0.022277,0.022277,0,0.022277,0,0,0,0.022277,0,0,0,0,0,0,0,0,0,0,0,0,-0.044554,0,0,0,0,0,0,0,-0.044554,0,0,0.022277,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.044554,0,0,0,0,-0.022277,0.022277,-0.022277,0,-0.044554,0.022277,0,0,0,0.022277,0,0,0,0,-0.022277,0.044554,0,0.044554,0,0,0,0,0,0,0,0,0,0,-0.022277,0.066832,0,0,0,0.022277,-0.022277,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.045223,0.052284,0.190431,0.277238,0.457088,0.405355,0.457088,0.277238,0.168153,0.074561,0.045223,0,0,0,0,0,0,0,0.044554,0,0.044554,-0.022277,0.022277,-0.111386,0.022277,0,0,0,0.022277,0,0.022277,0,0,0,0.022277,0,0,-0.022277,0,0,0,0,0,-0.022277,0,0,0,0,0,-0.044554,0.022277,0,0,0,0,0,0,0,0,-0.022277,0.022277,0,0,0}	2026-09-29 22:53:17.374727+05:30	2026-09-29 22:53:17.374727+05:30
1911fa61-6436-47ff-83a8-753bab847ef4	TASK	cda5b62c-0bf3-4370-bf3b-f602400eb913	Task: Python Web Scraper for Placement Notices. Category: Data & AI. Required Skills: Python, Pandas, Web Scraping. Description: Automated Python script with BeautifulSoup or Selenium to extract placement notifications from student portal and save into structured JSON/CSV.. Budget: ₹700.00.	{0.041307,0,0,-0.061961,0,0,0,-0.020654,0.041307,0,0.020654,-0.020654,0,0,0.020654,0,0,-0.061961,0.041307,0,0,-0.020654,0.020654,0,0,-0.061961,0.124542,0.069127,0.113971,0.187906,0.309804,0.187906,0.113971,0.069127,0.124542,0,0,0,0.020654,0,0,0,0,0,0,-0.041307,0.061961,0,0,0,0,0,0,0,0.041307,0,0.020654,0,0,0,0,0,0,0,0.020654,0,0.062891,0.10369,0.170956,0.281859,0.464707,0.281859,0.170956,0.083036,0.062891,-0.041307,0,0,0,0,0,-0.020654,0.041307,0,0.041307,0,0.061961,0,0,0,0.061961,0,0.020654,0,0,0,0,0,0,0,0,-0.041307,0,0,0.020654,0,0,0,0.020654,0,0,0,0,-0.020654,0,-0.020654,0,-0.020654,0.020654,0,0.020654,-0.020654,0,0,0,0,0,0,0,0,0,0,0,0,0.041307,0,0,0,0,-0.061961,0,-0.020654,0.061961,0,0,0,0.041307,0,0.020654,0,0.041307,-0.020654,0,0,0,0,0,-0.041307,0,-0.020654,0,-0.041307,0,0,0.061961,0,0.020654,0,0,0,0.020654,-0.020654,0,-0.061961,0,0,0.020654,-0.020654,0,0,0.020654,0,0,0,0,0,0,0,0,0,0,0,0.041307,-0.020654,0,0,0,-0.020654,0,-0.061961,0,-0.020654,0.020654,0,0,0,0.020654,0,0.041307,0,0.020654,-0.061961,0,0,0,0,0,0,0,0,0,0,0.020654,0,0,0,0.020654,0,0,0,0,0,0,0,0,-0.020654,0,0,0,0,0,0,0,0,0,0,0,-0.020654,0,0,0,0,0,0,0.020654,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.020654,0,0,0,-0.061961,0.020654,-0.020654,0,-0.041307,0.020654,0,0,0,0,0,0,-0.020654,0.041307,0,0,-0.020654,0,-0.041307,0,0,0,0,0,-0.020654,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.020654,0,0,0,0,0.020654,-0.041307,0,0,0.020964,0.034563,0.098603,0.107863,0.211887,0.187906,0.232541,0.128516,0.098603,0.034563,0.020964,0,0,0,0,0,0,0,0,0,0,0,0.041307,-0.041307,0,-0.020654,0,0,0,0,0,-0.020654,0.041307,0,0.020654,0,0,-0.020654,0,0,0.020654,-0.020654,0,-0.061961,0,0,0,-0.020654,0,-0.020654,0.020654,0,0.020654,0,0.020654,0,0,0,0,-0.061961,0,-0.020654,0,0}	2026-09-29 22:53:17.247538+05:30	2026-09-29 22:53:17.375504+05:30
d0d820e5-9def-4510-92e1-dc5446748bfe	TASK	b4df26c1-afca-4a0a-8e09-6e1aa9121e69	Task: College Cultural Fest Aftermovie Edit. Category: Video & Animation. Required Skills: Video Editing, Sound Design, Premiere. Description: Compile 3 days of drone, camera, and smartphone footage into a cinematic 3-minute aftermovie with rhythmic beat-matching audio.. Budget: ₹1300.00.	{0.027172,-0.027172,0,-0.027172,0,0,0,0,0.054345,0,0.054345,0,0,-0.054345,0.027172,-0.054345,0,-0.081517,0.081517,-0.027172,0.081517,0,0,0,0,-0.081517,0.054345,0,0,0,0,0,0,0,0.027172,0,0,0,0.027172,0,0,0,0.108689,0,0,-0.027172,0.081517,0,0,0,0,0,0,0,0,0,0.027172,0,0.027172,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.027172,0,0,0,0,0,0,0,0,0,0,0.054345,0,0.054345,0,0.027172,0,0.081517,0,0.027172,0,0,0,0.054345,0,0,-0.054345,0.027172,-0.027172,0,0,0,0,0,0,0,0,0,-0.054345,0,0,0,-0.027172,0,-0.027172,0.027172,0,0,-0.027172,0,-0.027172,0,0,0,-0.027172,0,0,0,-0.054345,0.027172,0,0.027172,0,0.02758,0.045472,0.074971,0.123607,0.203793,0.096434,0.074971,0.045472,0.081925,0,0.027172,0,0.054345,0,0.054345,0,0,0,0.027172,0,0.054345,-0.054345,0.027172,0,0,0,0,0,0.027172,0,0.054345,0,0,0,0,0,0,-0.027172,0,0,0.027172,0,0,0,0,0,0,0,0,0,0.027172,0,0,0,0,0,0,0,0.055161,0.090945,0.177523,0.265513,0.509729,0.316475,0.40808,0.187379,0.130132,0.045472,0.02758,0,0.027172,0,0,-0.054345,0.027172,-0.027172,0,0,0,0,0,-0.027172,0,-0.027172,0,0,0.027172,0,0,0,0.081517,0,0,0,0,0,0,0,0,0,0.027172,0,0,-0.027172,0,0,0,-0.027172,0,0,0,0,0,0,0,0,0,0,0.027172,0,0,-0.027172,0,0,0,0,0,0,0,-0.027172,0,0,0,0,0.081517,0,0,-0.054345,0.054345,0,0.027172,0,0.054345,0,0,0,0.027172,0,0,0,0.027172,0,0,-0.081517,0.027172,-0.027172,0,0,0,0,0,-0.027172,0,0,0,0,0,-0.054345,0,0,0,0,0,0,0,0,0,-0.054345,0,-0.027172,0,-0.054345,0,0,0,-0.027172,0.027172,0,0,0,0,-0.027172,0.027172,0,0,0,0,0,0.027172,-0.027172,0,0,0.027172,0,0,0,0.027172,-0.081517,0.027172,0,0,0,0.027172,0,0.027172,0,0.108689,0,0.054345,0,0,-0.027172,0.054345,0,0,-0.027172,0,-0.027172,0,-0.027172,0.027172,-0.027172,0.027172,-0.027172,0.027172,0,0,0,0,-0.027172,0,-0.027172,0,0,0,0,0,0}	2026-09-29 22:53:17.376296+05:30	2026-09-29 22:53:17.376296+05:30
a5f4ac00-4e60-4f5e-9e48-f3e2ce11e3d0	TASK	5ae5f2c5-e7af-487e-af8d-49172cca08d1	Task: LaTeX Formatting for IEEE Conference Paper. Category: Technical Writing. Required Skills: Technical Writing, LaTeX, Documentation. Description: Format a 6-page double-column research manuscript in Overleaf LaTeX, including equations, citation bibtex, and figure placements.. Budget: ₹450.00.	{0.038281,0,0.038281,-0.038281,0.076562,0,0,-0.076562,0.229685,-0.038281,0.114842,0,0.038281,0,0,0,0,0,0,0,0,0,0.038281,0,0,-0.229685,0.153123,0,0,-0.076562,0,0,0,-0.076562,0.076562,0,0,0,0,0,0,0,0,0,0,-0.076562,0.076562,0,0,0,0,0,0,0,0,0,0.038281,0,0.038281,0,0,0,0,0,0,0,0,0,0,-0.038281,0,0,0,-0.114842,0,-0.038281,0,0,0,-0.038281,0,0,0.038281,0,0,0,0.114842,0,0.038281,0,0.076562,-0.038281,0.038281,0,0,-0.038281,0,0,0,0,0,-0.038281,0,0,0.038281,0,0.076562,-0.038281,0,0,0.076562,0,0,0,0,-0.038281,0,-0.038281,0.038281,-0.038281,0,-0.038281,0,0,0,0,0,-0.038281,0,0,0,0,0,-0.038281,0.076562,0,0,0,0,0,0,-0.038281,0.038281,0,0,0,0.153123,0,0,0,0.191404,-0.038281,0,0,0,0,0,0,0.076562,-0.153123,0,-0.038281,0,-0.076562,0,0,0.038281,-0.076562,0,-0.076562,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.038281,0,0,-0.038281,0.038281,-0.038281,0,0,0,0,0,0,0.038281,-0.038281,0,0,0,-0.114842,0.038281,0,0,0,0.076562,-0.038281,0.038281,0,0,0,0.038281,0,0,-0.076562,0,0,0,0,0,0,0.076562,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.076562,0,0,0,0,0,0,0,-0.038281,0,0,0,0,0.038856,0.064062,0.10562,0.174139,0.287106,0.174139,0.144476,0.128124,0.182757,0.174139,0.287106,0.174139,0.10562,0.064062,0.038856,-0.038281,0,-0.076562,0.114842,-0.038281,0,-0.038281,0.038281,0,0,0,0,-0.038281,0,-0.038281,0.038281,0,0.038281,0,0,-0.038281,0,0,0,-0.153123,0,-0.038281,0,0,0.038281,-0.038281,0,-0.038281,0,0,0,0,0,0,0,0,0.038281,0,0,0,0,-0.038281,0,0,0,0,0.038281,0,0,0,0,0,0,0,0.038281,0,0,-0.038281,0.076562,0,0,0,0,-0.038281,0,0,0.114842,-0.038281,0,-0.038281,0.076562,-0.038281,0,0,0.076562,0,0.076562,0,0.153123,0,0,-0.038281,0,-0.038281,0.076562,-0.038281,0,-0.076562,0,-0.038281,0,0,0,-0.038281,0.038281,0,0.038281,0,0,0,0,0,0,-0.114842,0,0,0,-0.038281}	2026-09-29 22:53:17.379003+05:30	2026-09-29 22:53:17.379003+05:30
485e3798-5ff2-483b-ab7f-95be9062502b	STUDENT	2343168b-7b68-4582-b84a-748fe2c18dd0	Student: Vikram Aditya. Department: Computer Science & Engineering. College: PES University. Skills: React (Software & Web Dev) level:ADVANCED exp:2.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.049284,-0.098569,0,-0.049284,0,0,0.050024,0.082476,0.13598,0.224194,0.418918,0.224194,0.13598,0.082476,0.050024,-0.147853,0,0,0.049284,0,0,0,0.049284,-0.049284,0.049284,-0.098569,0.050024,0.033192,0.13598,0.224194,0.369633,0.224194,0.13598,0.082476,0.050024,0,0,0,0.049284,0,0,-0.049284,0,0,0,0,0.098569,0,0,0,0.049284,-0.049284,0,0,0.049284,0,0,0,0,0,0,0,0.049284,0,0,0,0.049284,0,0,0,0,0,0,-0.098569,0,0,0,0,0,0,0,0,0.098569,0,0.098569,0,0.049284,0,0,0,0.049284,0,0.049284,0,0,0,0,0,0,-0.049284,0,-0.049284,0.049284,0,0,-0.049284,0,0,0,0,0,0,0,0,0,-0.049284,0,0,0,-0.049284,0,-0.049284,0.049284,0,0.049284,-0.049284,0,0,0,0,0,-0.049284,0,0,0,0,0,0,0,0,0.049284,0,0,0,0,0,0,0,0,0,0.098569,0,0,0,0,0,0,0,0.049284,0,0,-0.049284,0,-0.049284,0,-0.049284,0.098569,0,0,0,0,0,0,0,0.098569,0,0,0,0,0,0.049284,0,0,0,0,0,0,0,0,0,0,-0.049284,0,0,0,0,0,0,0,0,0,0,0,0,0.049284,0,0.049284,0,0.098569,0,0,0,0.049284,0,0,0,0.049284,0,0,0,0,0,0.049284,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.098569,0.147853,-0.049284,0.049284,-0.049284,0,-0.049284,0,-0.098569,0,0,0,0,0,-0.098569,0,-0.147853,0.049284,0,0,-0.049284,0,-0.049284,0,0,0.049284,0,0,-0.049284,0,0,0,0,0,-0.049284,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.049284,0.049284,0,0,0,0,0,0,0,0.049284,0,0.098569,0,0,0,0.049284,0,0,0,0.049284,0,0,0,0.049284,0,0.049284,0,0.098569,0,0,0,0,0,0.049284,-0.049284,0,-0.147853,0,0,0,0,0.049284,0,0.049284,0,0.049284,0,0,0,0,0,0,0,0,0,0,0}	2026-09-30 10:48:27.427492+05:30	2026-09-30 10:48:27.427492+05:30
5b5ad381-9e27-435b-bd7a-dc1ec7b5cf7d	TASK	56dcad08-c5f7-42e5-a6a2-fcd36963e7da	Task: Next.js Real-Time Event Dashboard 1790745507181. Category: Software & Web Dev. Required Skills: Next.js, React, PostgreSQL. Description: Build a Next.js 14 dashboard with server actions and PostgreSQL event booking tables.. Budget: ₹1500.	{0,0,0,0,0,0,0.03776,0.062255,0.177044,0.169228,0.353412,0.132026,0.139843,0.062255,0.03776,0,0.037201,0,0.074402,0,0,0,0,0,0.037201,-0.037201,0.112162,0.062255,0.102642,0.169228,0.279009,0.169228,0.102642,0.025054,0.074961,0,0,0,0,0,0,0,0,0,0,-0.037201,0.037201,0,0,0,0,0,0,0,0,0,0.037201,0,0,0,0,0,0.037201,0,0.037201,0,0,0,0,0,0,0,0,-0.037201,0,0,0,0,0.074402,0,0,0,0,-0.148805,0.074402,-0.037201,0.037201,0,0,0,0.149364,0.025054,0.139843,0.169228,0.279009,0.169228,0.139843,0.062255,0.074961,0,0,0,0,0,0,-0.037201,0.037201,0,0,0,0,0,0.111604,0,0,-0.037201,0,-0.037201,0.111604,0,0,-0.037201,0,0,0,-0.037201,0,0,0,0,0,-0.074402,0,0,0,0,0,0,0,0,0,-0.037201,0.037201,0,0.074402,0,0.037201,0,0,-0.037201,0.074402,0,0.037201,0,0,0,0,-0.074402,0,0,0,0,0,0,0,0,0.111604,0,0,0,0,0,0,-0.074402,0,0,0,0,0,0,0.074402,-0.074402,0,0,0,0,0,0,0,0,0,0,0,0,0.037201,0,0,-0.037201,0,0,0,0,0,0,0,0,0.037201,0,0.037201,0,0,0,0.186006,0,0,0,0.037201,0,0,0,0,0,0.037201,0,0,0,0.074402,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.074402,0,-0.037201,0,0,0,0,0,0,0.037201,0,0,0,0.037201,0,0,0,0,0,0,0,0,0,0.037201,0,0,-0.074402,0.074402,0,0,-0.074402,0.037201,0,0,-0.037201,0.037201,0,0,0,0.037201,0,0,0,0.074402,-0.074402,0.074402,-0.260409,0,-0.037201,0,0,0,0,0,-0.037201,0,0,0,0,0,0,0,0,0.111604,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037201,0.037201,0,0,0,0,-0.037201,0,0,0,0,0,0,0,0,0.037201,0,0,0,0,0,0.037201,-0.037201,0,0,0,0,0,0,0,-0.074402,0.074402,0,0.037201,0,0,-0.037201,0,0,0.037201,-0.037201,0,-0.111604,0,0,0,0,0,-0.037201,0,0,0.037201,0,0.037201,-0.111604,0.037201,0,0,0,0,0,0,0}	2026-09-30 10:48:27.494454+05:30	2026-09-30 10:48:27.494454+05:30
795ef938-c39a-4b47-8be1-cc68ff27a8c6	STUDENT	3073a443-b87f-412f-93e6-7016c53f5365	Student: Sneha Kulkarni. Department: Information Science. College: RVCE. Skills: Next.js (Software & Web Dev) level:EXPERT exp:3.0yrs, React (Software & Web Dev) level:EXPERT exp:3.0yrs. Completed Tasks: 0. Rating: 0.00.	{0.033204,-0.033204,0,-0.033204,0,0,0.033702,0.055566,0.124816,0.151044,0.315436,0.151044,0.15802,0.055566,0.033702,0,0,0,0.033204,0,0,0,0.033204,0,0,-0.066408,0.100609,0.111132,0.183225,0.302087,0.498057,0.268883,0.183225,0.111132,0.067405,0,0,0,0,0,0,-0.033204,0,0,0,0,0.066408,0,0,0,0,0,0,0,0.033204,0,0,0,0,0,0,0,0.066408,0,0,0,0.033204,0,0,0,0,0,0,-0.066408,0,0,0,0,0,0,0,0,0.033204,0,0.132815,0,0.033204,0,0,0,0,0,0,-0.033204,0,0,0,0,0,-0.033204,0,-0.033204,0,-0.066408,0,-0.033204,0.033204,0,0,0,0,0,0.033204,0,0,-0.033204,0,0,0,-0.066408,0,-0.033204,0.066408,0,0,-0.066408,0,0,0,0,0,-0.033204,0,0,0.033204,0,0,0,0,0,0.033204,0,0,0,0,0,0,0,0,0,0.099611,0,0,0,0,0,0,0,0.033204,0,0,-0.033204,0,0,0,-0.033204,0.033204,0,0,0,0,0,0,-0.033204,0,0,0,0,0,0,0.033204,-0.066408,0,0,0,0,0,0,0,0,0,-0.033204,0,0,0.033204,0,0,0,0,0,0,-0.033204,0,0,0,0,0.033204,0,0.033204,0,0,0,0.066408,0,0,0,0.033204,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.066408,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.066408,0.066408,-0.033204,0,-0.066408,0,-0.033204,0,-0.066408,0,0,0,0,0,-0.066408,0,-0.332038,0,0,0,-0.066408,0,0,0,0,0,0,0,-0.033204,0,0,0,0,0,-0.033204,0,0,0.033204,0,0.033204,0,0,-0.033204,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033204,0,0,0,0,0,0,0,0,0,0,0.033204,-0.033204,0,0,0,0,0,0,0.033204,0,0.033204,0,0,0,0.033204,-0.033204,0.033204,0,0,0,0,0,0.066408,-0.066408,0.033204,-0.099611,0,0,0,0,0,0,0.033204,0,0,0,0,-0.033204,0,0,0,0,0,0,0,0}	2026-09-30 10:48:27.637203+05:30	2026-09-30 10:48:27.641985+05:30
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (payment_id, task_id, payer_id, receiver_id, amount, payment_status, paid_at) FROM stdin;
98505909-0ba0-4de8-89b4-a127e7680cb8	16ddb780-99e3-4a02-8dee-52e289850649	031ff5de-dbb0-4999-be82-6874bba70fb4	3372584b-11df-4dbe-9c7c-4b87da4c2187	600.00	SUCCESS	2026-09-29 10:53:17.141063+05:30
d9024810-3bef-439a-aff8-20f669094413	d6e3ace6-72c9-4811-ac56-7ba5e63379a6	9f183314-ffb3-48d4-a186-e94785e58885	bb461a1e-fd43-464b-99d3-f909373e45c0	950.00	SUCCESS	2026-09-28 22:53:17.305068+05:30
57ad29ae-6c47-443c-a02f-1661c55815d8	9c746442-fba6-46dc-ac44-1f266077ef12	cce49998-ae75-411e-91d8-c3c360ab1298	a290d37f-202c-4251-aff1-ebb2283e436c	500.00	SUCCESS	2026-09-28 22:53:17.305068+05:30
e2b44375-c446-4690-b0f9-a4534384ac75	59e1263d-34e1-4d6a-a445-a855b3fc65c6	bb461a1e-fd43-464b-99d3-f909373e45c0	d82aadf4-a980-4b41-b4a4-adcecf1b863b	800.00	SUCCESS	2026-09-28 22:53:17.305068+05:30
38b01b15-4171-4366-b22d-d5c9a5c139fd	56dcad08-c5f7-42e5-a6a2-fcd36963e7da	2343168b-7b68-4582-b84a-748fe2c18dd0	3073a443-b87f-412f-93e6-7016c53f5365	1500.00	SUCCESS	2026-09-30 10:48:27.771995+05:30
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (review_id, task_id, reviewer_id, reviewed_user_id, rating, comment, created_at) FROM stdin;
03119401-af30-4b5f-a6f7-4d2122df2f64	16ddb780-99e3-4a02-8dee-52e289850649	031ff5de-dbb0-4999-be82-6874bba70fb4	3372584b-11df-4dbe-9c7c-4b87da4c2187	5	Exceptional design quality! Delivered ahead of schedule with clean vector assets. Highly recommended for creative college design tasks.	2026-09-29 12:53:17.141063+05:30
39bd9894-6945-4a6b-ae0b-1163c40701a0	d6e3ace6-72c9-4811-ac56-7ba5e63379a6	9f183314-ffb3-48d4-a186-e94785e58885	bb461a1e-fd43-464b-99d3-f909373e45c0	5	Fantastic work! The QR scanner operated flawlessly during our club orientation event.	2026-09-29 02:53:17.305068+05:30
17cff014-ba8f-46ed-bd07-945253a1d309	9c746442-fba6-46dc-ac44-1f266077ef12	cce49998-ae75-411e-91d8-c3c360ab1298	a290d37f-202c-4251-aff1-ebb2283e436c	5	Superb aesthetic sense and rapid turnaround. Students loved the handouts!	2026-09-29 02:53:17.305068+05:30
21595b0c-7d9a-4152-89fb-6ec95d2c41e7	59e1263d-34e1-4d6a-a445-a855b3fc65c6	bb461a1e-fd43-464b-99d3-f909373e45c0	d82aadf4-a980-4b41-b4a4-adcecf1b863b	4	Very thorough analysis and clear visualizations. Accurate classification.	2026-09-29 02:53:17.305068+05:30
c5886fd3-dc27-4f11-99ec-65d939ffa3b0	56dcad08-c5f7-42e5-a6a2-fcd36963e7da	2343168b-7b68-4582-b84a-748fe2c18dd0	3073a443-b87f-412f-93e6-7016c53f5365	5	Exceptional full-stack execution! Clean Next.js code and delivered well ahead of schedule.	2026-09-30 10:48:27.775988+05:30
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (version, applied_at) FROM stdin;
001_initial_schema.sql	2026-09-29 22:53:17.002333+05:30
002_indexes.sql	2026-09-29 22:53:17.02091+05:30
003_views.sql	2026-09-29 22:53:17.045145+05:30
004_triggers_and_functions.sql	2026-09-29 22:53:17.047824+05:30
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skills (skill_id, skill_name, description, category) FROM stdin;
0e53573d-1132-49cf-8143-8fded078eda4	React	Modern React components, hooks, and responsive interfaces	Software & Web Dev
45fb8ead-432c-4256-96ce-cf656290be76	Next.js	Full-stack Next.js App Router, SSR, and API route development	Software & Web Dev
fe2906d1-9379-454b-bf9c-c88132c8b855	PostgreSQL	Relational database schema design, indexing, and complex queries	Software & Web Dev
d4f4634c-ad89-44e2-8c33-6ba5e6e625d9	Python	Python scripting, automation, backend development, and data manipulation	Data & AI
99c016c4-8c22-4513-b8c9-cb7a6373fa6e	Pandas	Data analysis, CSV transformation, and exploratory data analytics	Data & AI
eaa797e7-bae7-4f92-b270-171a2296096c	Machine Learning	Scikit-learn model building, classification, and regression	Data & AI
b04bce92-9b77-49a0-87eb-0a4b6a548ea4	Canva	Fast template-driven creative posters and social media banners	Graphic Design
ad7fac14-28d4-4b23-82c3-f8f32b41de0c	Photoshop	Photo editing, image manipulation, and raster design	Graphic Design
2694e208-4875-4dfe-a8cc-77f99c2c11c2	Figma	Wireframing, modern mobile and desktop UI/UX prototyping	Graphic Design
6545753e-622d-419c-a86d-eb87d6842e3b	Video Editing	Cutting, color grading, sound design, and reels	Video & Animation
f099f2ca-8979-40e3-ad30-e315be52bd5e	Content Writing	Engaging blog posts, project summaries, and articles	Technical Writing
5209e9d0-cec4-4481-b8cf-b2c9f1e684c1	Technical Writing	Software documentation, IEEE format reports, and technical manuals	Technical Writing
\.


--
-- Data for Name: student_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_skills (student_skill_id, user_id, skill_id, proficiency_level, years_experience) FROM stdin;
2b59986e-55f1-4f6c-bca3-d19d5e04f46b	031ff5de-dbb0-4999-be82-6874bba70fb4	0e53573d-1132-49cf-8143-8fded078eda4	EXPERT	2.5
f4931478-a027-4e08-8fa1-81982538c784	031ff5de-dbb0-4999-be82-6874bba70fb4	45fb8ead-432c-4256-96ce-cf656290be76	ADVANCED	2.0
2e83247b-50ab-4cf6-af7c-cea381fc75a0	031ff5de-dbb0-4999-be82-6874bba70fb4	fe2906d1-9379-454b-bf9c-c88132c8b855	ADVANCED	1.5
13ca41e4-0588-47d7-ba18-033e3d5db774	518c8f59-bc40-492c-a6e6-ab86c8f27954	d4f4634c-ad89-44e2-8c33-6ba5e6e625d9	EXPERT	3.0
008e1279-3162-47ed-9af3-53e770109759	518c8f59-bc40-492c-a6e6-ab86c8f27954	99c016c4-8c22-4513-b8c9-cb7a6373fa6e	ADVANCED	2.0
437630c9-0167-46dd-92d5-33d54329816a	518c8f59-bc40-492c-a6e6-ab86c8f27954	eaa797e7-bae7-4f92-b270-171a2296096c	ADVANCED	1.5
e5d0aed5-b7b3-4ccf-836a-7b9d61c812d7	a734fc91-fc42-4d07-a7ff-401023cb4778	d4f4634c-ad89-44e2-8c33-6ba5e6e625d9	INTERMEDIATE	1.0
ebb40e34-1dd6-4801-824b-08fb7b58e86c	a734fc91-fc42-4d07-a7ff-401023cb4778	5209e9d0-cec4-4481-b8cf-b2c9f1e684c1	ADVANCED	2.0
ea6f0ce7-bf9e-4dc5-b71c-279ed3cf4362	3372584b-11df-4dbe-9c7c-4b87da4c2187	b04bce92-9b77-49a0-87eb-0a4b6a548ea4	EXPERT	3.0
538eab40-826b-4194-8709-3509b5c17cdb	3372584b-11df-4dbe-9c7c-4b87da4c2187	ad7fac14-28d4-4b23-82c3-f8f32b41de0c	ADVANCED	2.0
de4117c2-fea5-45eb-99b8-897069f9b44e	3372584b-11df-4dbe-9c7c-4b87da4c2187	2694e208-4875-4dfe-a8cc-77f99c2c11c2	EXPERT	2.5
89a8e716-8605-4748-93d2-3c238281c5c5	3372584b-11df-4dbe-9c7c-4b87da4c2187	6545753e-622d-419c-a86d-eb87d6842e3b	ADVANCED	1.5
d45fa7fd-1bb7-48f5-bd43-5831176906ff	23d84a15-a015-43b4-a53d-14c8a7f441a2	6545753e-622d-419c-a86d-eb87d6842e3b	EXPERT	2.0
da8913f5-d25a-4273-a827-b15caea378f1	23d84a15-a015-43b4-a53d-14c8a7f441a2	f099f2ca-8979-40e3-ad30-e315be52bd5e	INTERMEDIATE	1.0
3d79c451-8fdd-4a24-899e-e4596acb8eff	bb461a1e-fd43-464b-99d3-f909373e45c0	0e53573d-1132-49cf-8143-8fded078eda4	EXPERT	2.5
80a58beb-533c-41ed-b5b5-591d7add60fa	bb461a1e-fd43-464b-99d3-f909373e45c0	45fb8ead-432c-4256-96ce-cf656290be76	ADVANCED	2.0
1f0df505-812e-4021-a1f0-5bef70c9b1a5	d82aadf4-a980-4b41-b4a4-adcecf1b863b	d4f4634c-ad89-44e2-8c33-6ba5e6e625d9	EXPERT	3.0
1ac2fa69-6877-41e6-a3d4-7c3632f2c235	d82aadf4-a980-4b41-b4a4-adcecf1b863b	eaa797e7-bae7-4f92-b270-171a2296096c	ADVANCED	2.0
bb3dc755-788d-42e7-857f-02e93183aeb3	d82aadf4-a980-4b41-b4a4-adcecf1b863b	99c016c4-8c22-4513-b8c9-cb7a6373fa6e	ADVANCED	1.5
57fb0001-2b7c-40e3-add5-88d3de391c50	97edacb5-7c99-48ff-aa2f-4c2897f9ebf9	fe2906d1-9379-454b-bf9c-c88132c8b855	EXPERT	2.5
7b17d64e-6dd9-4089-9098-b216eed1e541	97edacb5-7c99-48ff-aa2f-4c2897f9ebf9	45fb8ead-432c-4256-96ce-cf656290be76	ADVANCED	2.0
3fc21ed3-9668-4f8b-b5cb-261e007890ad	a290d37f-202c-4251-aff1-ebb2283e436c	b04bce92-9b77-49a0-87eb-0a4b6a548ea4	EXPERT	3.0
58462281-2ebf-4900-a3ff-2da119605c5a	a290d37f-202c-4251-aff1-ebb2283e436c	ad7fac14-28d4-4b23-82c3-f8f32b41de0c	EXPERT	2.5
30c51f6a-6a7f-4f8d-b3ee-dc00ef15c437	a290d37f-202c-4251-aff1-ebb2283e436c	2694e208-4875-4dfe-a8cc-77f99c2c11c2	EXPERT	3.0
85e1ebdf-107d-4e10-808b-a3de4def676d	9f183314-ffb3-48d4-a186-e94785e58885	6545753e-622d-419c-a86d-eb87d6842e3b	ADVANCED	2.0
c6af6efe-7330-4ddd-b05c-c463e744b7a3	cce49998-ae75-411e-91d8-c3c360ab1298	d4f4634c-ad89-44e2-8c33-6ba5e6e625d9	ADVANCED	2.0
97dc5c13-27cc-49df-9ff8-f6755b36e4d4	cce49998-ae75-411e-91d8-c3c360ab1298	fe2906d1-9379-454b-bf9c-c88132c8b855	INTERMEDIATE	1.5
fcb8d9ec-d7f1-40bc-a4fb-64637c26de13	a7ac217d-ab10-44b0-8fc6-19e004b7df40	5209e9d0-cec4-4481-b8cf-b2c9f1e684c1	EXPERT	3.0
b64615d8-6724-49d8-9345-fdfdfae7f663	a7ac217d-ab10-44b0-8fc6-19e004b7df40	f099f2ca-8979-40e3-ad30-e315be52bd5e	ADVANCED	2.0
6a48edfe-66cc-4fba-82ed-cb95de9e0e3a	d985957d-e8c0-4f82-a459-6570e78a8fb5	6545753e-622d-419c-a86d-eb87d6842e3b	INTERMEDIATE	1.5
33d9ce36-0a34-41b8-9147-5a859acbbaa8	2343168b-7b68-4582-b84a-748fe2c18dd0	0e53573d-1132-49cf-8143-8fded078eda4	ADVANCED	2.0
15f889c5-a9a8-4718-ade2-a31bf88fd184	3073a443-b87f-412f-93e6-7016c53f5365	45fb8ead-432c-4256-96ce-cf656290be76	EXPERT	3.0
3c35bdb5-ca56-4726-b6e1-aaecc9edde75	3073a443-b87f-412f-93e6-7016c53f5365	0e53573d-1132-49cf-8143-8fded078eda4	EXPERT	3.0
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (task_id, owner_id, category_id, title, description, required_skills, budget, deadline, status, created_at, updated_at) FROM stdin;
aee1c4bd-688e-42b6-b745-b1c20d27a80c	031ff5de-dbb0-4999-be82-6874bba70fb4	60c12ae3-0df6-4077-8129-ae9ec73fa476	College Fest Poster & Instagram Banner	Need a stunning vibrant A3 poster for our annual college fest. Should follow neon retro theme with event dates, venue, and QR code for registrations.	Canva, Photoshop, Figma, Graphic Design	450.00	2026-10-09 22:53:17.196+05:30	OPEN	2026-09-29 22:53:17.141063+05:30	2026-09-29 22:53:17.141063+05:30
34021728-6a60-492f-98b0-685a961bf775	518c8f59-bc40-492c-a6e6-ab86c8f27954	8442cf84-bf6e-4b43-b0dc-85a696580e03	Next.js Hackathon Registration Landing Page	Need a clean single-page Next.js site with form validation for college hackathon registrations. Must have sleek dark mode aesthetics.	Next.js, React, Tailwind, UI	1200.00	2026-10-13 22:53:17.196+05:30	OPEN	2026-09-29 22:53:17.141063+05:30	2026-09-29 22:53:17.141063+05:30
cda5b62c-0bf3-4370-bf3b-f602400eb913	a734fc91-fc42-4d07-a7ff-401023cb4778	593e89cb-402b-45f5-a72d-6a87c282ebea	Python Web Scraper for Placement Notices	Automated Python script with BeautifulSoup or Selenium to extract placement notifications from student portal and save into structured JSON/CSV.	Python, Pandas, Web Scraping	700.00	2026-10-06 22:53:17.196+05:30	OPEN	2026-09-29 22:53:17.141063+05:30	2026-09-29 22:53:17.141063+05:30
e1ca24f1-1ee8-4e9e-9266-3128546725f9	23d84a15-a015-43b4-a53d-14c8a7f441a2	54c34649-c5c5-4250-aae4-c3dc956705a1	Robotics Club Teaser Video & Reel	Edit raw footage of our battle bots competition into a fast-paced 60-second Instagram Reel with sync audio and captions.	Video Editing, Reels, Premiere	500.00	2026-10-04 22:53:17.196+05:30	OPEN	2026-09-29 22:53:17.141063+05:30	2026-09-29 22:53:17.141063+05:30
0ff604ef-22fb-4201-8ee8-a8ef90ab1ae0	3372584b-11df-4dbe-9c7c-4b87da4c2187	96a75d13-0530-4ed7-9a4c-8c0770a8eac8	DBMS Project Report Formatting & Proofreading	Proofread and format our Level 3 DBMS academic project report into standard IEEE conference style with ER diagram captions.	Technical Writing, Documentation, Report	350.00	2026-10-03 22:53:17.196+05:30	OPEN	2026-09-29 22:53:17.141063+05:30	2026-09-29 22:53:17.141063+05:30
16ddb780-99e3-4a02-8dee-52e289850649	031ff5de-dbb0-4999-be82-6874bba70fb4	60c12ae3-0df6-4077-8129-ae9ec73fa476	AI Symposium Logo and Badge Design	Create minimalist vector logo and volunteer ID card badge for IEEE AI symposium.	Figma, Canva, Logo Design	600.00	2026-09-27 22:53:17.196+05:30	COMPLETED	2026-09-29 22:53:17.141063+05:30	2026-09-29 22:53:17.141063+05:30
82770f40-eb5e-475c-878c-a24b01ec077a	bb461a1e-fd43-464b-99d3-f909373e45c0	593e89cb-402b-45f5-a72d-6a87c282ebea	Pandas Script to Clean College Survey Data	Clean, normalize, and handle missing values in a 5,000-row CSV student survey dataset and generate summary charts.	Python, Pandas, Data Analytics	650.00	2026-10-05 22:53:17.304+05:30	OPEN	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
a74357fd-067b-47d3-95cb-546c543bc4f4	d82aadf4-a980-4b41-b4a4-adcecf1b863b	8442cf84-bf6e-4b43-b0dc-85a696580e03	Responsive Portfolio Website in React	Convert Figma designs into responsive clean React components with smooth scrolling, project gallery, and contact form.	React, Tailwind, UI/UX	1100.00	2026-10-11 22:53:17.304+05:30	OPEN	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
3b7566f7-b4fa-409c-a4af-b72574832389	a290d37f-202c-4251-aff1-ebb2283e436c	60c12ae3-0df6-4077-8129-ae9ec73fa476	Tech Fest T-shirt and Hoodie Vector Artwork	Minimalist vector illustration for our annual technical symposium merchandise with front chest badge and back artwork.	Photoshop, Figma, Vector Design	550.00	2026-10-07 22:53:17.304+05:30	OPEN	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
5ae5f2c5-e7af-487e-af8d-49172cca08d1	9f183314-ffb3-48d4-a186-e94785e58885	96a75d13-0530-4ed7-9a4c-8c0770a8eac8	LaTeX Formatting for IEEE Conference Paper	Format a 6-page double-column research manuscript in Overleaf LaTeX, including equations, citation bibtex, and figure placements.	Technical Writing, LaTeX, Documentation	450.00	2026-10-04 22:53:17.304+05:30	OPEN	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
b4df26c1-afca-4a0a-8e09-6e1aa9121e69	a7ac217d-ab10-44b0-8fc6-19e004b7df40	54c34649-c5c5-4250-aae4-c3dc956705a1	College Cultural Fest Aftermovie Edit	Compile 3 days of drone, camera, and smartphone footage into a cinematic 3-minute aftermovie with rhythmic beat-matching audio.	Video Editing, Sound Design, Premiere	1300.00	2026-10-14 22:53:17.304+05:30	OPEN	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
d6e3ace6-72c9-4811-ac56-7ba5e63379a6	9f183314-ffb3-48d4-a186-e94785e58885	8442cf84-bf6e-4b43-b0dc-85a696580e03	Club Event Attendance QR Scanner Web App	Lightweight web tool allowing club coordinators to scan student tickets and mark attendance in PostgreSQL.	Next.js, PostgreSQL, QR Scanner	950.00	2026-09-26 22:53:17.304+05:30	COMPLETED	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
9c746442-fba6-46dc-ac44-1f266077ef12	cce49998-ae75-411e-91d8-c3c360ab1298	60c12ae3-0df6-4077-8129-ae9ec73fa476	Robotics Workshop Brochure & Handout	Design a clean 2-fold informational brochure highlighting workshop schedule, speaker profiles, and hardware kits.	Canva, Figma, Typography	500.00	2026-09-24 22:53:17.304+05:30	COMPLETED	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
59e1263d-34e1-4d6a-a445-a855b3fc65c6	bb461a1e-fd43-464b-99d3-f909373e45c0	593e89cb-402b-45f5-a72d-6a87c282ebea	Sentiment Analysis on Student Feedback Forms	Classify 1,200 open-ended course evaluation comments into positive, neutral, and negative using NLP.	Python, Machine Learning, Pandas	800.00	2026-09-25 22:53:17.304+05:30	COMPLETED	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
fd780065-0fcb-4a1e-865b-8814b88757d2	cce49998-ae75-411e-91d8-c3c360ab1298	8442cf84-bf6e-4b43-b0dc-85a696580e03	PostgreSQL Database Query Optimization for College Portal	Analyze slow queries with EXPLAIN ANALYZE, add proper composite indexes, and write aggregation views.	PostgreSQL, SQL, Indexing	850.00	2026-10-06 22:53:17.304+05:30	IN_PROGRESS	2026-09-29 22:53:17.305068+05:30	2026-09-29 22:53:17.305068+05:30
56dcad08-c5f7-42e5-a6a2-fcd36963e7da	2343168b-7b68-4582-b84a-748fe2c18dd0	8442cf84-bf6e-4b43-b0dc-85a696580e03	Next.js Real-Time Event Dashboard 1790745507181	Build a Next.js 14 dashboard with server actions and PostgreSQL event booking tables.	Next.js, React, PostgreSQL	1500.00	2026-10-07 10:48:27.439+05:30	COMPLETED	2026-09-30 10:48:27.440535+05:30	2026-09-30 10:48:27.771995+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, name, email, password_hash, college, department, role, created_at, is_active) FROM stdin;
ce24ead1-fec4-46cb-9d4b-8f1eb377345e	Admin Supervisor	admin@prayaspro.edu	$2b$10$E4VnISh3PlKXU5KZci5NYecR/ZKlVqCJ3C.WwOCzpNERpczybG1YK	PES University	CSE	ADMIN	2026-09-29 22:53:17.141063+05:30	t
031ff5de-dbb0-4999-be82-6874bba70fb4	Aarav Sharma	aarav@pesu.edu	$2b$10$E4VnISh3PlKXU5KZci5NYecR/ZKlVqCJ3C.WwOCzpNERpczybG1YK	PES University	Computer Science	STUDENT	2026-09-29 22:53:17.141063+05:30	t
518c8f59-bc40-492c-a6e6-ab86c8f27954	Priya Nair	priya@pesu.edu	$2b$10$E4VnISh3PlKXU5KZci5NYecR/ZKlVqCJ3C.WwOCzpNERpczybG1YK	PES University	AI & Machine Learning	STUDENT	2026-09-29 22:53:17.141063+05:30	t
a734fc91-fc42-4d07-a7ff-401023cb4778	Rohit Verma	rohit@rvce.edu	$2b$10$E4VnISh3PlKXU5KZci5NYecR/ZKlVqCJ3C.WwOCzpNERpczybG1YK	RVCE	Information Science	STUDENT	2026-09-29 22:53:17.141063+05:30	t
3372584b-11df-4dbe-9c7c-4b87da4c2187	Ananya Rao	ananya@bmsce.edu	$2b$10$E4VnISh3PlKXU5KZci5NYecR/ZKlVqCJ3C.WwOCzpNERpczybG1YK	BMSCE	Design & Media	STUDENT	2026-09-29 22:53:17.141063+05:30	t
23d84a15-a015-43b4-a53d-14c8a7f441a2	Karthik Gowda	karthik@pesu.edu	$2b$10$E4VnISh3PlKXU5KZci5NYecR/ZKlVqCJ3C.WwOCzpNERpczybG1YK	PES University	Electronics & Comm	STUDENT	2026-09-29 22:53:17.141063+05:30	t
bb461a1e-fd43-464b-99d3-f909373e45c0	Devika Menon	devika@pesu.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	PES University	Computer Science	STUDENT	2026-09-29 22:53:17.305068+05:30	t
d82aadf4-a980-4b41-b4a4-adcecf1b863b	Rohan Deshmukh	rohan@rvce.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	RVCE	AI & Machine Learning	STUDENT	2026-09-29 22:53:17.305068+05:30	t
97edacb5-7c99-48ff-aa2f-4c2897f9ebf9	Sneha Kulkarni	sneha@bmsce.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	BMSCE	Information Science	STUDENT	2026-09-29 22:53:17.305068+05:30	t
9f183314-ffb3-48d4-a186-e94785e58885	Varun Hegde	varun@msrit.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	MSRIT	Electronics & Comm	STUDENT	2026-09-29 22:53:17.305068+05:30	t
a290d37f-202c-4251-aff1-ebb2283e436c	Tanvi Joshi	tanvi@pesu.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	PES University	Design & Interaction	STUDENT	2026-09-29 22:53:17.305068+05:30	t
cce49998-ae75-411e-91d8-c3c360ab1298	Aditya Swamy	aditya@rvce.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	RVCE	Computer Science	STUDENT	2026-09-29 22:53:17.305068+05:30	t
a7ac217d-ab10-44b0-8fc6-19e004b7df40	Meera Iyer	meera@bmsce.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	BMSCE	Biotechnology & Data	STUDENT	2026-09-29 22:53:17.305068+05:30	t
d985957d-e8c0-4f82-a459-6570e78a8fb5	Nikhil Rathi	nikhil@pesu.edu	$2b$10$b8Sym21lp7kXkoIBtvW/5OaWUVNXTt8C72UnwXc/31Gc9a6k7Swe2	PES University	Mechanical & Robotics	STUDENT	2026-09-29 22:53:17.305068+05:30	t
2343168b-7b68-4582-b84a-748fe2c18dd0	Vikram Aditya	demo.student.a.1790745507181@pesu.edu	$2b$10$/Th/iDsI/InWFrVLcbUDAesVWRuX.JjSN.uLtHyA1RI1alKO6SyWG	PES University	Computer Science & Engineering	STUDENT	2026-09-30 10:48:27.362715+05:30	t
3073a443-b87f-412f-93e6-7016c53f5365	Sneha Kulkarni	demo.student.b.1790745507181@pesu.edu	$2b$10$xFgBhwhtY5ks6a.Ihc2J1.YswiNECpb7ba/p/YiVg/DBPffCixHdy	RVCE	Information Science	STUDENT	2026-09-30 10:48:27.604952+05:30	t
\.


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (application_id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: assignments assignments_task_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_task_id_key UNIQUE (task_id);


--
-- Name: categories categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_category_name_key UNIQUE (category_name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: content_embeddings content_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_pkey PRIMARY KEY (embedding_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (review_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (skill_id);


--
-- Name: skills skills_skill_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_skill_name_key UNIQUE (skill_name);


--
-- Name: student_skills student_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_pkey PRIMARY KEY (student_skill_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (task_id);


--
-- Name: content_embeddings uq_entity_embedding; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT uq_entity_embedding UNIQUE (entity_type, entity_id);


--
-- Name: reviews uq_task_reviewer; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_task_reviewer UNIQUE (task_id, reviewer_id);


--
-- Name: applications uq_task_student_application; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT uq_task_student_application UNIQUE (task_id, student_id);


--
-- Name: student_skills uq_user_skill; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_applications_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_student_id ON public.applications USING btree (student_id);


--
-- Name: idx_applications_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_task_id ON public.applications USING btree (task_id);


--
-- Name: idx_applications_task_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_task_status ON public.applications USING btree (task_id, status);


--
-- Name: idx_assignments_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_student_id ON public.assignments USING btree (student_id);


--
-- Name: idx_content_embeddings_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_embeddings_lookup ON public.content_embeddings USING btree (entity_type, entity_id);


--
-- Name: idx_payments_payer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_payer_id ON public.payments USING btree (payer_id);


--
-- Name: idx_payments_receiver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_receiver_id ON public.payments USING btree (receiver_id);


--
-- Name: idx_payments_receiver_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_receiver_status ON public.payments USING btree (receiver_id, payment_status);


--
-- Name: idx_payments_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_task_id ON public.payments USING btree (task_id);


--
-- Name: idx_reviews_reviewed_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_reviewed_user_id ON public.reviews USING btree (reviewed_user_id);


--
-- Name: idx_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_reviewer_id ON public.reviews USING btree (reviewer_id);


--
-- Name: idx_reviews_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_task_id ON public.reviews USING btree (task_id);


--
-- Name: idx_student_skills_skill_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_skills_skill_id ON public.student_skills USING btree (skill_id);


--
-- Name: idx_student_skills_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_skills_user_id ON public.student_skills USING btree (user_id);


--
-- Name: idx_tasks_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_category_id ON public.tasks USING btree (category_id);


--
-- Name: idx_tasks_category_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_category_status ON public.tasks USING btree (category_id, status);


--
-- Name: idx_tasks_fts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_fts ON public.tasks USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || description)));


--
-- Name: idx_tasks_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_owner_id ON public.tasks USING btree (owner_id);


--
-- Name: idx_tasks_status_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status_deadline ON public.tasks USING btree (status, deadline);


--
-- Name: applications trg_prevent_self_application; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_self_application BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.trg_fn_prevent_self_application();


--
-- Name: tasks trg_update_task_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_task_timestamp BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.trg_fn_update_task_timestamp();


--
-- Name: applications trg_validate_task_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_task_status BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.trg_fn_validate_task_status_for_application();


--
-- Name: applications applications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: applications applications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- Name: assignments assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- Name: assignments assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE RESTRICT;


--
-- Name: payments payments_payer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- Name: payments payments_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- Name: payments payments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_reviewed_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewed_user_id_fkey FOREIGN KEY (reviewed_user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE RESTRICT;


--
-- Name: student_skills student_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: tasks tasks_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE RESTRICT;


--
-- Name: tasks tasks_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict vsjUci2wg8WMMec3uMsUrpGcMAxrcHaNK2sK8McugATEgovoxx69n4XQDcpf5fO



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.action_proposals (
    id integer NOT NULL,
    source character varying,
    campaign_id character varying,
    proposed_action json,
    rationale text,
    confidence double precision,
    estimated_impact character varying,
    guardrail_status character varying,
    guardrail_details text,
    status character varying,
    source_analytics_snapshot json,
    request_id character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE SEQUENCE public.action_proposals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.action_proposals_id_seq OWNED BY public.action_proposals.id;

CREATE TABLE public.activity_events (
    id character varying NOT NULL,
    campaign_id character varying,
    type character varying,
    payload_json text,
    request_id character varying,
    created_at timestamp without time zone
);

CREATE TABLE public.anomaly_events (
    id integer NOT NULL,
    campaign_id character varying,
    metric character varying,
    severity character varying,
    stats_details json,
    llm_root_cause text,
    guardrail_status character varying,
    action_taken character varying,
    proposal_id integer,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.anomaly_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.anomaly_events_id_seq OWNED BY public.anomaly_events.id;

CREATE TABLE public.audit_log (
    id character varying NOT NULL,
    actor character varying,
    platform character varying,
    action_type character varying,
    campaign_id character varying,
    before_state text,
    after_state text,
    request_id character varying,
    created_at timestamp without time zone
);

CREATE TABLE public.campaigns (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    objective text,
    audience text,
    status character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    dev_token character varying,
    dev_token_created_at timestamp without time zone
);

CREATE TABLE public.click_events (
    id integer NOT NULL,
    campaign_id character varying,
    event_name character varying,
    session_id character varying,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.click_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.click_events_id_seq OWNED BY public.click_events.id;

CREATE TABLE public.delivery_events (
    id integer NOT NULL,
    campaign_id character varying,
    platform character varying,
    date date,
    impressions bigint,
    clicks bigint,
    conversions bigint,
    spend double precision,
    ctr double precision,
    cpa double precision,
    roas double precision,
    frequency double precision,
    viewability double precision,
    reach double precision
);

CREATE SEQUENCE public.delivery_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.delivery_events_id_seq OWNED BY public.delivery_events.id;

CREATE TABLE public.document_chunks (
    id integer NOT NULL,
    source_id integer,
    chunk_index integer,
    content text,
    embedding_id character varying,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.document_chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.document_chunks_id_seq OWNED BY public.document_chunks.id;

CREATE TABLE public.eval_runs (
    id integer NOT NULL,
    prompt_version character varying,
    scenario_id character varying,
    agent_output json,
    human_baseline json,
    relevance_score double precision,
    calibration_score double precision,
    details json,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.eval_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.eval_runs_id_seq OWNED BY public.eval_runs.id;

CREATE TABLE public.field_values (
    id integer NOT NULL,
    campaign_id character varying,
    field_key character varying,
    value character varying,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.field_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.field_values_id_seq OWNED BY public.field_values.id;

CREATE TABLE public.journeys (
    id character varying NOT NULL,
    campaign_id character varying NOT NULL,
    name character varying,
    graph_json text,
    status character varying,
    version integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE public.knowledge_sources (
    id integer NOT NULL,
    type character varying,
    title character varying,
    uri text,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.knowledge_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.knowledge_sources_id_seq OWNED BY public.knowledge_sources.id;

CREATE TABLE public.llm_usage_events (
    id integer NOT NULL,
    request_id character varying,
    campaign_id character varying,
    agent_type character varying,
    model character varying,
    prompt_tokens integer,
    completion_tokens integer,
    cost_usd double precision,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.llm_usage_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.llm_usage_events_id_seq OWNED BY public.llm_usage_events.id;

CREATE TABLE public.metric_definitions (
    key character varying NOT NULL,
    label character varying,
    definition text,
    unit character varying,
    formula character varying
);

CREATE TABLE public.mock_campaigns (
    id character varying NOT NULL,
    platform character varying,
    external_id character varying,
    name character varying,
    raw_json text,
    status character varying,
    daily_budget double precision,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE public.request_logs (
    id integer NOT NULL,
    request_id character varying,
    method character varying,
    path character varying,
    status integer,
    duration_ms integer,
    facts_json text,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.request_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.request_logs_id_seq OWNED BY public.request_logs.id;

CREATE TABLE public.run_activity_events (
    id integer NOT NULL,
    campaign_id character varying,
    session_id character varying,
    type character varying,
    payload_json json,
    request_id character varying,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.run_activity_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.run_activity_events_id_seq OWNED BY public.run_activity_events.id;

CREATE TABLE public.run_screen_executions (
    id integer NOT NULL,
    session_id character varying,
    screen_id character varying,
    block_ids text,
    handle character varying,
    status character varying,
    profile_json json,
    created_at timestamp without time zone
);

CREATE SEQUENCE public.run_screen_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.run_screen_executions_id_seq OWNED BY public.run_screen_executions.id;

CREATE TABLE public.run_sessions (
    id character varying NOT NULL,
    journey_id character varying,
    campaign_id character varying,
    mode character varying,
    graph_version integer,
    status character varying,
    request_id character varying,
    created_at timestamp without time zone,
    completed_at timestamp without time zone
);

ALTER TABLE ONLY public.action_proposals ALTER COLUMN id SET DEFAULT nextval('public.action_proposals_id_seq'::regclass);

ALTER TABLE ONLY public.anomaly_events ALTER COLUMN id SET DEFAULT nextval('public.anomaly_events_id_seq'::regclass);

ALTER TABLE ONLY public.click_events ALTER COLUMN id SET DEFAULT nextval('public.click_events_id_seq'::regclass);

ALTER TABLE ONLY public.delivery_events ALTER COLUMN id SET DEFAULT nextval('public.delivery_events_id_seq'::regclass);

ALTER TABLE ONLY public.document_chunks ALTER COLUMN id SET DEFAULT nextval('public.document_chunks_id_seq'::regclass);

ALTER TABLE ONLY public.eval_runs ALTER COLUMN id SET DEFAULT nextval('public.eval_runs_id_seq'::regclass);

ALTER TABLE ONLY public.field_values ALTER COLUMN id SET DEFAULT nextval('public.field_values_id_seq'::regclass);

ALTER TABLE ONLY public.knowledge_sources ALTER COLUMN id SET DEFAULT nextval('public.knowledge_sources_id_seq'::regclass);

ALTER TABLE ONLY public.llm_usage_events ALTER COLUMN id SET DEFAULT nextval('public.llm_usage_events_id_seq'::regclass);

ALTER TABLE ONLY public.request_logs ALTER COLUMN id SET DEFAULT nextval('public.request_logs_id_seq'::regclass);

ALTER TABLE ONLY public.run_activity_events ALTER COLUMN id SET DEFAULT nextval('public.run_activity_events_id_seq'::regclass);

ALTER TABLE ONLY public.run_screen_executions ALTER COLUMN id SET DEFAULT nextval('public.run_screen_executions_id_seq'::regclass);

INSERT INTO public.campaigns VALUES ('apple-iphone-16-pro', 'Apple — iPhone 16 Pro', 'iPhone 16 Pro — A18 Pro chip, 48MP Fusion camera with 5x Telephoto, and Apple Intelligence built in.', 'Drive qualified pre-orders and trade-ins for iPhone 16 Pro', 'iOS upgraders and camera-first smartphone shoppers', 'ACTIVE', '2026-10-10 05:19:13.297239', '2026-10-10 05:19:13.297245', NULL, '92add6c8-7209-4ec3-872e-f5be405b17b9', '2026-10-10 05:19:13.297275');
INSERT INTO public.campaigns VALUES ('nike-air-zoom-pegasus-41', 'Nike — Air Zoom Pegasus 41', 'Nike Air Zoom Pegasus 41 — ReactX foam midsole, dual Air Zoom units, and an engineered mesh upper for daily miles.', 'Grow direct-to-consumer sales of the Pegasus 41', 'Daily-trainer runners and everyday-mile sneaker shoppers', 'ACTIVE', '2026-10-10 05:19:13.297278', '2026-10-10 05:19:13.29728', NULL, '09b78173-99cd-4292-afc0-81bafc7c8883', '2026-10-10 05:19:13.297292');
INSERT INTO public.campaigns VALUES ('tesla-model-y-2026', 'Tesla — Model Y (2026)', '2026 Tesla Model Y — the Juniper-refreshed lineup, from Standard RWD to Performance AWD and the six-seat Model Y L.', 'Generate configurator sessions and reservations for the 2026 Model Y', 'EV shoppers comparing range, price, and trims', 'ACTIVE', '2026-10-10 05:19:13.297295', '2026-10-10 05:19:13.297296', NULL, 'fd6a9eb7-e97d-4ab8-83c5-f5673e1c50c0', '2026-10-10 05:19:13.297304');

INSERT INTO public.delivery_events VALUES (1, 'apple-iphone-16-pro', 'meta', '2026-07-12', 10060, 191, 21, 433.1349792119324, 1.9, 20.625475200568207, 5.550591595082925, 1.9321100703464076, 68.73053147808483, 5207);
INSERT INTO public.delivery_events VALUES (2, 'apple-iphone-16-pro', 'google', '2026-07-13', 8397, 160, 18, 373.5085847100001, 1.9, 20.750476928333338, 4.903403914399055, 2.056191927252653, 68.74439610616606, 4084);
INSERT INTO public.delivery_events VALUES (3, 'apple-iphone-16-pro', 'meta', '2026-07-14', 9461, 180, 20, 443.09293986210264, 1.9, 22.154646993105132, 5.0410380748822945, 2.0118598823273643, 74.02724318988851, 4703);
INSERT INTO public.delivery_events VALUES (4, 'apple-iphone-16-pro', 'google', '2026-07-15', 9416, 179, 20, 452.63854289648185, 1.9, 22.631927144824093, 5.448260804838901, 2.067838203612862, 72.39572593622728, 4554);
INSERT INTO public.delivery_events VALUES (5, 'apple-iphone-16-pro', 'meta', '2026-07-16', 9224, 175, 19, 369.4052203393915, 1.9, 19.44238001786271, 4.731149708060467, 1.8556718529190572, 72.43690904081272, 4971);
INSERT INTO public.delivery_events VALUES (6, 'apple-iphone-16-pro', 'google', '2026-07-17', 11501, 219, 24, 494.1296035013858, 1.9, 20.58873347922441, 5.644174883241151, 1.90504735801106, 68.33305310995529, 6037);
INSERT INTO public.delivery_events VALUES (7, 'apple-iphone-16-pro', 'meta', '2026-07-18', 8087, 154, 17, 344.35559506225667, 1.9, 20.256211474250392, 5.4252778707671725, 1.8708451083459638, 77.70385135472038, 4323);
INSERT INTO public.delivery_events VALUES (8, 'apple-iphone-16-pro', 'google', '2026-07-19', 11413, 217, 24, 483.3957516682357, 1.9, 20.141489652843152, 5.2772022077524445, 1.9096676991236523, 73.82393294254013, 5976);
INSERT INTO public.delivery_events VALUES (9, 'apple-iphone-16-pro', 'meta', '2026-07-20', 9907, 188, 21, 388.44996947989137, 1.9, 18.49761759428054, 5.3484061218421415, 1.9909376929003608, 71.03020272174226, 4976);
INSERT INTO public.delivery_events VALUES (10, 'apple-iphone-16-pro', 'google', '2026-07-21', 11003, 209, 23, 505.1327627059344, 1.9, 21.9622940306928, 5.3561920631596545, 1.882559675985269, 68.07714392490753, 5845);
INSERT INTO public.delivery_events VALUES (11, 'apple-iphone-16-pro', 'meta', '2026-07-22', 9924, 189, 21, 394.80385505992695, 1.9, 18.800183574282237, 5.381673772942287, 1.8051639074281027, 77.63777730733244, 5498);
INSERT INTO public.delivery_events VALUES (12, 'apple-iphone-16-pro', 'google', '2026-07-23', 10190, 194, 21, 481.61674969130365, 1.9, 22.934130937681125, 4.900590436977746, 1.9977163719960935, 68.6937042704968, 5101);
INSERT INTO public.delivery_events VALUES (13, 'apple-iphone-16-pro', 'meta', '2026-07-24', 9122, 173, 19, 360.4522916367599, 1.9, 18.971173244039996, 5.185214214471843, 2.0751359633081106, 71.44779101570717, 4396);
INSERT INTO public.delivery_events VALUES (14, 'apple-iphone-16-pro', 'google', '2026-07-25', 10338, 196, 22, 447.316793248605, 1.9, 20.332581511300226, 5.658991965314173, 1.9516807438180148, 74.40180921092248, 5297);
INSERT INTO public.delivery_events VALUES (15, 'apple-iphone-16-pro', 'meta', '2026-07-26', 8709, 165, 18, 392.9697321034711, 1.9, 21.83165178352617, 5.357366491905153, 1.9792754352057953, 77.42019201871283, 4400);
INSERT INTO public.delivery_events VALUES (16, 'apple-iphone-16-pro', 'google', '2026-07-27', 11490, 218, 24, 501.55833059995314, 1.9, 20.898263774998046, 4.8479062911283535, 1.9162203582115298, 74.0719497832888, 5996);
INSERT INTO public.delivery_events VALUES (17, 'apple-iphone-16-pro', 'meta', '2026-07-28', 8545, 162, 18, 390.9366227251958, 1.9, 21.718701262510876, 5.168113038147956, 1.9187978434753243, 77.04945876424581, 4453);
INSERT INTO public.delivery_events VALUES (18, 'apple-iphone-16-pro', 'google', '2026-07-29', 10549, 200, 22, 463.9538872189826, 1.9, 21.0888130554083, 4.844104407359513, 1.9550222520936082, 71.49752850519711, 5396);
INSERT INTO public.delivery_events VALUES (19, 'apple-iphone-16-pro', 'meta', '2026-07-30', 8922, 170, 19, 355.52847763263014, 1.9, 18.712025138559483, 5.013620797838645, 2.054222051922106, 69.8846998507065, 4343);
INSERT INTO public.delivery_events VALUES (20, 'apple-iphone-16-pro', 'google', '2026-07-31', 8946, 170, 19, 430.4734329016438, 1.9, 22.656496468507566, 4.932608964552453, 1.8237896890413616, 77.04722294131328, 4905);
INSERT INTO public.delivery_events VALUES (21, 'apple-iphone-16-pro', 'meta', '2026-08-01', 11656, 221, 24, 448.00433792254, 1.9, 18.666847413439168, 4.850988830122034, 2.0283261970925026, 73.78936671498133, 5747);
INSERT INTO public.delivery_events VALUES (22, 'apple-iphone-16-pro', 'google', '2026-08-02', 8792, 167, 18, 407.34426492666927, 1.9, 22.630236940370516, 5.3551238426832946, 1.8057849072738623, 75.52382181500354, 4869);
INSERT INTO public.delivery_events VALUES (23, 'apple-iphone-16-pro', 'meta', '2026-08-03', 8752, 166, 18, 328.2267068307989, 1.9, 18.234817046155495, 4.792030805362334, 1.9830956697731326, 74.48228533103047, 4413);
INSERT INTO public.delivery_events VALUES (24, 'apple-iphone-16-pro', 'google', '2026-08-04', 10728, 204, 22, 490.72822097029126, 1.9, 22.30582822592233, 5.46388945514939, 1.8804010437167302, 75.37626558746459, 5705);
INSERT INTO public.delivery_events VALUES (25, 'apple-iphone-16-pro', 'meta', '2026-08-05', 9387, 178, 20, 418.9383873209231, 1.9, 20.946919366046153, 5.035810309231644, 2.023880609681879, 76.02391506302556, 4638);
INSERT INTO public.delivery_events VALUES (26, 'apple-iphone-16-pro', 'google', '2026-08-06', 9800, 186, 20, 424.61304106857915, 1.9, 21.23065205342896, 5.307548222241645, 1.8070425353136594, 74.0053462265893, 5423);
INSERT INTO public.delivery_events VALUES (27, 'apple-iphone-16-pro', 'meta', '2026-08-07', 11058, 210, 23, 521.96645952426, 1.9, 22.69419389235913, 4.983423446070707, 1.9948733044206195, 74.11435168564662, 5543);
INSERT INTO public.delivery_events VALUES (28, 'apple-iphone-16-pro', 'google', '2026-08-08', 11879, 226, 25, 567.2651241280261, 1.9, 22.690604965121043, 5.24994662312005, 1.86960391230016, 77.91855172583087, 6354);
INSERT INTO public.delivery_events VALUES (29, 'apple-iphone-16-pro', 'meta', '2026-08-09', 9845, 187, 21, 456.93798934184474, 1.9, 21.75895187342118, 4.85980246431904, 1.8080503692997596, 75.99902601773795, 5445);
INSERT INTO public.delivery_events VALUES (30, 'apple-iphone-16-pro', 'google', '2026-08-10', 8338, 158, 17, 381.6153139363469, 1.9, 22.447959643314526, 4.919762551520308, 2.0304518816508357, 77.59867003571121, 4106);
INSERT INTO public.delivery_events VALUES (31, 'apple-iphone-16-pro', 'meta', '2026-08-11', 10553, 201, 22, 408.3975388416934, 1.9, 18.563524492804245, 5.188518811514306, 1.98902805834131, 71.89502678532693, 5306);
INSERT INTO public.delivery_events VALUES (32, 'apple-iphone-16-pro', 'google', '2026-08-12', 9485, 180, 20, 366.10581503192384, 1.9, 18.305290751596193, 5.021334696745138, 2.0904794043946087, 74.44451340044758, 4537);
INSERT INTO public.delivery_events VALUES (33, 'apple-iphone-16-pro', 'meta', '2026-08-13', 10648, 202, 22, 447.59642860121284, 1.9, 20.345292209146038, 5.192863099922249, 1.9883100857922482, 71.61255209570328, 5355);
INSERT INTO public.delivery_events VALUES (34, 'apple-iphone-16-pro', 'google', '2026-08-14', 8489, 161, 18, 369.2822485798672, 1.9, 20.515680476659288, 5.4851097867906775, 1.8342507902764253, 76.55478306838165, 4628);
INSERT INTO public.delivery_events VALUES (35, 'apple-iphone-16-pro', 'meta', '2026-08-15', 10014, 190, 21, 405.12744628894137, 1.9, 19.291783156616255, 5.612685920325335, 1.881697331111484, 77.90475034951606, 5322);
INSERT INTO public.delivery_events VALUES (36, 'apple-iphone-16-pro', 'google', '2026-08-16', 10844, 206, 23, 497.2385555306099, 1.9, 21.61906763176565, 4.994754859897382, 2.0455821980121986, 70.70893767690393, 5301);
INSERT INTO public.delivery_events VALUES (37, 'apple-iphone-16-pro', 'meta', '2026-08-17', 9867, 187, 21, 442.4081428696159, 1.9, 21.067054422362663, 4.801256575509689, 1.9057200667761671, 76.73630739561406, 5178);
INSERT INTO public.delivery_events VALUES (38, 'apple-iphone-16-pro', 'google', '2026-08-18', 11063, 210, 23, 502.1617323519107, 1.9, 21.83311879790916, 5.266864339623014, 1.855840151449532, 77.59122054046024, 5961);
INSERT INTO public.delivery_events VALUES (39, 'apple-iphone-16-pro', 'meta', '2026-08-19', 11191, 213, 23, 428.70001798813524, 1.9, 18.639131216875445, 4.797733940783444, 1.9371461488057817, 69.9168726068907, 5777);
INSERT INTO public.delivery_events VALUES (40, 'apple-iphone-16-pro', 'google', '2026-08-20', 10535, 200, 22, 437.32170310719334, 1.9, 19.87825923214515, 4.745887889317823, 1.9803956460438021, 73.98887556394727, 5320);
INSERT INTO public.delivery_events VALUES (41, 'apple-iphone-16-pro', 'meta', '2026-08-21', 10740, 204, 22, 497.35387176770377, 1.9, 22.606994171259263, 4.777640332910295, 1.8366272414823774, 77.41070050166938, 5848);
INSERT INTO public.delivery_events VALUES (42, 'apple-iphone-16-pro', 'google', '2026-08-22', 9777, 186, 20, 434.373393628344, 1.9, 21.7186696814172, 5.209120482863969, 2.0018060458912235, 73.08064610441015, 4884);
INSERT INTO public.delivery_events VALUES (43, 'apple-iphone-16-pro', 'meta', '2026-08-23', 9930, 189, 21, 463.65704764553595, 1.9, 22.078907030739806, 5.091962872639925, 1.9814578911885299, 68.05621224024051, 5011);
INSERT INTO public.delivery_events VALUES (44, 'apple-iphone-16-pro', 'google', '2026-08-24', 9388, 178, 20, 454.4094264139891, 1.9, 22.720471320699453, 5.217451519843247, 1.937678190624911, 75.99232768844453, 4845);
INSERT INTO public.delivery_events VALUES (45, 'apple-iphone-16-pro', 'meta', '2026-08-25', 10968, 208, 23, 495.3784050567588, 1.9, 21.538191524206905, 5.316765576359358, 2.0218009771696193, 76.48871803727384, 5425);
INSERT INTO public.delivery_events VALUES (46, 'apple-iphone-16-pro', 'google', '2026-08-26', 8026, 152, 17, 321.6730112161666, 1.9, 18.921941836245097, 5.130350038254574, 1.8765669750008775, 71.50609381818163, 4277);
INSERT INTO public.delivery_events VALUES (47, 'apple-iphone-16-pro', 'meta', '2026-08-27', 11691, 222, 24, 432.8242648124873, 1.9, 18.03434436718697, 5.6433459365953995, 2.0797407119326228, 68.29053123541028, 5621);
INSERT INTO public.delivery_events VALUES (48, 'apple-iphone-16-pro', 'google', '2026-08-28', 9026, 171, 19, 342.2339542500356, 1.9, 18.01231338158082, 4.718872407477834, 2.0340482179850143, 76.44506693307572, 4437);
INSERT INTO public.delivery_events VALUES (49, 'apple-iphone-16-pro', 'meta', '2026-08-29', 8742, 166, 18, 394.4763991465544, 1.9, 21.91535550814191, 5.342244268381839, 1.9954647449226335, 76.89519755656546, 4381);
INSERT INTO public.delivery_events VALUES (50, 'apple-iphone-16-pro', 'google', '2026-08-30', 8112, 154, 17, 306.6200294130859, 1.9, 18.036472318416816, 4.861932987410074, 2.0846624824397164, 74.01731047454824, 3891);
INSERT INTO public.delivery_events VALUES (51, 'apple-iphone-16-pro', 'meta', '2026-08-31', 11215, 213, 23, 442.75694498500593, 1.9, 19.250301955869823, 5.045724321413826, 1.9749467329382737, 70.54628380457635, 5679);
INSERT INTO public.delivery_events VALUES (52, 'apple-iphone-16-pro', 'google', '2026-09-01', 10862, 206, 23, 485.3161087122329, 1.9, 21.100700378792734, 5.075867475200955, 1.959389489796481, 75.16225183277811, 5544);
INSERT INTO public.delivery_events VALUES (53, 'apple-iphone-16-pro', 'meta', '2026-09-02', 9747, 185, 20, 437.0263231929681, 1.9, 21.851316159648405, 5.013122157141619, 1.9299082367100426, 68.65798995301341, 5050);
INSERT INTO public.delivery_events VALUES (54, 'apple-iphone-16-pro', 'google', '2026-09-03', 10866, 206, 23, 504.80591122113333, 1.9, 21.948083096571015, 5.642343355233465, 1.9617597041843078, 77.85529010688921, 5539);
INSERT INTO public.delivery_events VALUES (55, 'apple-iphone-16-pro', 'meta', '2026-09-04', 9630, 183, 20, 410.43336557280435, 1.9, 20.521668278640217, 4.723534105164046, 1.8158576963095965, 76.41660625612806, 5303);
INSERT INTO public.delivery_events VALUES (56, 'apple-iphone-16-pro', 'google', '2026-09-05', 10433, 198, 22, 500.2549498377749, 1.9, 22.738861356262497, 5.109538091049232, 1.8979857558110838, 77.61155359921007, 5497);
INSERT INTO public.delivery_events VALUES (57, 'apple-iphone-16-pro', 'meta', '2026-09-06', 11213, 213, 23, 508.73647168884736, 1.9, 22.118977029949885, 5.187305791169298, 1.8515074588464933, 77.84977796689407, 6056);
INSERT INTO public.delivery_events VALUES (58, 'apple-iphone-16-pro', 'google', '2026-09-07', 10290, 196, 22, 483.765538835133, 1.9, 21.989342674324227, 4.815190353389335, 1.9936853506984622, 77.95274642034873, 5161);
INSERT INTO public.delivery_events VALUES (59, 'apple-iphone-16-pro', 'meta', '2026-09-08', 10904, 207, 23, 460.58936568912736, 1.9, 20.02562459517945, 5.562063227032173, 1.9213134118018949, 73.11313670188424, 5675);
INSERT INTO public.delivery_events VALUES (60, 'apple-iphone-16-pro', 'google', '2026-09-09', 9298, 177, 19, 373.56258510422975, 1.9, 19.661188689696303, 4.909642605229164, 1.856601451618998, 72.76733055332102, 5008);
INSERT INTO public.delivery_events VALUES (61, 'apple-iphone-16-pro', 'meta', '2026-09-10', 8195, 156, 17, 325.0241150087955, 1.9, 19.119065588752676, 5.50878709602172, 1.9661229586593325, 77.57397792617272, 4168);
INSERT INTO public.delivery_events VALUES (62, 'apple-iphone-16-pro', 'google', '2026-09-11', 11405, 217, 24, 446.848050381515, 1.9, 18.61866876589646, 5.05840753792151, 1.9438620926492385, 68.73902496716467, 5867);
INSERT INTO public.delivery_events VALUES (63, 'apple-iphone-16-pro', 'meta', '2026-09-12', 10353, 197, 22, 505.4025460183148, 1.9, 22.97284300083249, 5.0789471001817565, 1.9889140948908959, 76.05176140987112, 5205);
INSERT INTO public.delivery_events VALUES (64, 'apple-iphone-16-pro', 'google', '2026-09-13', 8646, 164, 18, 377.36869909330557, 1.9, 20.964927727405865, 4.8589678739840165, 1.8474822576038776, 74.49305775007767, 4680);
INSERT INTO public.delivery_events VALUES (65, 'apple-iphone-16-pro', 'meta', '2026-09-14', 8893, 169, 19, 356.5866121981698, 1.9, 18.767716431482622, 5.55542476946654, 1.9020240538738387, 68.33815669931745, 4676);
INSERT INTO public.delivery_events VALUES (66, 'apple-iphone-16-pro', 'google', '2026-09-15', 9045, 172, 19, 407.4912365504997, 1.9, 21.446907186868405, 5.188051822369065, 2.0415389682028167, 70.0690443590939, 4430);
INSERT INTO public.delivery_events VALUES (67, 'apple-iphone-16-pro', 'meta', '2026-09-16', 8205, 156, 17, 334.5823022576047, 1.9, 19.68131189750616, 5.008310205797898, 1.9000847968938082, 71.94370336263275, 4318);
INSERT INTO public.delivery_events VALUES (68, 'apple-iphone-16-pro', 'google', '2026-09-17', 10011, 190, 21, 379.63296166033734, 1.9, 18.077760079063683, 5.5131883619100845, 1.8268552571058991, 77.7899195003681, 5480);
INSERT INTO public.delivery_events VALUES (69, 'apple-iphone-16-pro', 'meta', '2026-09-18', 9724, 185, 20, 389.8988454876552, 1.9, 19.49494227438276, 5.480765881989777, 1.802021137742346, 76.17066887711542, 5396);
INSERT INTO public.delivery_events VALUES (70, 'apple-iphone-16-pro', 'google', '2026-09-19', 11412, 217, 24, 442.15760032720107, 1.9, 18.42323334696671, 5.6495867177761605, 1.9607161454257036, 73.89730919079963, 5820);
INSERT INTO public.delivery_events VALUES (71, 'apple-iphone-16-pro', 'meta', '2026-09-20', 9196, 175, 19, 426.7894123054561, 1.9, 22.462600647655584, 5.3945961056715035, 1.8847475354598358, 71.13225535387795, 4879);
INSERT INTO public.delivery_events VALUES (72, 'apple-iphone-16-pro', 'google', '2026-09-21', 11122, 211, 23, 448.6653825111123, 1.9, 19.507190543961404, 5.478566446903003, 2.0788899738537117, 77.40352329447754, 5350);
INSERT INTO public.delivery_events VALUES (73, 'apple-iphone-16-pro', 'meta', '2026-09-22', 10922, 208, 23, 504.59759763885825, 1.9, 21.939025984298183, 5.041834245367482, 1.83787087748151, 73.62085173467057, 5943);
INSERT INTO public.delivery_events VALUES (74, 'apple-iphone-16-pro', 'google', '2026-09-23', 9977, 190, 21, 385.3394641011609, 1.9, 18.34949829053147, 5.3892700539247, 2.007017653369874, 68.09452155221219, 4971);
INSERT INTO public.delivery_events VALUES (75, 'apple-iphone-16-pro', 'meta', '2026-09-24', 11537, 219, 24, 546.2659184628284, 1.9, 22.761079935951184, 5.2528642039155455, 1.8255022917679706, 68.36244390276123, 6320);
INSERT INTO public.delivery_events VALUES (76, 'apple-iphone-16-pro', 'google', '2026-09-25', 10610, 202, 22, 466.6727949024463, 1.9, 21.212399768293015, 5.294035860592376, 1.9599690739768953, 77.82986171018806, 5413);
INSERT INTO public.delivery_events VALUES (77, 'apple-iphone-16-pro', 'meta', '2026-09-26', 9908, 188, 21, 405.6704682113622, 1.9, 19.3176413433982, 5.111468957356135, 1.8785685161702437, 77.18092010507068, 5274);
INSERT INTO public.delivery_events VALUES (78, 'apple-iphone-16-pro', 'google', '2026-09-27', 9706, 184, 20, 381.9218667600632, 1.9, 19.09609333800316, 5.313415841361263, 2.0884897811090526, 69.52509415199734, 4647);
INSERT INTO public.delivery_events VALUES (79, 'apple-iphone-16-pro', 'meta', '2026-09-28', 11056, 210, 23, 442.64743089417345, 1.9, 19.245540473659716, 5.544369938102551, 2.0820837195930113, 72.56257014593024, 5310);
INSERT INTO public.delivery_events VALUES (80, 'apple-iphone-16-pro', 'google', '2026-09-29', 8480, 161, 18, 388.94277349875824, 1.9, 21.607931861042125, 4.877799428160735, 1.905601674897882, 71.45412361418117, 4450);
INSERT INTO public.delivery_events VALUES (81, 'apple-iphone-16-pro', 'meta', '2026-09-30', 10969, 208, 23, 522.4063141027239, 1.9, 22.713318004466256, 4.716031436952142, 1.8512976150537415, 77.8014910118533, 5925);
INSERT INTO public.delivery_events VALUES (82, 'apple-iphone-16-pro', 'google', '2026-10-01', 11632, 221, 24, 433.6920340508716, 1.9, 18.070501418786318, 5.499603419158762, 2.024753139671212, 77.64076757752602, 5745);
INSERT INTO public.delivery_events VALUES (83, 'apple-iphone-16-pro', 'meta', '2026-10-02', 8128, 154, 17, 369.7492729992986, 1.9, 21.74995723525286, 5.692976640713749, 2.0338015617118375, 75.90572417855562, 3996);
INSERT INTO public.delivery_events VALUES (84, 'apple-iphone-16-pro', 'google', '2026-10-03', 8060, 153, 17, 321.24122739099914, 1.9, 18.896542787705833, 5.471835794240672, 1.9884966640299329, 68.83725438418996, 4053);
INSERT INTO public.delivery_events VALUES (85, 'apple-iphone-16-pro', 'meta', '2026-10-04', 9093, 173, 19, 347.22029142344377, 1.9, 18.274752180181252, 4.822821626655312, 1.8169812285485436, 77.35389438926299, 5004);
INSERT INTO public.delivery_events VALUES (86, 'apple-iphone-16-pro', 'google', '2026-10-05', 11452, 218, 24, 491.37688299750664, 1.9, 20.474036791562778, 4.90482275245024, 2.0185576696975933, 75.57788620069464, 5673);
INSERT INTO public.delivery_events VALUES (87, 'apple-iphone-16-pro', 'meta', '2026-10-06', 11164, 212, 23, 441.62209733475515, 1.9, 19.200960753685006, 5.566560417063763, 1.9539015571177185, 76.78371076630177, 5714);
INSERT INTO public.delivery_events VALUES (88, 'apple-iphone-16-pro', 'google', '2026-10-07', 11267, 214, 24, 475.90871019116014, 1.9, 19.82952959129834, 5.537168092486271, 1.9689133241524515, 72.767976677384, 5722);
INSERT INTO public.delivery_events VALUES (89, 'apple-iphone-16-pro', 'meta', '2026-10-08', 10602, 201, 22, 396.9633226148613, 1.9, 18.043787391584605, 5.668597362298629, 1.8524372924985102, 76.55374906852201, 5723);
INSERT INTO public.delivery_events VALUES (90, 'apple-iphone-16-pro', 'google', '2026-10-09', 11383, 216, 24, 538.1483720229237, 1.9, 22.422848834288487, 5.163610676870789, 2.0837713734676284, 73.34591787579473, 5463);
INSERT INTO public.delivery_events VALUES (91, 'apple-iphone-16-pro', 'meta', '2026-10-10', 8313, 158, 17, 346.77534685671344, 1.9, 20.39854981510079, 4.841784287569162, 1.9177647144991667, 73.85337693693337, 4335);
INSERT INTO public.delivery_events VALUES (92, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-12', 8636, 130, 14, 273.72240953620457, 1.5, 19.55160068115747, 4.475070141016428, 2.016810959553949, 77.3232592061379, 4282);
INSERT INTO public.delivery_events VALUES (93, 'nike-air-zoom-pegasus-41', 'google', '2026-07-13', 9019, 135, 15, 324.0830399840829, 1.5, 21.605535998938862, 3.754188858993829, 2.0595123332803342, 75.23386085513162, 4379);
INSERT INTO public.delivery_events VALUES (94, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-14', 9318, 140, 15, 284.35515167244455, 1.5, 18.957010111496302, 4.336361920943205, 2.0168744489601127, 68.37515112261617, 4620);
INSERT INTO public.delivery_events VALUES (95, 'nike-air-zoom-pegasus-41', 'google', '2026-07-15', 9536, 143, 16, 320.485338565136, 1.5, 20.030333660321, 4.188219923765027, 2.085444298302017, 72.55163641197326, 4573);
INSERT INTO public.delivery_events VALUES (96, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-16', 9560, 143, 16, 341.434312687019, 1.5, 21.339644542938686, 4.368293797840404, 2.0629655791269066, 75.98371551266442, 4634);
INSERT INTO public.delivery_events VALUES (97, 'nike-air-zoom-pegasus-41', 'google', '2026-07-17', 9568, 144, 16, 320.66258492384236, 1.5, 20.041411557740147, 4.147288848454132, 1.8287915510738733, 76.97253530967599, 5232);
INSERT INTO public.delivery_events VALUES (98, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-18', 9176, 138, 15, 320.04175928387644, 1.5, 21.33611728559176, 3.829719645113501, 1.864892438007507, 73.92254111172066, 4920);
INSERT INTO public.delivery_events VALUES (99, 'nike-air-zoom-pegasus-41', 'google', '2026-07-19', 11418, 171, 19, 408.77247316735225, 1.5, 21.51434069301854, 4.178122149315793, 1.873612681200686, 73.55712033909695, 6094);
INSERT INTO public.delivery_events VALUES (100, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-20', 11355, 170, 19, 346.225276906445, 1.5, 18.222382995076053, 4.105028945667075, 1.9956590821092384, 75.14720067827983, 5690);
INSERT INTO public.delivery_events VALUES (101, 'nike-air-zoom-pegasus-41', 'google', '2026-07-21', 8097, 121, 13, 287.0431151528651, 1.5, 22.080239627143467, 4.407264613385527, 1.928083560426729, 75.40265967307694, 4200);
INSERT INTO public.delivery_events VALUES (102, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-22', 10513, 158, 17, 378.76958355807676, 1.5, 22.2805637387104, 3.5168502165728865, 1.9321126207511647, 70.49105040079661, 5441);
INSERT INTO public.delivery_events VALUES (103, 'nike-air-zoom-pegasus-41', 'google', '2026-07-23', 9962, 149, 16, 312.0467308731308, 1.5, 19.502920679570675, 3.9916930909610846, 1.8336009388994314, 70.31475479215327, 5433);
INSERT INTO public.delivery_events VALUES (104, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-24', 8262, 124, 14, 281.97997923858844, 1.5, 20.141427088470603, 3.778417452510069, 1.960884681472415, 76.79378251430317, 4213);
INSERT INTO public.delivery_events VALUES (105, 'nike-air-zoom-pegasus-41', 'google', '2026-07-25', 8329, 125, 14, 309.11047089781965, 1.5, 22.079319349844262, 4.07428190565383, 1.9189653013972245, 75.77125021407959, 4340);
INSERT INTO public.delivery_events VALUES (106, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-26', 8989, 135, 15, 287.0257140009754, 1.5, 19.13504760006503, 4.450741478662967, 1.991034205208964, 69.50272795800394, 4515);
INSERT INTO public.delivery_events VALUES (107, 'nike-air-zoom-pegasus-41', 'google', '2026-07-27', 9915, 149, 16, 359.37097626764034, 1.5, 22.46068601672752, 3.683545956571024, 1.9254546541338746, 69.86852816335006, 5149);
INSERT INTO public.delivery_events VALUES (108, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-28', 9568, 144, 16, 324.39027003057043, 1.5, 20.274391876910652, 4.219588750233424, 2.0347433050828285, 74.86471686697843, 4702);
INSERT INTO public.delivery_events VALUES (109, 'nike-air-zoom-pegasus-41', 'google', '2026-07-29', 11520, 173, 19, 433.1891933891174, 1.5, 22.799431231006178, 3.8131690532104, 1.8496130991990687, 72.21961834723083, 6228);
INSERT INTO public.delivery_events VALUES (110, 'nike-air-zoom-pegasus-41', 'meta', '2026-07-30', 10778, 162, 18, 340.65728650649197, 1.5, 18.92540480591622, 4.401920493418123, 2.0133238730792145, 70.73340074135876, 5353);
INSERT INTO public.delivery_events VALUES (111, 'nike-air-zoom-pegasus-41', 'google', '2026-07-31', 8907, 134, 15, 327.14985087055993, 1.5, 21.80999005803733, 3.886128813583958, 1.9406638259227738, 70.58661353414341, 4590);
INSERT INTO public.delivery_events VALUES (112, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-01', 11277, 169, 19, 420.60040339724117, 1.5, 22.136863336696905, 3.598925779411176, 1.895432394607973, 77.31360833839116, 5950);
INSERT INTO public.delivery_events VALUES (113, 'nike-air-zoom-pegasus-41', 'google', '2026-08-02', 11723, 176, 19, 412.0624793891338, 1.5, 21.687498915217567, 3.690392130912934, 1.8132487916499418, 70.2794053016317, 6465);
INSERT INTO public.delivery_events VALUES (114, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-03', 10135, 152, 17, 329.8439995572178, 1.5, 19.402588209248105, 3.966060947239762, 1.8319436806824192, 75.41451363702062, 5532);
INSERT INTO public.delivery_events VALUES (115, 'nike-air-zoom-pegasus-41', 'google', '2026-08-04', 9968, 150, 16, 312.8447809603157, 1.5, 19.55279881001973, 3.887045885261881, 2.024138153163557, 74.17406897080046, 4925);
INSERT INTO public.delivery_events VALUES (116, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-05', 11586, 174, 19, 403.35246668957814, 1.5, 21.229077194188324, 3.808581640824409, 1.9188056523045982, 74.75926108188432, 6038);
INSERT INTO public.delivery_events VALUES (117, 'nike-air-zoom-pegasus-41', 'google', '2026-08-06', 10342, 155, 17, 378.3140795200753, 1.5, 22.253769383533843, 4.01906843488147, 2.065996992873885, 69.04753562491919, 5006);
INSERT INTO public.delivery_events VALUES (118, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-07', 11652, 175, 19, 363.09520137053727, 1.5, 19.110273756344068, 3.570056322752554, 1.918020450445436, 71.86340247609145, 6075);
INSERT INTO public.delivery_events VALUES (119, 'nike-air-zoom-pegasus-41', 'google', '2026-08-08', 8179, 123, 14, 294.33357928634916, 1.5, 21.023827091882083, 4.2517293824077615, 1.9790225859809354, 77.7695690740482, 4133);
INSERT INTO public.delivery_events VALUES (120, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-09', 8380, 126, 14, 275.4335811331215, 1.5, 19.673827223794394, 3.7722130604930646, 1.8912643769381812, 73.82673819462788, 4431);
INSERT INTO public.delivery_events VALUES (121, 'nike-air-zoom-pegasus-41', 'google', '2026-08-10', 11689, 175, 19, 424.597029644876, 1.5, 22.34721208657242, 3.619071838348823, 2.080198550519506, 77.27917893332341, 5619);
INSERT INTO public.delivery_events VALUES (122, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-11', 9219, 138, 15, 305.1984388478727, 1.5, 20.34656258985818, 4.4679313047896665, 1.8680119250378364, 77.46610299801256, 4935);
INSERT INTO public.delivery_events VALUES (123, 'nike-air-zoom-pegasus-41', 'google', '2026-08-12', 8159, 122, 13, 248.48028847954848, 1.5, 19.113868344580652, 4.24622702425285, 2.0441482831603195, 74.46204594542485, 3991);
INSERT INTO public.delivery_events VALUES (124, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-13', 8211, 123, 14, 272.57793903799273, 1.5, 19.469852788428053, 4.354158001115005, 1.8404017183228358, 76.76793989966166, 4462);
INSERT INTO public.delivery_events VALUES (125, 'nike-air-zoom-pegasus-41', 'google', '2026-08-14', 10392, 156, 17, 334.04532464898773, 1.5, 19.649724979352218, 3.741980554521987, 1.822178519716988, 68.954303273919, 5703);
INSERT INTO public.delivery_events VALUES (126, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-15', 11669, 175, 19, 426.3146855324632, 1.5, 22.43761502802438, 4.441008881891804, 1.8973509614382982, 69.53551473869521, 6150);
INSERT INTO public.delivery_events VALUES (127, 'nike-air-zoom-pegasus-41', 'google', '2026-08-16', 11965, 179, 20, 377.38434349337876, 1.5, 18.86921717466894, 4.372870376447444, 1.8986200114040843, 71.71484819800989, 6302);
INSERT INTO public.delivery_events VALUES (128, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-17', 9543, 143, 16, 314.2972442447135, 1.5, 19.643577765294594, 3.8038694396806716, 2.0380736234633, 68.14382266989635, 4682);
INSERT INTO public.delivery_events VALUES (129, 'nike-air-zoom-pegasus-41', 'google', '2026-08-18', 10088, 151, 17, 377.0484845818008, 1.5, 22.17932262245887, 3.68310188362134, 1.8122663837830617, 68.00949261744586, 5567);
INSERT INTO public.delivery_events VALUES (130, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-19', 10426, 156, 17, 348.46322015907714, 1.5, 20.497836479945715, 3.802899308468303, 2.0426896793368554, 77.66647582614566, 5104);
INSERT INTO public.delivery_events VALUES (131, 'nike-air-zoom-pegasus-41', 'google', '2026-08-20', 8371, 126, 14, 318.27535189135097, 1.5, 22.733953706525067, 3.814608158407828, 2.0228200588613725, 73.35551897995447, 4138);
INSERT INTO public.delivery_events VALUES (132, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-21', 10668, 160, 18, 405.01244075386177, 1.5, 22.50069115299232, 4.398853121330988, 2.0312217077997934, 76.51050652092128, 5252);
INSERT INTO public.delivery_events VALUES (133, 'nike-air-zoom-pegasus-41', 'google', '2026-08-22', 11121, 167, 18, 374.6654377112426, 1.5, 20.81474653951348, 3.5141801420905727, 2.0648205010554275, 77.74043597958926, 5386);
INSERT INTO public.delivery_events VALUES (134, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-23', 10005, 150, 16, 365.36903692686906, 1.5, 22.835564807929316, 4.4432026728230385, 1.807855021413049, 75.68083006350767, 5534);
INSERT INTO public.delivery_events VALUES (135, 'nike-air-zoom-pegasus-41', 'google', '2026-08-24', 8863, 133, 15, 276.87976393987606, 1.5, 18.45865092932507, 3.6924457195513165, 1.9260346674691233, 75.29178373230387, 4602);
INSERT INTO public.delivery_events VALUES (136, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-25', 10933, 164, 18, 393.8103961457626, 1.5, 21.878355341431256, 4.202976208409196, 1.9211173847676084, 74.65910321710227, 5691);
INSERT INTO public.delivery_events VALUES (137, 'nike-air-zoom-pegasus-41', 'google', '2026-08-26', 10482, 157, 17, 326.21133760558973, 1.5, 19.188902212093513, 3.6554092973599213, 1.8746597577752826, 70.803928307544, 5591);
INSERT INTO public.delivery_events VALUES (138, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-27', 9927, 149, 16, 352.79792700001684, 1.5, 22.049870437501053, 3.5692936726268396, 1.8607035038909177, 76.4935466913477, 5335);
INSERT INTO public.delivery_events VALUES (139, 'nike-air-zoom-pegasus-41', 'google', '2026-08-28', 8306, 125, 14, 277.8706157687763, 1.5, 19.847901126341164, 4.1008200456323864, 1.9084083923526893, 69.7627758075713, 4352);
INSERT INTO public.delivery_events VALUES (140, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-29', 9497, 142, 16, 344.70221307884555, 1.5, 21.543888317427847, 3.603494872181, 2.0194371724571676, 73.74336095020612, 4703);
INSERT INTO public.delivery_events VALUES (141, 'nike-air-zoom-pegasus-41', 'google', '2026-08-30', 10851, 163, 18, 399.81161685757155, 1.5, 22.211756492087307, 3.5833571162712836, 1.8723682381117714, 68.59428846788902, 5795);
INSERT INTO public.delivery_events VALUES (142, 'nike-air-zoom-pegasus-41', 'meta', '2026-08-31', 10413, 156, 17, 337.16821295893135, 1.5, 19.833424291701846, 3.865486987075867, 1.9644016730842468, 70.40457109701376, 5301);
INSERT INTO public.delivery_events VALUES (143, 'nike-air-zoom-pegasus-41', 'google', '2026-09-01', 11095, 166, 18, 405.2686818228783, 1.5, 22.514926767937684, 4.42231113673092, 1.847417320233241, 68.62356969612942, 6006);
INSERT INTO public.delivery_events VALUES (144, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-02', 10207, 153, 17, 321.46902235846665, 1.5, 18.90994249167451, 3.8079551238101326, 2.031728135944523, 75.51498849524442, 5024);
INSERT INTO public.delivery_events VALUES (145, 'nike-air-zoom-pegasus-41', 'google', '2026-09-03', 8036, 121, 13, 264.95178123981714, 1.5, 20.380906249216704, 3.970844438237795, 2.0816792295178943, 69.45737180617787, 3860);
INSERT INTO public.delivery_events VALUES (146, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-04', 11233, 168, 18, 324.99733633180057, 1.5, 18.05540757398892, 4.422994843925058, 2.0828209756995126, 68.52653227475415, 5393);
INSERT INTO public.delivery_events VALUES (147, 'nike-air-zoom-pegasus-41', 'google', '2026-09-05', 9745, 146, 16, 295.8376883626028, 1.5, 18.489855522662676, 3.899067465846765, 1.8179160234898377, 68.43245201244237, 5361);
INSERT INTO public.delivery_events VALUES (148, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-06', 11273, 169, 19, 390.82665929108924, 1.5, 20.569824173215224, 4.078105569852566, 2.0746979021587473, 69.14733733852647, 5434);
INSERT INTO public.delivery_events VALUES (149, 'nike-air-zoom-pegasus-41', 'google', '2026-09-07', 11144, 167, 18, 396.27686833715524, 1.5, 22.0153815742864, 3.972674126539048, 1.834171996142485, 70.92536578103092, 6076);
INSERT INTO public.delivery_events VALUES (150, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-08', 11902, 179, 20, 378.41038901169884, 1.5, 18.92051945058494, 3.9342645762902957, 1.983555974845653, 73.67573768960719, 6000);
INSERT INTO public.delivery_events VALUES (151, 'nike-air-zoom-pegasus-41', 'google', '2026-09-09', 11792, 177, 19, 406.01769449723923, 1.5, 21.36935234195996, 4.0328332658517505, 2.033396721409424, 69.12860786646802, 5799);
INSERT INTO public.delivery_events VALUES (152, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-10', 10120, 152, 17, 340.7108027689887, 1.5, 20.04181192758757, 4.25222280315794, 1.8053383047567912, 75.52159654371874, 5606);
INSERT INTO public.delivery_events VALUES (153, 'nike-air-zoom-pegasus-41', 'google', '2026-09-11', 10172, 153, 17, 336.90742211770635, 1.5, 19.818083653982725, 3.738875365798241, 1.9702832985906606, 72.8979243311777, 5163);
INSERT INTO public.delivery_events VALUES (154, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-12', 11691, 175, 19, 353.23294576709065, 1.5, 18.59120767195214, 3.8894796095761754, 2.0219053144800907, 69.20377425372754, 5782);
INSERT INTO public.delivery_events VALUES (155, 'nike-air-zoom-pegasus-41', 'google', '2026-09-13', 10607, 159, 17, 349.47887086228604, 1.5, 20.557580638958, 3.685101974614997, 1.9686077993925626, 77.05781358082162, 5388);
INSERT INTO public.delivery_events VALUES (156, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-14', 9244, 139, 15, 330.4920893378042, 1.5, 22.032805955853615, 3.7834920269142702, 1.9269689528798846, 69.35356029275549, 4797);
INSERT INTO public.delivery_events VALUES (157, 'nike-air-zoom-pegasus-41', 'google', '2026-09-15', 10357, 155, 17, 330.01769646710045, 1.5, 19.41280567453532, 4.247298064855452, 1.931177854477386, 77.59556707606293, 5363);
INSERT INTO public.delivery_events VALUES (158, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-16', 11885, 178, 20, 370.55319944777693, 1.5, 18.527659972388847, 3.783959077058381, 1.989001012494846, 69.32477507402582, 5975);
INSERT INTO public.delivery_events VALUES (159, 'nike-air-zoom-pegasus-41', 'google', '2026-09-17', 8591, 129, 14, 275.38794596615713, 1.5, 19.670567569011222, 3.9542415980435552, 1.8733527034987518, 74.54367226017241, 4586);
INSERT INTO public.delivery_events VALUES (160, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-18', 10449, 157, 17, 360.8812768735448, 1.5, 21.228310404326162, 3.730230487357287, 2.0065500008288657, 76.56289489560498, 5207);
INSERT INTO public.delivery_events VALUES (161, 'nike-air-zoom-pegasus-41', 'google', '2026-09-19', 8068, 121, 13, 234.14801134982756, 1.5, 18.011385488448273, 3.5496593787441464, 1.829876742217104, 74.9897351889754, 4409);
INSERT INTO public.delivery_events VALUES (162, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-20', 11001, 165, 18, 324.5032620528108, 1.5, 18.027959002933933, 3.9940378601682465, 2.047576943693627, 73.55354048981712, 5373);
INSERT INTO public.delivery_events VALUES (163, 'nike-air-zoom-pegasus-41', 'google', '2026-09-21', 8206, 123, 14, 299.424021562397, 1.5, 21.387430111599787, 3.9352983520313267, 1.869576867210002, 68.9999401621597, 4389);
INSERT INTO public.delivery_events VALUES (164, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-22', 8657, 130, 14, 272.8320374768985, 1.5, 19.488002676921322, 4.406408824872119, 2.0367873025475225, 71.50174280720861, 4250);
INSERT INTO public.delivery_events VALUES (165, 'nike-air-zoom-pegasus-41', 'google', '2026-09-23', 11375, 171, 19, 433.7100182900309, 1.5, 22.826843067896363, 4.049571424526118, 1.9390685854151635, 69.12916506937331, 5866);
INSERT INTO public.delivery_events VALUES (166, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-24', 11513, 173, 19, 358.5155355155797, 1.5, 18.8692387113463, 4.026963137866129, 2.00343141851549, 72.32853795376353, 5747);
INSERT INTO public.delivery_events VALUES (167, 'nike-air-zoom-pegasus-41', 'google', '2026-09-25', 10813, 162, 18, 325.65307125539675, 1.5, 18.091837291966485, 3.85932229644506, 1.957337174862271, 77.86443080666598, 5524);
INSERT INTO public.delivery_events VALUES (168, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-26', 8927, 134, 15, 304.15775364348445, 1.5, 20.277183576232297, 4.06817907334067, 1.8495322261681937, 70.49800724609386, 4827);
INSERT INTO public.delivery_events VALUES (169, 'nike-air-zoom-pegasus-41', 'google', '2026-09-27', 11039, 252, 28, 613.4009840717381, 2.278571428571429, 21.907178002562073, 4.372942396969382, 1.8128528380410738, 70.87593692237539, 6089);
INSERT INTO public.delivery_events VALUES (170, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-28', 10204, 241, 27, 551.6561965790718, 2.357142857142857, 20.431710984410067, 4.034683289146969, 1.8155804241584994, 68.57991992729058, 5620);
INSERT INTO public.delivery_events VALUES (171, 'nike-air-zoom-pegasus-41', 'google', '2026-09-29', 12220, 298, 33, 729.6867753305667, 2.435714285714286, 22.111720464562627, 4.032337450561945, 2.0833819010854375, 74.54540494808607, 5865);
INSERT INTO public.delivery_events VALUES (172, 'nike-air-zoom-pegasus-41', 'meta', '2026-09-30', 10041, 252, 28, 615.0400530529082, 2.5142857142857142, 21.96571618046101, 3.6567505549265835, 1.8758262271590898, 71.13586702575716, 5353);
INSERT INTO public.delivery_events VALUES (173, 'nike-air-zoom-pegasus-41', 'google', '2026-10-01', 10690, 277, 30, 596.6330443612451, 2.592857142857143, 19.887768145374835, 3.807698287399428, 2.0724392317231586, 68.29409676169182, 5158);
INSERT INTO public.delivery_events VALUES (174, 'nike-air-zoom-pegasus-41', 'meta', '2026-10-02', 15332, 410, 45, 1006.4444204356795, 2.6714285714285717, 22.365431565237323, 4.25045861604422, 2.053055954126321, 77.70333028271493, 7468);
INSERT INTO public.delivery_events VALUES (175, 'nike-air-zoom-pegasus-41', 'google', '2026-10-03', 15647, 430, 47, 1022.350371761175, 2.75, 21.752135569386702, 4.409376716440366, 1.9866258548974818, 68.48491360147861, 7876);
INSERT INTO public.delivery_events VALUES (176, 'nike-air-zoom-pegasus-41', 'meta', '2026-10-04', 13002, 368, 40, 737.68670970923, 2.8285714285714287, 18.44216774273075, 3.5280325892223545, 2.0963922333273586, 77.93410209238148, 6202);
INSERT INTO public.delivery_events VALUES (177, 'nike-air-zoom-pegasus-41', 'google', '2026-10-05', 14313, 416, 46, 1045.216340837043, 2.9071428571428575, 22.722094366022674, 3.525323372428847, 1.9450791764211859, 77.88868713721702, 7359);
INSERT INTO public.delivery_events VALUES (178, 'nike-air-zoom-pegasus-41', 'meta', '2026-10-06', 16264, 486, 53, 1188.930596523899, 2.9857142857142858, 22.43265276460187, 4.368565624030947, 1.8750093084238981, 72.41105032480694, 8674);
INSERT INTO public.delivery_events VALUES (179, 'nike-air-zoom-pegasus-41', 'google', '2026-10-07', 18153, 556, 61, 1238.0234897127139, 3.0642857142857145, 20.29546704447072, 3.8355104411988434, 1.886468011126588, 71.43999059550724, 9623);
INSERT INTO public.delivery_events VALUES (180, 'nike-air-zoom-pegasus-41', 'meta', '2026-10-08', 19824, 623, 69, 1542.1941139838455, 3.1428571428571432, 22.35063933309921, 3.7790702267993126, 1.803341906288905, 77.65603294271469, 10993);
INSERT INTO public.delivery_events VALUES (181, 'nike-air-zoom-pegasus-41', 'google', '2026-10-09', 18289, 589, 65, 1343.323520325091, 3.2214285714285715, 20.666515697309094, 3.5125591021313394, 2.0050708321996566, 71.91956780254593, 9121);
INSERT INTO public.delivery_events VALUES (182, 'nike-air-zoom-pegasus-41', 'meta', '2026-10-10', 18961, 626, 69, 1557.9794237543142, 3.3000000000000003, 22.579411938468322, 4.25607628816333, 1.9934228438162096, 74.76104123135933, 9512);
INSERT INTO public.delivery_events VALUES (183, 'tesla-model-y-2026', 'meta', '2026-07-12', 10227, 174, 19, 345.8718843899885, 1.7, 18.203783388946764, 3.5725656080444215, 2.0926149085530623, 71.27098807305259, 4887);
INSERT INTO public.delivery_events VALUES (184, 'tesla-model-y-2026', 'google', '2026-07-13', 11212, 191, 21, 460.0974188184218, 1.7, 21.909400896115322, 3.666935744409791, 1.9646133090354199, 73.60492716521291, 5707);
INSERT INTO public.delivery_events VALUES (185, 'tesla-model-y-2026', 'meta', '2026-07-14', 10132, 172, 19, 345.4205950061817, 1.7, 18.180031316114828, 4.242370434369658, 2.059569168927278, 69.18278156560717, 4919);
INSERT INTO public.delivery_events VALUES (186, 'tesla-model-y-2026', 'google', '2026-07-15', 11113, 189, 21, 427.29334088879403, 1.7, 20.34730194708543, 4.497965401100762, 1.9147967444578127, 70.9659415743649, 5804);
INSERT INTO public.delivery_events VALUES (187, 'tesla-model-y-2026', 'meta', '2026-07-16', 11862, 202, 22, 495.19603096825824, 1.7, 22.508910498557192, 3.610907990591915, 1.879516612622231, 68.86952868816027, 6311);
INSERT INTO public.delivery_events VALUES (188, 'tesla-model-y-2026', 'google', '2026-07-17', 11111, 189, 21, 415.7664834691169, 1.7, 19.798403974719854, 4.3754078405028825, 1.984208105575573, 69.48583219874624, 5600);
INSERT INTO public.delivery_events VALUES (189, 'tesla-model-y-2026', 'meta', '2026-07-18', 8415, 143, 16, 293.2263797380625, 1.7, 18.326648733628907, 4.147554594734163, 1.8692235957588978, 68.21819197959353, 4502);
INSERT INTO public.delivery_events VALUES (190, 'tesla-model-y-2026', 'google', '2026-07-19', 11125, 189, 21, 476.721081395362, 1.7, 22.70100387596962, 3.8785813680804395, 1.8207755324579795, 75.65103220670723, 6110);
INSERT INTO public.delivery_events VALUES (191, 'tesla-model-y-2026', 'meta', '2026-07-20', 8341, 142, 16, 301.17063401500616, 1.7, 18.823164625937885, 4.025059155572596, 2.0225882185171775, 73.60614653755138, 4124);
INSERT INTO public.delivery_events VALUES (192, 'tesla-model-y-2026', 'google', '2026-07-21', 10295, 175, 19, 368.9813268932782, 1.7, 19.420069836488327, 4.237010144530572, 1.820756797898497, 74.48992797963598, 5654);
INSERT INTO public.delivery_events VALUES (193, 'tesla-model-y-2026', 'meta', '2026-07-22', 9457, 161, 18, 364.3580765524825, 1.7, 20.242115364026805, 3.726296840722109, 1.819377506596284, 71.2817973682594, 5198);
INSERT INTO public.delivery_events VALUES (194, 'tesla-model-y-2026', 'google', '2026-07-23', 11825, 201, 22, 421.1382267373102, 1.7, 19.142646669877738, 3.8417891161213813, 1.83851015622222, 74.37812579554998, 6432);
INSERT INTO public.delivery_events VALUES (195, 'tesla-model-y-2026', 'meta', '2026-07-24', 11583, 197, 22, 417.271275622291, 1.7, 18.96687616464959, 4.4148158361980805, 1.9171556208965896, 72.93663531106661, 6042);
INSERT INTO public.delivery_events VALUES (196, 'tesla-model-y-2026', 'google', '2026-07-25', 11206, 191, 21, 398.669534345908, 1.7, 18.984263540281333, 3.9340489475115, 2.02234505574251, 77.7677291244489, 5541);
INSERT INTO public.delivery_events VALUES (197, 'tesla-model-y-2026', 'meta', '2026-07-26', 11522, 196, 22, 455.0478321601422, 1.7, 20.683992370915554, 3.955392171741532, 1.8919125013571456, 68.37327720356586, 6090);
INSERT INTO public.delivery_events VALUES (198, 'tesla-model-y-2026', 'google', '2026-07-27', 11253, 191, 21, 443.77265848436036, 1.7, 21.132031356398112, 4.000627181340281, 2.002567837095444, 72.29564598145961, 5619);
INSERT INTO public.delivery_events VALUES (199, 'tesla-model-y-2026', 'meta', '2026-07-28', 8179, 139, 15, 288.9639936576673, 1.7, 19.264266243844485, 4.467279855362907, 2.063588846531839, 76.47118203025454, 3963);
INSERT INTO public.delivery_events VALUES (200, 'tesla-model-y-2026', 'google', '2026-07-29', 9213, 157, 17, 388.6424059041775, 1.7, 22.861317994363382, 3.5996445822221714, 2.0729921494983206, 74.98465387924094, 4444);
INSERT INTO public.delivery_events VALUES (201, 'tesla-model-y-2026', 'meta', '2026-07-30', 9003, 153, 17, 318.639020798154, 1.7, 18.743471811656118, 3.658238667390345, 1.8908615173076806, 75.12972021193923, 4761);
INSERT INTO public.delivery_events VALUES (202, 'tesla-model-y-2026', 'google', '2026-07-31', 9634, 164, 18, 360.33439253616547, 1.7, 20.018577363120304, 3.876761539795913, 1.884911511577454, 68.74500811344139, 5111);
INSERT INTO public.delivery_events VALUES (203, 'tesla-model-y-2026', 'meta', '2026-08-01', 9361, 159, 17, 336.3587647844836, 1.7, 19.785809693204918, 4.174934215260657, 1.8746264030527078, 76.21098376830392, 4994);
INSERT INTO public.delivery_events VALUES (204, 'tesla-model-y-2026', 'google', '2026-08-02', 9884, 168, 18, 351.0101833042778, 1.7, 19.500565739126543, 3.709868886319546, 1.9020287428511975, 70.70383860993147, 5197);
INSERT INTO public.delivery_events VALUES (205, 'tesla-model-y-2026', 'meta', '2026-08-03', 8748, 149, 16, 337.5764652281483, 1.7, 21.09852907675927, 3.8904735758430284, 1.8369918208496747, 70.62261682298839, 4762);
INSERT INTO public.delivery_events VALUES (206, 'tesla-model-y-2026', 'google', '2026-08-04', 9293, 158, 17, 376.0615487474991, 1.7, 22.1212675733823, 3.8348346907574795, 1.9706979679818002, 77.40173187544453, 4716);
INSERT INTO public.delivery_events VALUES (207, 'tesla-model-y-2026', 'meta', '2026-08-05', 9529, 162, 18, 357.3250353270555, 1.7, 19.851390851503083, 3.741112579603805, 2.011229707630428, 76.3905205470548, 4738);
INSERT INTO public.delivery_events VALUES (208, 'tesla-model-y-2026', 'google', '2026-08-06', 8817, 150, 16, 305.14112249485896, 1.7, 19.071320155928685, 4.469324842201576, 1.9399908270647028, 76.90619256505997, 4545);
INSERT INTO public.delivery_events VALUES (209, 'tesla-model-y-2026', 'meta', '2026-08-07', 10278, 175, 19, 348.54623116667227, 1.7, 18.344538482456436, 3.654699353925426, 2.0964099586716434, 68.09462967857613, 4903);
INSERT INTO public.delivery_events VALUES (210, 'tesla-model-y-2026', 'google', '2026-08-08', 8893, 151, 17, 321.1958783808565, 1.7, 18.893875198873914, 3.7396875639404996, 1.9063877051112683, 77.0666348043969, 4665);
INSERT INTO public.delivery_events VALUES (211, 'tesla-model-y-2026', 'meta', '2026-08-09', 11411, 194, 21, 402.61760049148955, 1.7, 19.17226669007093, 4.1735706500619605, 2.0135114296927927, 72.1721190953821, 5667);
INSERT INTO public.delivery_events VALUES (212, 'tesla-model-y-2026', 'google', '2026-08-10', 11989, 204, 22, 478.8405882560249, 1.7, 21.765481284364768, 4.335488179741511, 1.9910780538515667, 73.2247898320846, 6021);
INSERT INTO public.delivery_events VALUES (213, 'tesla-model-y-2026', 'meta', '2026-08-11', 8224, 140, 15, 329.2468455519993, 1.7, 21.949789703466617, 4.181834640128699, 2.080969579613366, 71.05313574403806, 3952);
INSERT INTO public.delivery_events VALUES (214, 'tesla-model-y-2026', 'google', '2026-08-12', 10350, 176, 19, 360.62365859936335, 1.7, 18.98019255786123, 4.289733411652268, 1.959261805532709, 74.64059897436421, 5283);
INSERT INTO public.delivery_events VALUES (215, 'tesla-model-y-2026', 'meta', '2026-08-13', 10770, 183, 20, 373.96230340046964, 1.7, 18.69811517002348, 4.029752632515852, 2.0500865199256246, 73.32536502189974, 5253);
INSERT INTO public.delivery_events VALUES (216, 'tesla-model-y-2026', 'google', '2026-08-14', 11363, 193, 21, 442.8265889810467, 1.7, 21.08698042766889, 4.157435409919883, 2.0002429194564035, 71.26411193566835, 5681);
INSERT INTO public.delivery_events VALUES (217, 'tesla-model-y-2026', 'meta', '2026-08-15', 10551, 179, 20, 454.01697992766503, 1.7, 22.70084899638325, 3.5088244073893815, 1.9635016036033701, 68.06639226310149, 5374);
INSERT INTO public.delivery_events VALUES (218, 'tesla-model-y-2026', 'google', '2026-08-16', 9785, 166, 18, 366.27487772871615, 1.7, 20.34860431826201, 3.9166237302036544, 2.0616678334258474, 69.27624324020705, 4746);
INSERT INTO public.delivery_events VALUES (219, 'tesla-model-y-2026', 'meta', '2026-08-17', 9813, 167, 18, 330.10502149638313, 1.7, 18.339167860910173, 3.612870925864378, 2.02213074643566, 72.40681209888308, 4853);
INSERT INTO public.delivery_events VALUES (220, 'tesla-model-y-2026', 'google', '2026-08-18', 10299, 175, 19, 347.7754123754564, 1.7, 18.303969072392444, 3.5646595835858097, 1.8339557981316608, 70.34232583640852, 5616);
INSERT INTO public.delivery_events VALUES (221, 'tesla-model-y-2026', 'meta', '2026-08-19', 9887, 168, 18, 347.8564121549332, 1.7, 19.325356230829623, 4.3174921262970045, 1.8357315580627012, 71.71088940039913, 5386);
INSERT INTO public.delivery_events VALUES (222, 'tesla-model-y-2026', 'google', '2026-08-20', 11138, 189, 21, 390.8585377838474, 1.7, 18.612311323040352, 3.7477516818885013, 1.9278874288828984, 71.64446279196088, 5777);
INSERT INTO public.delivery_events VALUES (223, 'tesla-model-y-2026', 'meta', '2026-08-21', 11931, 203, 22, 455.6809436285043, 1.7, 20.712770164932014, 3.568411563946417, 1.9398709441484825, 73.23985364487069, 6150);
INSERT INTO public.delivery_events VALUES (224, 'tesla-model-y-2026', 'google', '2026-08-22', 9177, 156, 17, 309.5191379639873, 1.7, 18.207008115528666, 3.7748111270765645, 2.0371433513535493, 77.3631922113557, 4505);
INSERT INTO public.delivery_events VALUES (225, 'tesla-model-y-2026', 'meta', '2026-08-23', 8245, 140, 15, 282.9305430613229, 1.7, 18.862036204088195, 4.287653314494914, 2.058295970633698, 75.8760187153218, 4006);
INSERT INTO public.delivery_events VALUES (226, 'tesla-model-y-2026', 'google', '2026-08-24', 9040, 154, 17, 326.56856677570005, 1.7, 19.209915692688238, 3.826981761794137, 1.9869573361548793, 70.52297058407225, 4550);
INSERT INTO public.delivery_events VALUES (227, 'tesla-model-y-2026', 'meta', '2026-08-25', 9851, 167, 18, 358.14054230215913, 1.7, 19.896696794564395, 4.140641729349261, 1.997430048714672, 77.08448886693664, 4932);
INSERT INTO public.delivery_events VALUES (228, 'tesla-model-y-2026', 'google', '2026-08-26', 11963, 203, 22, 495.8746590397742, 1.7, 22.539757229080646, 3.803930987648374, 1.9198821994938817, 72.36301487339227, 6231);
INSERT INTO public.delivery_events VALUES (229, 'tesla-model-y-2026', 'meta', '2026-08-27', 10232, 174, 19, 395.3304788899306, 1.7, 20.806867309996345, 4.0802335337262345, 1.9851159772306028, 77.08969964027116, 5154);
INSERT INTO public.delivery_events VALUES (230, 'tesla-model-y-2026', 'google', '2026-08-28', 11885, 202, 22, 426.96597460576675, 1.7, 19.407544300262124, 3.6848705233306287, 1.9294609775450409, 68.96966909440404, 6160);
INSERT INTO public.delivery_events VALUES (231, 'tesla-model-y-2026', 'meta', '2026-08-29', 10211, 174, 19, 387.49238108821334, 1.7, 20.39433584674807, 4.3484266934632005, 2.068178028036699, 71.63757573842511, 4937);
INSERT INTO public.delivery_events VALUES (232, 'tesla-model-y-2026', 'google', '2026-08-30', 9557, 162, 18, 392.1535170745997, 1.7, 21.786306504144427, 3.6824394364038078, 1.804516097696177, 72.17233478319484, 5296);
INSERT INTO public.delivery_events VALUES (233, 'tesla-model-y-2026', 'meta', '2026-08-31', 8260, 140, 15, 324.9865686472663, 1.7, 21.665771243151088, 4.353752021870236, 2.034941515972271, 75.11301741837467, 4059);
INSERT INTO public.delivery_events VALUES (234, 'tesla-model-y-2026', 'google', '2026-09-01', 10101, 172, 19, 347.62978615022877, 1.7, 18.296304534222568, 3.908372325277519, 1.985291259281654, 77.03954413382588, 5088);
INSERT INTO public.delivery_events VALUES (235, 'tesla-model-y-2026', 'meta', '2026-09-02', 11796, 201, 22, 413.71083452463324, 1.7, 18.805037932937875, 3.6970342735678248, 1.8467206603020758, 68.33426151045485, 6388);
INSERT INTO public.delivery_events VALUES (236, 'tesla-model-y-2026', 'google', '2026-09-03', 9704, 165, 18, 384.2717101511331, 1.7, 21.348428341729615, 3.8976602050179014, 1.9110641351789257, 69.64974556137243, 5078);
INSERT INTO public.delivery_events VALUES (237, 'tesla-model-y-2026', 'meta', '2026-09-04', 10297, 175, 19, 401.66457825131715, 1.7, 21.14024096059564, 3.9037421579372893, 1.9537567634522246, 74.44171374309764, 5270);
INSERT INTO public.delivery_events VALUES (238, 'tesla-model-y-2026', 'google', '2026-09-05', 9228, 157, 17, 388.997351849923, 1.7, 22.88219716764253, 4.091115698522956, 2.021305879447101, 74.02241567580111, 4565);
INSERT INTO public.delivery_events VALUES (239, 'tesla-model-y-2026', 'meta', '2026-09-06', 10185, 173, 19, 350.9407427459503, 1.7, 18.470565407681594, 3.5352042976139293, 1.9350683293271604, 72.46712022318586, 5263);
INSERT INTO public.delivery_events VALUES (240, 'tesla-model-y-2026', 'google', '2026-09-07', 10773, 183, 20, 457.1813926665694, 1.7, 22.85906963332847, 4.145730459231304, 1.908908032893988, 70.39831087725548, 5644);
INSERT INTO public.delivery_events VALUES (241, 'tesla-model-y-2026', 'meta', '2026-09-08', 8145, 138, 15, 276.5021001306236, 1.7, 18.433473342041573, 3.764525702744078, 1.9248416120119232, 74.73487520946044, 4232);
INSERT INTO public.delivery_events VALUES (242, 'tesla-model-y-2026', 'google', '2026-09-09', 9884, 168, 18, 399.36567000513435, 1.7, 22.186981666951908, 3.8756264257137074, 1.9659413991557908, 75.30479388297842, 5028);
INSERT INTO public.delivery_events VALUES (243, 'tesla-model-y-2026', 'meta', '2026-09-10', 8430, 143, 16, 303.122657012763, 1.7, 18.945166063297687, 4.053879728709246, 1.9352565885045263, 72.0184951755855, 4356);
INSERT INTO public.delivery_events VALUES (244, 'tesla-model-y-2026', 'google', '2026-09-11', 9959, 169, 19, 419.6623625642221, 1.7, 22.087492766538006, 4.417921438728656, 1.9514651101238552, 68.31247096199048, 5103);
INSERT INTO public.delivery_events VALUES (245, 'tesla-model-y-2026', 'meta', '2026-09-12', 8806, 150, 16, 355.9312545862693, 1.7, 22.24570341164183, 4.125820997922799, 2.0919831275259915, 75.01996838006613, 4209);
INSERT INTO public.delivery_events VALUES (246, 'tesla-model-y-2026', 'google', '2026-09-13', 8969, 152, 17, 353.7041674724178, 1.7, 20.806127498377517, 3.5753875470412995, 1.8072435942937863, 70.98746005273267, 4963);
INSERT INTO public.delivery_events VALUES (247, 'tesla-model-y-2026', 'meta', '2026-09-14', 11171, 190, 21, 414.92264050891634, 1.7, 19.758220976615064, 4.434529559485423, 2.0692809647545936, 70.1019912049405, 5398);
INSERT INTO public.delivery_events VALUES (248, 'tesla-model-y-2026', 'google', '2026-09-15', 11191, 190, 21, 408.0343550522746, 1.7, 19.430207383441648, 4.294021715170832, 1.9408368501400537, 75.6449917595306, 5766);
INSERT INTO public.delivery_events VALUES (249, 'tesla-model-y-2026', 'meta', '2026-09-16', 11553, 196, 22, 491.34940101767825, 1.7, 22.33406368262174, 3.964723241612356, 2.093385356772443, 74.69114462277118, 5519);
INSERT INTO public.delivery_events VALUES (250, 'tesla-model-y-2026', 'google', '2026-09-17', 9268, 158, 17, 371.0087197178935, 1.7, 21.824042336346675, 3.67529080044243, 1.9326522547193283, 73.70708315783985, 4795);
INSERT INTO public.delivery_events VALUES (251, 'tesla-model-y-2026', 'meta', '2026-09-18', 8268, 141, 16, 349.8381192967039, 1.7, 21.864882456043993, 4.406712447820544, 1.8770104070254992, 69.4646528622964, 4405);
INSERT INTO public.delivery_events VALUES (252, 'tesla-model-y-2026', 'google', '2026-09-19', 8302, 141, 16, 335.96548465555384, 1.7, 20.997842790972115, 3.7891344732629646, 1.9439844815466787, 77.1327959679845, 4271);
INSERT INTO public.delivery_events VALUES (253, 'tesla-model-y-2026', 'meta', '2026-09-20', 9388, 160, 18, 347.2222766563137, 1.7, 19.290126480906316, 3.649965341927788, 1.8017595249793226, 68.6764588488788, 5210);
INSERT INTO public.delivery_events VALUES (254, 'tesla-model-y-2026', 'google', '2026-09-21', 9931, 169, 19, 389.91185577874035, 1.7, 20.521676619933704, 3.720321717070304, 1.8886210752629156, 74.02445780137114, 5258);
INSERT INTO public.delivery_events VALUES (255, 'tesla-model-y-2026', 'meta', '2026-09-22', 9802, 167, 18, 335.7375892323906, 1.7, 18.652088290688365, 4.039225201318139, 1.8760089232847792, 74.28437408811698, 5225);
INSERT INTO public.delivery_events VALUES (256, 'tesla-model-y-2026', 'google', '2026-09-23', 10521, 179, 20, 440.619011305277, 1.7, 22.03095056526385, 3.5819736576242214, 2.063123861293805, 74.86545281969151, 5100);
INSERT INTO public.delivery_events VALUES (257, 'tesla-model-y-2026', 'meta', '2026-09-24', 8763, 149, 16, 311.7936331192882, 1.7, 19.48710206995551, 4.412545262380858, 2.0618443250463456, 71.24452334320728, 4250);
INSERT INTO public.delivery_events VALUES (258, 'tesla-model-y-2026', 'google', '2026-09-25', 11013, 187, 21, 439.33308988453945, 1.7, 20.920623327835212, 4.391575808539794, 1.9812513074191687, 74.27440673551195, 5559);
INSERT INTO public.delivery_events VALUES (259, 'tesla-model-y-2026', 'meta', '2026-09-26', 8447, 144, 16, 306.79430132059144, 1.7, 19.174643832536965, 3.615442399513981, 2.0970882262522683, 72.67228326304404, 4028);
INSERT INTO public.delivery_events VALUES (260, 'tesla-model-y-2026', 'google', '2026-09-27', 9845, 167, 18, 369.2952773831451, 1.7, 20.516404299063616, 4.10416222500662, 2.058109400016952, 69.67633786680474, 4784);
INSERT INTO public.delivery_events VALUES (261, 'tesla-model-y-2026', 'meta', '2026-09-28', 9172, 156, 17, 346.7841506475711, 1.7, 20.39906768515124, 4.475178647296475, 1.8048139258434628, 73.77198606509992, 5082);
INSERT INTO public.delivery_events VALUES (262, 'tesla-model-y-2026', 'google', '2026-09-29', 9589, 163, 18, 389.96169836222475, 1.7, 21.664538797901375, 3.573944445783596, 2.0525876370092258, 68.29203123530911, 4672);
INSERT INTO public.delivery_events VALUES (263, 'tesla-model-y-2026', 'meta', '2026-09-30', 10950, 186, 20, 435.87717317617404, 1.7, 21.793858658808702, 3.780826222433474, 1.9664456758119937, 75.51811473189807, 5568);
INSERT INTO public.delivery_events VALUES (264, 'tesla-model-y-2026', 'google', '2026-10-01', 10003, 170, 19, 350.52594968074555, 1.7, 18.44873419372345, 4.239035910534801, 1.9867459593786974, 70.05191745113432, 5035);
INSERT INTO public.delivery_events VALUES (265, 'tesla-model-y-2026', 'meta', '2026-10-02', 9376, 159, 17, 317.26956491970543, 1.7, 18.662915583512085, 3.883055270596035, 1.8954972334449547, 74.70505790336662, 4946);
INSERT INTO public.delivery_events VALUES (266, 'tesla-model-y-2026', 'google', '2026-10-03', 9890, 168, 18, 324.4445538634766, 1.7, 18.02469743685981, 3.615049531520984, 1.9519715674741673, 73.93035537223301, 5067);
INSERT INTO public.delivery_events VALUES (267, 'tesla-model-y-2026', 'meta', '2026-10-04', 11350, 193, 21, 459.27128769391663, 1.7, 21.870061318757934, 3.9272281669012177, 1.9030456547624863, 73.5793223845253, 5964);
INSERT INTO public.delivery_events VALUES (268, 'tesla-model-y-2026', 'google', '2026-10-05', 11229, 191, 21, 434.23514408303845, 1.7, 20.677864003954213, 3.992141741038861, 1.9468944135043063, 68.77709483050216, 5768);
INSERT INTO public.delivery_events VALUES (269, 'tesla-model-y-2026', 'meta', '2026-10-06', 8056, 137, 15, 284.5504822972192, 1.7, 18.970032153147947, 4.368334523091111, 1.918333022643684, 68.0872469915289, 4199);
INSERT INTO public.delivery_events VALUES (270, 'tesla-model-y-2026', 'google', '2026-10-07', 9464, 161, 18, 360.7705653265505, 1.7, 20.042809184808362, 4.190877075000239, 2.082173448763129, 75.17109524068788, 4545);
INSERT INTO public.delivery_events VALUES (271, 'tesla-model-y-2026', 'meta', '2026-10-08', 11410, 194, 21, 462.934796755802, 1.7, 22.044514131228667, 4.257220872715674, 2.026218612439127, 77.33523474162295, 5631);
INSERT INTO public.delivery_events VALUES (272, 'tesla-model-y-2026', 'google', '2026-10-09', 8745, 149, 16, 296.21198866427795, 1.7, 18.513249291517372, 3.665673302569706, 2.0759349095301682, 68.5226243394846, 4213);
INSERT INTO public.delivery_events VALUES (273, 'tesla-model-y-2026', 'meta', '2026-10-10', 9516, 162, 18, 335.9184058520962, 1.7, 18.66213365844979, 3.80423946236534, 1.9949812292500286, 75.18907316312017, 4770);

INSERT INTO public.document_chunks VALUES (1, 1, 0, 'The iPhone 16 Pro starts at 999 dollars.', 'e1', '2026-10-10 05:19:32.003612');
INSERT INTO public.document_chunks VALUES (2, 2, 0, 'Example docs content.', 'e2', '2026-10-10 05:19:32.003612');

INSERT INTO public.journeys VALUES ('0871b242-b161-47f2-91ec-11d1658d0fc8', 'apple-iphone-16-pro', 'Apple — iPhone 16 Pro Journey', '{"schemaVersion": 3, "theme": {"primary": "#4f46e5", "accent": "#f97316", "surface": "#ffffff", "foreground": "#111827", "font": "Inter", "radius": 16, "cta": "Continue"}, "askAi": {"id": "ask-ai", "placeholder": "Ask about the iPhone 16 Pro...", "buttonLabel": "Ask", "refusalMessage": "This question is out of context.", "ragK": 8, "allowJourneyJump": true, "allowRag": true, "answerStyle": "thread", "persistence": "session", "pinnedPanel": true, "allowPin": true, "allowAdjust": true, "maxConcurrentQueries": 3, "historyLimit": 100}, "nodes": [{"id": "trigger", "type": "trigger", "position": {"x": -260, "y": 220}, "config": {}}, {"id": "ask-ai-node", "type": "ask_ai", "position": {"x": -260, "y": -60}, "config": {"placeholder": "Ask about the iPhone 16 Pro...", "buttonLabel": "Ask", "refusalMessage": "This question is out of context.", "ragK": 8, "allowJourneyJump": true, "allowRag": true, "suggestedQuestions": []}}, {"id": "b1", "type": "hero_section", "position": {"x": 0, "y": 0}, "config": {"headline": "iPhone 16 Pro", "subheadline": "Built for Apple Intelligence. A18 Pro chip inside.", "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Camera_of_iPhone_16_Pro.jpg", "imagePosition": "right", "ctas": []}}, {"id": "b2", "type": "input", "position": {"x": 0, "y": 1}, "config": {"type": "email", "label": "Email for order updates", "placeholder": "you@example.com", "required": true, "checkUniqueness": true, "blockKey": "field_email_for_order_updates"}}, {"id": "end", "type": "end", "position": {"x": 700, "y": 220}, "config": {"redirectUrl": "https://www.apple.com/iphone-16-pro/", "redirectDelayMs": 1500}}], "screens": [{"id": "s1", "name": "Welcome", "position": {"x": 60, "y": 160}, "size": {"width": 440, "height": 560}, "blocks": ["b1", "b2"], "layout": {"mode": "stack", "direction": "column", "gap": "16px", "padding": "16px", "align": "stretch", "justify": "start", "scroll": "auto"}, "advance": {"mode": "button", "handle": "default", "label": "Continue", "position": "bottom-sticky", "variant": "solid", "fullWidth": true, "requireValid": false, "requireBlocks": []}, "back": {"show": false, "label": "Back"}}], "edges": [{"id": "e-trigger-s1", "source": "trigger", "target": "s1", "sourceHandle": null}, {"id": "e-s1-end", "source": "s1", "target": "end", "sourceHandle": "default"}]}', 'PUBLISHED', 1, '2026-10-10 05:19:13.341622', '2026-10-10 05:19:13.341626');
INSERT INTO public.journeys VALUES ('40a659fe-7d32-4781-ac08-c48d85b753a0', 'nike-air-zoom-pegasus-41', 'Nike — Air Zoom Pegasus 41 Journey', '{"schemaVersion": 3, "theme": {"primary": "#4f46e5", "accent": "#f97316", "surface": "#ffffff", "foreground": "#111827", "font": "Inter", "radius": 16, "cta": "Continue"}, "askAi": {"id": "ask-ai", "placeholder": "Ask about the Pegasus 41...", "buttonLabel": "Ask", "refusalMessage": "This question is out of context.", "ragK": 8, "allowJourneyJump": true, "allowRag": true, "answerStyle": "thread", "persistence": "session", "pinnedPanel": true, "allowPin": true, "allowAdjust": true, "maxConcurrentQueries": 3, "historyLimit": 100}, "nodes": [{"id": "trigger", "type": "trigger", "position": {"x": -260, "y": 220}, "config": {}}, {"id": "ask-ai-node", "type": "ask_ai", "position": {"x": -260, "y": -60}, "config": {"placeholder": "Ask about the Pegasus 41...", "buttonLabel": "Ask", "refusalMessage": "This question is out of context.", "ragK": 8, "allowJourneyJump": true, "allowRag": true, "suggestedQuestions": []}}, {"id": "b1", "type": "hero_section", "position": {"x": 0, "y": 0}, "config": {"headline": "Nike Air Zoom Pegasus 41", "subheadline": "ReactX foam. Dual Air Zoom. Ready for every mile.", "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Nike_Zoom_Pegasus_38_running_shoe.jpg", "imagePosition": "right", "ctas": []}}, {"id": "b2", "type": "select", "position": {"x": 0, "y": 1}, "config": {"label": "Size", "placeholder": "Choose your US size", "options": [{"value": "9", "label": "US 9"}, {"value": "10", "label": "US 10"}], "required": true, "blockKey": "field_size"}}, {"id": "end", "type": "end", "position": {"x": 700, "y": 220}, "config": {"redirectUrl": "https://www.nike.com/t/air-zoom-pegasus-41-road-running-shoes", "redirectDelayMs": 1500}}], "screens": [{"id": "s1", "name": "Welcome", "position": {"x": 60, "y": 160}, "size": {"width": 440, "height": 540}, "blocks": ["b1", "b2"], "layout": {"mode": "stack", "direction": "column", "gap": "16px", "padding": "16px", "align": "stretch", "justify": "start", "scroll": "auto"}, "advance": {"mode": "button", "handle": "default", "label": "Continue", "position": "bottom-sticky", "variant": "solid", "fullWidth": true, "requireValid": false, "requireBlocks": []}, "back": {"show": false, "label": "Back"}}], "edges": [{"id": "e-trigger-s1", "source": "trigger", "target": "s1", "sourceHandle": null}, {"id": "e-s1-end", "source": "s1", "target": "end", "sourceHandle": "default"}]}', 'PUBLISHED', 1, '2026-10-10 05:19:13.341637', '2026-10-10 05:19:13.341638');
INSERT INTO public.journeys VALUES ('9946a41c-8380-4bfa-a2e3-82307a826881', 'tesla-model-y-2026', 'Tesla — Model Y (2026) Journey', '{"schemaVersion": 3, "theme": {"primary": "#4f46e5", "accent": "#f97316", "surface": "#ffffff", "foreground": "#111827", "font": "Inter", "radius": 16, "cta": "Continue"}, "askAi": {"id": "ask-ai", "placeholder": "Ask about the 2026 Model Y...", "buttonLabel": "Ask", "refusalMessage": "This question is out of context.", "ragK": 8, "allowJourneyJump": true, "allowRag": true, "answerStyle": "thread", "persistence": "session", "pinnedPanel": true, "allowPin": true, "allowAdjust": true, "maxConcurrentQueries": 3, "historyLimit": 100}, "nodes": [{"id": "trigger", "type": "trigger", "position": {"x": -260, "y": 220}, "config": {}}, {"id": "ask-ai-node", "type": "ask_ai", "position": {"x": -260, "y": -60}, "config": {"placeholder": "Ask about the 2026 Model Y...", "buttonLabel": "Ask", "refusalMessage": "This question is out of context.", "ragK": 8, "allowJourneyJump": true, "allowRag": true, "suggestedQuestions": []}}, {"id": "b1", "type": "hero_section", "position": {"x": 0, "y": 0}, "config": {"headline": "Tesla Model Y", "subheadline": "The Juniper refresh. Six configurations, one mission.", "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Tesla_Model_Y_Front_View.jpg", "imagePosition": "right", "ctas": []}}, {"id": "b2", "type": "select", "position": {"x": 0, "y": 1}, "config": {"label": "Configuration", "placeholder": "Choose a configuration", "options": [{"value": "standard-rwd", "label": "Standard RWD \u2014 $39", "990 \u00b7 321mi": null}, {"value": "premium-awd", "label": "Premium AWD \u2014 $49", "990 \u00b7 327mi": null}], "required": true, "blockKey": "field_configuration"}}, {"id": "end", "type": "end", "position": {"x": 700, "y": 220}, "config": {"redirectUrl": "https://www.tesla.com/modely", "redirectDelayMs": 1500}}], "screens": [{"id": "s1", "name": "Welcome", "position": {"x": 60, "y": 160}, "size": {"width": 440, "height": 540}, "blocks": ["b1", "b2"], "layout": {"mode": "stack", "direction": "column", "gap": "16px", "padding": "16px", "align": "stretch", "justify": "start", "scroll": "auto"}, "advance": {"mode": "button", "handle": "default", "label": "Continue", "position": "bottom-sticky", "variant": "solid", "fullWidth": true, "requireValid": false, "requireBlocks": []}, "back": {"show": false, "label": "Back"}}], "edges": [{"id": "e-trigger-s1", "source": "trigger", "target": "s1", "sourceHandle": null}, {"id": "e-s1-end", "source": "s1", "target": "end", "sourceHandle": "default"}]}', 'PUBLISHED', 1, '2026-10-10 05:19:13.341645', '2026-10-10 05:19:13.341647');
INSERT INTO public.journeys VALUES ('orphan-journey-1', 'missing-campaign', 'Orphan', '{}', 'DRAFT', 1, '2026-10-10 05:19:32.003612', '2026-10-10 05:19:32.003612');
INSERT INTO public.journeys VALUES ('dupe-journey-1', 'tesla-model-y-2026', 'Older duplicate', '{"schemaVersion":3,"nodes":[],"screens":[],"edges":[]}', 'DRAFT', 1, '2026-09-10 05:19:32.003612', '2026-10-10 05:19:32.003612');

INSERT INTO public.knowledge_sources VALUES (1, 'qa', 'Pricing', 'campaign:apple-iphone-16-pro', '2026-10-10 05:19:32.003612');
INSERT INTO public.knowledge_sources VALUES (2, 'web', 'Docs', 'https://example.com', '2026-10-10 05:19:32.003612');

INSERT INTO public.metric_definitions VALUES ('ctr', 'Click-Through Rate', 'clicks / impressions, as a percentage', 'percent', '(clicks/impressions)*100');
INSERT INTO public.metric_definitions VALUES ('cpa', 'Cost Per Acquisition', 'spend / conversions', 'USD', 'spend/conversions');
INSERT INTO public.metric_definitions VALUES ('roas', 'Return on Ad Spend', 'revenue / spend', 'ratio', 'revenue/spend');
INSERT INTO public.metric_definitions VALUES ('reach', 'Reach', 'unique users reached', 'users', 'count(distinct user)');
INSERT INTO public.metric_definitions VALUES ('frequency', 'Frequency', 'average impressions per user', 'impressions/user', 'impressions/reach');
INSERT INTO public.metric_definitions VALUES ('viewability', 'Viewability', 'viewable impressions / total impressions', 'percent', 'viewable/impressions*100');

INSERT INTO public.mock_campaigns VALUES ('mock-apple-meta', 'meta', 'act_apple_16pro_meta', 'Apple — iPhone 16 Pro (Meta Reels + Advantage+)', '{"objective":"SALES","placements":["instagram_reels","facebook_feed"]}', 'ACTIVE', 540, '2026-10-10 05:19:13.460032', '2026-10-10 05:19:13.460036');
INSERT INTO public.mock_campaigns VALUES ('mock-apple-google', 'google', 'customers/111/campaigns/1001', 'Apple — iPhone 16 Pro (YouTube + Search)', '{"objective":"CONVERSIONS","placements":["youtube_instream","search"]}', 'ACTIVE', 400, '2026-10-10 05:19:13.460039', '2026-10-10 05:19:13.460041');
INSERT INTO public.mock_campaigns VALUES ('mock-nike-meta', 'meta', 'act_nike_pegasus_meta', 'Nike — Air Zoom Pegasus 41 (Meta Feed + Stories)', '{"objective":"SALES","placements":["instagram_feed","instagram_stories"]}', 'ACTIVE', 380, '2026-10-10 05:19:13.460043', '2026-10-10 05:19:13.460045');
INSERT INTO public.mock_campaigns VALUES ('mock-nike-google', 'google', 'customers/222/campaigns/2002', 'Nike — Air Zoom Pegasus 41 (YouTube Shorts)', '{"objective":"AWARENESS","placements":["youtube_shorts"]}', 'ACTIVE', 240, '2026-10-10 05:19:13.460047', '2026-10-10 05:19:13.460048');
INSERT INTO public.mock_campaigns VALUES ('mock-tesla-meta', 'meta', 'act_tesla_modely_meta', 'Tesla — Model Y (Meta Lead)', '{"objective":"LEADS","placements":["facebook_feed","instagram_reels"]}', 'ACTIVE', 620, '2026-10-10 05:19:13.46005', '2026-10-10 05:19:13.460052');
INSERT INTO public.mock_campaigns VALUES ('mock-tesla-google', 'google', 'customers/333/campaigns/3003', 'Tesla — Model Y (Search + YouTube)', '{"objective":"LEADS","placements":["search","youtube_instream"]}', 'ACTIVE', 520, '2026-10-10 05:19:13.460054', '2026-10-10 05:19:13.460055');

SELECT pg_catalog.setval('public.action_proposals_id_seq', 1, false);

SELECT pg_catalog.setval('public.anomaly_events_id_seq', 1, false);

SELECT pg_catalog.setval('public.click_events_id_seq', 1, false);

SELECT pg_catalog.setval('public.delivery_events_id_seq', 273, true);

SELECT pg_catalog.setval('public.document_chunks_id_seq', 2, true);

SELECT pg_catalog.setval('public.eval_runs_id_seq', 1, false);

SELECT pg_catalog.setval('public.field_values_id_seq', 1, false);

SELECT pg_catalog.setval('public.knowledge_sources_id_seq', 2, true);

SELECT pg_catalog.setval('public.llm_usage_events_id_seq', 1, false);

SELECT pg_catalog.setval('public.request_logs_id_seq', 1, false);

SELECT pg_catalog.setval('public.run_activity_events_id_seq', 1, false);

SELECT pg_catalog.setval('public.run_screen_executions_id_seq', 1, false);

ALTER TABLE ONLY public.action_proposals
    ADD CONSTRAINT action_proposals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.anomaly_events
    ADD CONSTRAINT anomaly_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_dev_token_key UNIQUE (dev_token);

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.click_events
    ADD CONSTRAINT click_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.delivery_events
    ADD CONSTRAINT delivery_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.eval_runs
    ADD CONSTRAINT eval_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT field_values_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.journeys
    ADD CONSTRAINT journeys_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.knowledge_sources
    ADD CONSTRAINT knowledge_sources_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.llm_usage_events
    ADD CONSTRAINT llm_usage_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.metric_definitions
    ADD CONSTRAINT metric_definitions_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.mock_campaigns
    ADD CONSTRAINT mock_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.run_activity_events
    ADD CONSTRAINT run_activity_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.run_screen_executions
    ADD CONSTRAINT run_screen_executions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.run_sessions
    ADD CONSTRAINT run_sessions_pkey PRIMARY KEY (id);

CREATE INDEX ix_activity_events_campaign_id ON public.activity_events USING btree (campaign_id);

CREATE INDEX ix_audit_log_actor ON public.audit_log USING btree (actor);

CREATE INDEX ix_audit_log_campaign_id ON public.audit_log USING btree (campaign_id);

CREATE INDEX ix_click_events_campaign_id ON public.click_events USING btree (campaign_id);

CREATE INDEX ix_delivery_events_campaign_id ON public.delivery_events USING btree (campaign_id);

CREATE INDEX ix_delivery_events_date ON public.delivery_events USING btree (date);

CREATE INDEX ix_field_values_campaign_id ON public.field_values USING btree (campaign_id);

CREATE INDEX ix_journeys_campaign_id ON public.journeys USING btree (campaign_id);

CREATE INDEX ix_llm_usage_events_campaign_id ON public.llm_usage_events USING btree (campaign_id);

CREATE INDEX ix_mock_campaigns_external_id ON public.mock_campaigns USING btree (external_id);

CREATE INDEX ix_mock_campaigns_platform ON public.mock_campaigns USING btree (platform);

CREATE INDEX ix_run_activity_events_campaign_id ON public.run_activity_events USING btree (campaign_id);

CREATE INDEX ix_run_screen_executions_session_id ON public.run_screen_executions USING btree (session_id);

CREATE INDEX ix_run_sessions_campaign_id ON public.run_sessions USING btree (campaign_id);

CREATE INDEX ix_run_sessions_journey_id ON public.run_sessions USING btree (journey_id);


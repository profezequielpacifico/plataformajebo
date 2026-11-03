could not change directory to "/home/oem": Permiso denegado
--
-- PostgreSQL database dump
--

\restrict Et8JTgtMsmo6Yejbiho7wjrxjFSw80SOw2ZPRXzwnelaHZ9iI2UqEQLg0Ra0dpZ

-- Dumped from database version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bitacora; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bitacora (
    id_bitacora integer NOT NULL,
    id_usuario integer,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_accion character varying(50) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    resultado character varying(20),
    detalle text
);


ALTER TABLE public.bitacora OWNER TO postgres;

--
-- Name: bitacora_id_bitacora_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bitacora_id_bitacora_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bitacora_id_bitacora_seq OWNER TO postgres;

--
-- Name: bitacora_id_bitacora_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bitacora_id_bitacora_seq OWNED BY public.bitacora.id_bitacora;


--
-- Name: cancha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cancha (
    id_cancha integer NOT NULL,
    id_distrito integer NOT NULL,
    id_disciplina integer NOT NULL,
    nombre character varying(200) NOT NULL,
    ubicacion character varying(300),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cancha OWNER TO postgres;

--
-- Name: cancha_id_cancha_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cancha_id_cancha_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cancha_id_cancha_seq OWNER TO postgres;

--
-- Name: cancha_id_cancha_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cancha_id_cancha_seq OWNED BY public.cancha.id_cancha;


--
-- Name: disciplina; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disciplina (
    id_disciplina integer NOT NULL,
    nombre character varying(150) NOT NULL,
    reglamento character varying(255),
    jugadores_por_equipo integer DEFAULT 0 NOT NULL,
    descripcion text
);


ALTER TABLE public.disciplina OWNER TO postgres;

--
-- Name: disciplina_id_disciplina_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disciplina_id_disciplina_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.disciplina_id_disciplina_seq OWNER TO postgres;

--
-- Name: disciplina_id_disciplina_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disciplina_id_disciplina_seq OWNED BY public.disciplina.id_disciplina;


--
-- Name: disponibilidad_cancha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disponibilidad_cancha (
    id_disponibilidad integer NOT NULL,
    fecha_horario timestamp without time zone NOT NULL,
    id_cancha integer NOT NULL
);


ALTER TABLE public.disponibilidad_cancha OWNER TO postgres;

--
-- Name: disponibilidad_cancha_id_disponibilidad_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disponibilidad_cancha_id_disponibilidad_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.disponibilidad_cancha_id_disponibilidad_seq OWNER TO postgres;

--
-- Name: disponibilidad_cancha_id_disponibilidad_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disponibilidad_cancha_id_disponibilidad_seq OWNED BY public.disponibilidad_cancha.id_disponibilidad;


--
-- Name: distrito; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.distrito (
    id_distrito integer NOT NULL,
    id_region integer NOT NULL,
    nombre character varying(150) NOT NULL,
    codigo character varying(20)
);


ALTER TABLE public.distrito OWNER TO postgres;

--
-- Name: distrito_id_distrito_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.distrito_id_distrito_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.distrito_id_distrito_seq OWNER TO postgres;

--
-- Name: distrito_id_distrito_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.distrito_id_distrito_seq OWNED BY public.distrito.id_distrito;


--
-- Name: equipo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipo (
    id_equipo integer NOT NULL,
    id_institucion integer NOT NULL,
    id_disciplina integer NOT NULL,
    id_usuario integer NOT NULL,
    nombre character varying(200) NOT NULL,
    colores character varying(100),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.equipo OWNER TO postgres;

--
-- Name: equipo_alumno; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipo_alumno (
    id_equipo_alumno integer NOT NULL,
    id_equipo integer NOT NULL,
    id_usuario integer NOT NULL
);


ALTER TABLE public.equipo_alumno OWNER TO postgres;

--
-- Name: equipo_alumno_id_equipo_alumno_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipo_alumno_id_equipo_alumno_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.equipo_alumno_id_equipo_alumno_seq OWNER TO postgres;

--
-- Name: equipo_alumno_id_equipo_alumno_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipo_alumno_id_equipo_alumno_seq OWNED BY public.equipo_alumno.id_equipo_alumno;


--
-- Name: equipo_id_equipo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipo_id_equipo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.equipo_id_equipo_seq OWNER TO postgres;

--
-- Name: equipo_id_equipo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipo_id_equipo_seq OWNED BY public.equipo.id_equipo;


--
-- Name: fecha_cancha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fecha_cancha (
    id_fecha_cancha integer NOT NULL,
    fecha date NOT NULL
);


ALTER TABLE public.fecha_cancha OWNER TO postgres;

--
-- Name: fecha_cancha_id_fecha_cancha_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fecha_cancha_id_fecha_cancha_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fecha_cancha_id_fecha_cancha_seq OWNER TO postgres;

--
-- Name: fecha_cancha_id_fecha_cancha_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fecha_cancha_id_fecha_cancha_seq OWNED BY public.fecha_cancha.id_fecha_cancha;


--
-- Name: fecha_horario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fecha_horario (
    fecha_horario timestamp without time zone NOT NULL,
    id_fecha_cancha integer NOT NULL,
    id_horario_cancha integer NOT NULL
);


ALTER TABLE public.fecha_horario OWNER TO postgres;

--
-- Name: horarios_cancha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.horarios_cancha (
    id_horario_cancha integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL
);


ALTER TABLE public.horarios_cancha OWNER TO postgres;

--
-- Name: horarios_cancha_id_horario_cancha_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.horarios_cancha_id_horario_cancha_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.horarios_cancha_id_horario_cancha_seq OWNER TO postgres;

--
-- Name: horarios_cancha_id_horario_cancha_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.horarios_cancha_id_horario_cancha_seq OWNED BY public.horarios_cancha.id_horario_cancha;


--
-- Name: imagenes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imagenes (
    id_serie integer NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    ruta_archivo character varying(500) NOT NULL,
    tipo character varying(50),
    fecha_subida timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.imagenes OWNER TO postgres;

--
-- Name: imagenes_id_serie_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.imagenes_id_serie_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.imagenes_id_serie_seq OWNER TO postgres;

--
-- Name: imagenes_id_serie_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.imagenes_id_serie_seq OWNED BY public.imagenes.id_serie;


--
-- Name: instancia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instancia (
    id_instancia integer NOT NULL,
    descripcion_instancia character varying(150) NOT NULL
);


ALTER TABLE public.instancia OWNER TO postgres;

--
-- Name: instancia_id_instancia_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.instancia_id_instancia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.instancia_id_instancia_seq OWNER TO postgres;

--
-- Name: instancia_id_instancia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.instancia_id_instancia_seq OWNED BY public.instancia.id_instancia;


--
-- Name: institucion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.institucion (
    id_institucion integer NOT NULL,
    id_distrito integer NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo character varying(50),
    direccion character varying(300),
    telefono character varying(30),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.institucion OWNER TO postgres;

--
-- Name: institucion_id_institucion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.institucion_id_institucion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.institucion_id_institucion_seq OWNER TO postgres;

--
-- Name: institucion_id_institucion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.institucion_id_institucion_seq OWNED BY public.institucion.id_institucion;


--
-- Name: partido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partido (
    id_partido integer NOT NULL,
    id_torneo integer NOT NULL,
    id_disponibilidad integer NOT NULL,
    id_equipo_local integer NOT NULL,
    id_equipo_visitante integer NOT NULL,
    goles_local integer DEFAULT 0,
    goles_visitante integer DEFAULT 0,
    estado character varying(20) DEFAULT 'Pendiente'::character varying,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.partido OWNER TO postgres;

--
-- Name: partido_id_partido_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partido_id_partido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.partido_id_partido_seq OWNER TO postgres;

--
-- Name: partido_id_partido_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partido_id_partido_seq OWNED BY public.partido.id_partido;


--
-- Name: posicion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posicion (
    id_posicion integer NOT NULL,
    id_equipo integer NOT NULL,
    id_torneo integer NOT NULL,
    pj integer DEFAULT 0,
    pg integer DEFAULT 0,
    pe integer DEFAULT 0,
    pp integer DEFAULT 0,
    gf integer DEFAULT 0,
    gc integer DEFAULT 0,
    puntos integer DEFAULT 0,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.posicion OWNER TO postgres;

--
-- Name: posicion_id_posicion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posicion_id_posicion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.posicion_id_posicion_seq OWNER TO postgres;

--
-- Name: posicion_id_posicion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posicion_id_posicion_seq OWNED BY public.posicion.id_posicion;


--
-- Name: region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.region (
    id_region integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text
);


ALTER TABLE public.region OWNER TO postgres;

--
-- Name: region_id_region_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.region_id_region_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.region_id_region_seq OWNER TO postgres;

--
-- Name: region_id_region_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.region_id_region_seq OWNED BY public.region.id_region;


--
-- Name: reglamento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reglamento (
    id_reglamento integer NOT NULL,
    id_disciplina integer NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    ruta_archivo character varying(500) NOT NULL,
    tipo character varying(50),
    fecha_subida timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reglamento OWNER TO postgres;

--
-- Name: reglamento_id_reglamento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reglamento_id_reglamento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reglamento_id_reglamento_seq OWNER TO postgres;

--
-- Name: reglamento_id_reglamento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reglamento_id_reglamento_seq OWNED BY public.reglamento.id_reglamento;


--
-- Name: rol; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol (
    id_rol integer NOT NULL,
    descripcion character varying(100) NOT NULL
);


ALTER TABLE public.rol OWNER TO postgres;

--
-- Name: rol_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rol_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rol_id_rol_seq OWNER TO postgres;

--
-- Name: rol_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rol_id_rol_seq OWNED BY public.rol.id_rol;


--
-- Name: staff_partido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_partido (
    id_partido_usuario integer NOT NULL,
    id_partido integer NOT NULL,
    id_usuario integer NOT NULL
);


ALTER TABLE public.staff_partido OWNER TO postgres;

--
-- Name: staff_partido_id_partido_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_partido_id_partido_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.staff_partido_id_partido_usuario_seq OWNER TO postgres;

--
-- Name: staff_partido_id_partido_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_partido_id_partido_usuario_seq OWNED BY public.staff_partido.id_partido_usuario;


--
-- Name: torneo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.torneo (
    id_torneo integer NOT NULL,
    id_disciplina integer NOT NULL,
    id_instancia integer NOT NULL,
    nombre character varying(200) NOT NULL,
    categoria character varying(100),
    fecha_inicio date NOT NULL,
    fecha_fin date,
    estado character varying(20) DEFAULT 'Activo'::character varying,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.torneo OWNER TO postgres;

--
-- Name: torneo_id_torneo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.torneo_id_torneo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.torneo_id_torneo_seq OWNER TO postgres;

--
-- Name: torneo_id_torneo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.torneo_id_torneo_seq OWNED BY public.torneo.id_torneo;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    id_rol integer NOT NULL,
    nombre character varying(200) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(200) NOT NULL,
    estado character varying(20) DEFAULT 'Activo'::character varying,
    ultimo_acceso timestamp without time zone,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- Name: usuario_institucion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_institucion (
    id_usuario_institucion integer NOT NULL,
    id_usuario integer NOT NULL,
    id_institucion integer NOT NULL
);


ALTER TABLE public.usuario_institucion OWNER TO postgres;

--
-- Name: usuario_institucion_id_usuario_institucion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_institucion_id_usuario_institucion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.usuario_institucion_id_usuario_institucion_seq OWNER TO postgres;

--
-- Name: usuario_institucion_id_usuario_institucion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_institucion_id_usuario_institucion_seq OWNED BY public.usuario_institucion.id_usuario_institucion;


--
-- Name: bitacora id_bitacora; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitacora ALTER COLUMN id_bitacora SET DEFAULT nextval('public.bitacora_id_bitacora_seq'::regclass);


--
-- Name: cancha id_cancha; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancha ALTER COLUMN id_cancha SET DEFAULT nextval('public.cancha_id_cancha_seq'::regclass);


--
-- Name: disciplina id_disciplina; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disciplina ALTER COLUMN id_disciplina SET DEFAULT nextval('public.disciplina_id_disciplina_seq'::regclass);


--
-- Name: disponibilidad_cancha id_disponibilidad; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidad_cancha ALTER COLUMN id_disponibilidad SET DEFAULT nextval('public.disponibilidad_cancha_id_disponibilidad_seq'::regclass);


--
-- Name: distrito id_distrito; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distrito ALTER COLUMN id_distrito SET DEFAULT nextval('public.distrito_id_distrito_seq'::regclass);


--
-- Name: equipo id_equipo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo ALTER COLUMN id_equipo SET DEFAULT nextval('public.equipo_id_equipo_seq'::regclass);


--
-- Name: equipo_alumno id_equipo_alumno; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo_alumno ALTER COLUMN id_equipo_alumno SET DEFAULT nextval('public.equipo_alumno_id_equipo_alumno_seq'::regclass);


--
-- Name: fecha_cancha id_fecha_cancha; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fecha_cancha ALTER COLUMN id_fecha_cancha SET DEFAULT nextval('public.fecha_cancha_id_fecha_cancha_seq'::regclass);


--
-- Name: horarios_cancha id_horario_cancha; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios_cancha ALTER COLUMN id_horario_cancha SET DEFAULT nextval('public.horarios_cancha_id_horario_cancha_seq'::regclass);


--
-- Name: imagenes id_serie; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagenes ALTER COLUMN id_serie SET DEFAULT nextval('public.imagenes_id_serie_seq'::regclass);


--
-- Name: instancia id_instancia; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instancia ALTER COLUMN id_instancia SET DEFAULT nextval('public.instancia_id_instancia_seq'::regclass);


--
-- Name: institucion id_institucion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institucion ALTER COLUMN id_institucion SET DEFAULT nextval('public.institucion_id_institucion_seq'::regclass);


--
-- Name: partido id_partido; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partido ALTER COLUMN id_partido SET DEFAULT nextval('public.partido_id_partido_seq'::regclass);


--
-- Name: posicion id_posicion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posicion ALTER COLUMN id_posicion SET DEFAULT nextval('public.posicion_id_posicion_seq'::regclass);


--
-- Name: region id_region; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region ALTER COLUMN id_region SET DEFAULT nextval('public.region_id_region_seq'::regclass);


--
-- Name: reglamento id_reglamento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reglamento ALTER COLUMN id_reglamento SET DEFAULT nextval('public.reglamento_id_reglamento_seq'::regclass);


--
-- Name: rol id_rol; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol ALTER COLUMN id_rol SET DEFAULT nextval('public.rol_id_rol_seq'::regclass);


--
-- Name: staff_partido id_partido_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_partido ALTER COLUMN id_partido_usuario SET DEFAULT nextval('public.staff_partido_id_partido_usuario_seq'::regclass);


--
-- Name: torneo id_torneo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.torneo ALTER COLUMN id_torneo SET DEFAULT nextval('public.torneo_id_torneo_seq'::regclass);


--
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- Name: usuario_institucion id_usuario_institucion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_institucion ALTER COLUMN id_usuario_institucion SET DEFAULT nextval('public.usuario_institucion_id_usuario_institucion_seq'::regclass);


--
-- Data for Name: bitacora; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bitacora (id_bitacora, id_usuario, fecha_hora, tipo_accion, ip_address, user_agent, resultado, detalle) FROM stdin;
\.


--
-- Data for Name: cancha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cancha (id_cancha, id_distrito, id_disciplina, nombre, ubicacion, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: disciplina; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disciplina (id_disciplina, nombre, reglamento, jugadores_por_equipo, descripcion) FROM stdin;
1	Fútbol	\N	11	Fútbol 11
2	Futsal	\N	5	Futsal de salón
3	Voleibol	\N	6	Voleibol de cancha
4	Baloncesto	\N	5	Baloncesto
\.


--
-- Data for Name: disponibilidad_cancha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disponibilidad_cancha (id_disponibilidad, fecha_horario, id_cancha) FROM stdin;
\.


--
-- Data for Name: distrito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.distrito (id_distrito, id_region, nombre, codigo) FROM stdin;
1	1	Distrito Central	DC-001
\.


--
-- Data for Name: equipo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipo (id_equipo, id_institucion, id_disciplina, id_usuario, nombre, colores, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: equipo_alumno; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipo_alumno (id_equipo_alumno, id_equipo, id_usuario) FROM stdin;
\.


--
-- Data for Name: fecha_cancha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fecha_cancha (id_fecha_cancha, fecha) FROM stdin;
\.


--
-- Data for Name: fecha_horario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fecha_horario (fecha_horario, id_fecha_cancha, id_horario_cancha) FROM stdin;
\.


--
-- Data for Name: horarios_cancha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.horarios_cancha (id_horario_cancha, hora_inicio, hora_fin) FROM stdin;
1	08:00:00	09:00:00
2	09:00:00	10:00:00
3	10:00:00	11:00:00
4	11:00:00	12:00:00
5	14:00:00	15:00:00
6	15:00:00	16:00:00
7	16:00:00	17:00:00
\.


--
-- Data for Name: imagenes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.imagenes (id_serie, nombre_archivo, ruta_archivo, tipo, fecha_subida) FROM stdin;
\.


--
-- Data for Name: instancia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.instancia (id_instancia, descripcion_instancia) FROM stdin;
1	Fase de Grupos
2	Octavos de Final
3	Cuartos de Final
4	Semifinal
5	Final
\.


--
-- Data for Name: institucion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.institucion (id_institucion, id_distrito, nombre, tipo, direccion, telefono, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: partido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partido (id_partido, id_torneo, id_disponibilidad, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, estado, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: posicion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posicion (id_posicion, id_equipo, id_torneo, pj, pg, pe, pp, gf, gc, puntos, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region (id_region, nombre, descripcion) FROM stdin;
1	Región Central	Región central del área metropolitana
\.


--
-- Data for Name: reglamento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reglamento (id_reglamento, id_disciplina, nombre_archivo, ruta_archivo, tipo, fecha_subida) FROM stdin;
\.


--
-- Data for Name: rol; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rol (id_rol, descripcion) FROM stdin;
1	Administrador
2	Entrenador
3	Alumno
\.


--
-- Data for Name: staff_partido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_partido (id_partido_usuario, id_partido, id_usuario) FROM stdin;
\.


--
-- Data for Name: torneo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.torneo (id_torneo, id_disciplina, id_instancia, nombre, categoria, fecha_inicio, fecha_fin, estado, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario (id_usuario, id_rol, nombre, password_hash, email, estado, ultimo_acceso, creado_en, actualizado_en) FROM stdin;
1	1	Admin JEBO	$2a$12$jOpq6gp/lucUlt9uzUrrQedrfmlkijoM4zJgInnr1BQWyXePT3v0m	admin@jebo2026.com	Activo	2026-06-05 10:36:54.270104	2026-06-03 12:06:39.36979	2026-06-03 12:06:39.36979
\.


--
-- Data for Name: usuario_institucion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario_institucion (id_usuario_institucion, id_usuario, id_institucion) FROM stdin;
\.


--
-- Name: bitacora_id_bitacora_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bitacora_id_bitacora_seq', 1, false);


--
-- Name: cancha_id_cancha_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cancha_id_cancha_seq', 1, false);


--
-- Name: disciplina_id_disciplina_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disciplina_id_disciplina_seq', 4, true);


--
-- Name: disponibilidad_cancha_id_disponibilidad_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disponibilidad_cancha_id_disponibilidad_seq', 1, false);


--
-- Name: distrito_id_distrito_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.distrito_id_distrito_seq', 1, true);


--
-- Name: equipo_alumno_id_equipo_alumno_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipo_alumno_id_equipo_alumno_seq', 1, false);


--
-- Name: equipo_id_equipo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipo_id_equipo_seq', 1, false);


--
-- Name: fecha_cancha_id_fecha_cancha_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fecha_cancha_id_fecha_cancha_seq', 1, false);


--
-- Name: horarios_cancha_id_horario_cancha_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.horarios_cancha_id_horario_cancha_seq', 7, true);


--
-- Name: imagenes_id_serie_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.imagenes_id_serie_seq', 1, false);


--
-- Name: instancia_id_instancia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.instancia_id_instancia_seq', 5, true);


--
-- Name: institucion_id_institucion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institucion_id_institucion_seq', 1, false);


--
-- Name: partido_id_partido_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partido_id_partido_seq', 1, false);


--
-- Name: posicion_id_posicion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posicion_id_posicion_seq', 1, false);


--
-- Name: region_id_region_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.region_id_region_seq', 1, true);


--
-- Name: reglamento_id_reglamento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reglamento_id_reglamento_seq', 1, false);


--
-- Name: rol_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rol_id_rol_seq', 3, true);


--
-- Name: staff_partido_id_partido_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_partido_id_partido_usuario_seq', 1, false);


--
-- Name: torneo_id_torneo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.torneo_id_torneo_seq', 1, false);


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_id_usuario_seq', 1, true);


--
-- Name: usuario_institucion_id_usuario_institucion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_institucion_id_usuario_institucion_seq', 1, false);


--
-- Name: bitacora bitacora_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitacora
    ADD CONSTRAINT bitacora_pkey PRIMARY KEY (id_bitacora);


--
-- Name: cancha cancha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancha
    ADD CONSTRAINT cancha_pkey PRIMARY KEY (id_cancha);


--
-- Name: disciplina disciplina_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disciplina
    ADD CONSTRAINT disciplina_pkey PRIMARY KEY (id_disciplina);


--
-- Name: disponibilidad_cancha disponibilidad_cancha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidad_cancha
    ADD CONSTRAINT disponibilidad_cancha_pkey PRIMARY KEY (id_disponibilidad);


--
-- Name: distrito distrito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distrito
    ADD CONSTRAINT distrito_pkey PRIMARY KEY (id_distrito);


--
-- Name: equipo_alumno equipo_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo_alumno
    ADD CONSTRAINT equipo_alumno_pkey PRIMARY KEY (id_equipo_alumno);


--
-- Name: equipo equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo
    ADD CONSTRAINT equipo_pkey PRIMARY KEY (id_equipo);


--
-- Name: fecha_cancha fecha_cancha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fecha_cancha
    ADD CONSTRAINT fecha_cancha_pkey PRIMARY KEY (id_fecha_cancha);


--
-- Name: fecha_horario fecha_horario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fecha_horario
    ADD CONSTRAINT fecha_horario_pkey PRIMARY KEY (fecha_horario);


--
-- Name: horarios_cancha horarios_cancha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios_cancha
    ADD CONSTRAINT horarios_cancha_pkey PRIMARY KEY (id_horario_cancha);


--
-- Name: imagenes imagenes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagenes
    ADD CONSTRAINT imagenes_pkey PRIMARY KEY (id_serie);


--
-- Name: instancia instancia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instancia
    ADD CONSTRAINT instancia_pkey PRIMARY KEY (id_instancia);


--
-- Name: institucion institucion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institucion
    ADD CONSTRAINT institucion_pkey PRIMARY KEY (id_institucion);


--
-- Name: partido partido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_pkey PRIMARY KEY (id_partido);


--
-- Name: posicion posicion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posicion
    ADD CONSTRAINT posicion_pkey PRIMARY KEY (id_posicion);


--
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (id_region);


--
-- Name: reglamento reglamento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reglamento
    ADD CONSTRAINT reglamento_pkey PRIMARY KEY (id_reglamento);


--
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);


--
-- Name: staff_partido staff_partido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_partido
    ADD CONSTRAINT staff_partido_pkey PRIMARY KEY (id_partido_usuario);


--
-- Name: torneo torneo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.torneo
    ADD CONSTRAINT torneo_pkey PRIMARY KEY (id_torneo);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario_institucion usuario_institucion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_institucion
    ADD CONSTRAINT usuario_institucion_pkey PRIMARY KEY (id_usuario_institucion);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- Name: bitacora bitacora_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitacora
    ADD CONSTRAINT bitacora_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: cancha cancha_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancha
    ADD CONSTRAINT cancha_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);


--
-- Name: cancha cancha_id_distrito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancha
    ADD CONSTRAINT cancha_id_distrito_fkey FOREIGN KEY (id_distrito) REFERENCES public.distrito(id_distrito);


--
-- Name: disponibilidad_cancha disponibilidad_cancha_fecha_horario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidad_cancha
    ADD CONSTRAINT disponibilidad_cancha_fecha_horario_fkey FOREIGN KEY (fecha_horario) REFERENCES public.fecha_horario(fecha_horario);


--
-- Name: disponibilidad_cancha disponibilidad_cancha_id_cancha_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidad_cancha
    ADD CONSTRAINT disponibilidad_cancha_id_cancha_fkey FOREIGN KEY (id_cancha) REFERENCES public.cancha(id_cancha);


--
-- Name: distrito distrito_id_region_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distrito
    ADD CONSTRAINT distrito_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.region(id_region);


--
-- Name: equipo_alumno equipo_alumno_id_equipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo_alumno
    ADD CONSTRAINT equipo_alumno_id_equipo_fkey FOREIGN KEY (id_equipo) REFERENCES public.equipo(id_equipo);


--
-- Name: equipo_alumno equipo_alumno_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo_alumno
    ADD CONSTRAINT equipo_alumno_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: equipo equipo_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo
    ADD CONSTRAINT equipo_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);


--
-- Name: equipo equipo_id_institucion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo
    ADD CONSTRAINT equipo_id_institucion_fkey FOREIGN KEY (id_institucion) REFERENCES public.institucion(id_institucion);


--
-- Name: equipo equipo_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipo
    ADD CONSTRAINT equipo_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: fecha_horario fecha_horario_id_fecha_cancha_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fecha_horario
    ADD CONSTRAINT fecha_horario_id_fecha_cancha_fkey FOREIGN KEY (id_fecha_cancha) REFERENCES public.fecha_cancha(id_fecha_cancha);


--
-- Name: fecha_horario fecha_horario_id_horario_cancha_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fecha_horario
    ADD CONSTRAINT fecha_horario_id_horario_cancha_fkey FOREIGN KEY (id_horario_cancha) REFERENCES public.horarios_cancha(id_horario_cancha);


--
-- Name: institucion institucion_id_distrito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institucion
    ADD CONSTRAINT institucion_id_distrito_fkey FOREIGN KEY (id_distrito) REFERENCES public.distrito(id_distrito);


--
-- Name: partido partido_id_disponibilidad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_id_disponibilidad_fkey FOREIGN KEY (id_disponibilidad) REFERENCES public.disponibilidad_cancha(id_disponibilidad);


--
-- Name: partido partido_id_equipo_local_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_id_equipo_local_fkey FOREIGN KEY (id_equipo_local) REFERENCES public.equipo(id_equipo);


--
-- Name: partido partido_id_equipo_visitante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_id_equipo_visitante_fkey FOREIGN KEY (id_equipo_visitante) REFERENCES public.equipo(id_equipo);


--
-- Name: partido partido_id_torneo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_id_torneo_fkey FOREIGN KEY (id_torneo) REFERENCES public.torneo(id_torneo);


--
-- Name: posicion posicion_id_equipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posicion
    ADD CONSTRAINT posicion_id_equipo_fkey FOREIGN KEY (id_equipo) REFERENCES public.equipo(id_equipo);


--
-- Name: posicion posicion_id_torneo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posicion
    ADD CONSTRAINT posicion_id_torneo_fkey FOREIGN KEY (id_torneo) REFERENCES public.torneo(id_torneo);


--
-- Name: reglamento reglamento_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reglamento
    ADD CONSTRAINT reglamento_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);


--
-- Name: staff_partido staff_partido_id_partido_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_partido
    ADD CONSTRAINT staff_partido_id_partido_fkey FOREIGN KEY (id_partido) REFERENCES public.partido(id_partido);


--
-- Name: staff_partido staff_partido_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_partido
    ADD CONSTRAINT staff_partido_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: torneo torneo_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.torneo
    ADD CONSTRAINT torneo_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);


--
-- Name: torneo torneo_id_instancia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.torneo
    ADD CONSTRAINT torneo_id_instancia_fkey FOREIGN KEY (id_instancia) REFERENCES public.instancia(id_instancia);


--
-- Name: usuario usuario_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol);


--
-- Name: usuario_institucion usuario_institucion_id_institucion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_institucion
    ADD CONSTRAINT usuario_institucion_id_institucion_fkey FOREIGN KEY (id_institucion) REFERENCES public.institucion(id_institucion);


--
-- Name: usuario_institucion usuario_institucion_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_institucion
    ADD CONSTRAINT usuario_institucion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- PostgreSQL database dump complete
--

\unrestrict Et8JTgtMsmo6Yejbiho7wjrxjFSw80SOw2ZPRXzwnelaHZ9iI2UqEQLg0Ra0dpZ


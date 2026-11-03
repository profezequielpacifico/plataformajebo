could not change directory to "/home/oem": Permiso denegado
--
-- PostgreSQL database dump
--

\restrict r0dSQiluOdVSDQ79EHiv8N7fTx2laMtJCajOVT1ah9N9zoLb8x0DArZfqtwmhpm

-- Dumped from database version 14.23 (Ubuntu 14.23-1.pgdg22.04+1)
-- Dumped by pg_dump version 14.23 (Ubuntu 14.23-1.pgdg22.04+1)

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
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    descripcion text,
    reglamento character varying(500)
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
1	1	2026-06-10 11:32:38.380877	INICIO_SESION	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
2	1	2026-06-10 11:32:44.259006	INICIO_SESION	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
3	1	2026-06-10 11:32:55.766796	INICIO_SESION	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
4	1	2026-06-10 11:33:02.54258	INICIO_SESION	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
5	9	2026-06-10 11:33:40.464228	REGISTRO_USUARIO	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
6	10	2026-06-10 11:33:44.16489	REGISTRO_USUARIO	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
7	1	2026-06-10 11:33:55.474723	INTENTO_FALLIDO	::ffff:127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
8	1	2026-06-10 11:33:55.717729	INTENTO_FALLIDO	::ffff:127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
9	1	2026-06-10 11:33:55.961412	INTENTO_FALLIDO	::ffff:127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
10	1	2026-06-10 11:33:56.203106	INTENTO_FALLIDO	::ffff:127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
11	1	2026-06-10 11:33:56.443228	INTENTO_FALLIDO	::ffff:127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
12	1	2026-06-10 11:50:05.174346	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
13	1	2026-06-10 11:53:03.801363	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
14	\N	2026-06-10 11:56:06.819728	CREAR_EQUIPO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
15	\N	2026-06-10 11:56:21.613056	CREAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
16	\N	2026-06-10 11:57:28.984463	CREAR_REGION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
17	11	2026-06-10 11:58:08.308001	REGISTRO_USUARIO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
18	11	2026-06-10 11:59:06.847323	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
19	11	2026-06-10 12:06:26.961585	INTENTO_FALLIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	fallido	{"entity":"Usuario","entityId":11,"motivo":"Contraseña incorrecta"}
20	1	2026-06-10 12:06:40.005449	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
21	\N	2026-06-10 12:06:53.199366	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
22	1	2026-06-10 12:13:42.002119	INICIO_SESION	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
23	1	2026-06-10 12:17:18.774135	INICIO_SESION	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
24	1	2026-06-10 12:17:51.922102	INICIO_SESION	::ffff:127.0.0.1	curl/7.81.0	exitoso	\N
25	5	2026-06-10 13:56:37.406219	INTENTO_FALLIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	fallido	{"entity":"Usuario","entityId":5,"motivo":"Contraseña incorrecta"}
26	5	2026-06-10 13:56:38.841896	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
27	1	2026-06-10 14:00:35.088249	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
28	1	2026-06-10 14:02:24.001262	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
29	\N	2026-06-10 14:07:12.491144	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
30	1	2026-06-10 14:08:49.44899	INTENTO_FALLIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
31	1	2026-06-10 14:08:55.383025	INTENTO_FALLIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
32	1	2026-06-10 14:08:57.11286	INTENTO_FALLIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
33	1	2026-06-10 14:37:14.128215	INTENTO_FALLIDO	::ffff:127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
34	1	2026-06-10 14:42:54.536214	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
35	1	2026-06-10 14:47:57.813382	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
36	1	2026-06-10 14:52:32.694395	INTENTO_FALLIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
37	1	2026-06-10 14:55:38.557028	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
38	\N	2026-06-10 14:58:42.199289	CREAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
39	\N	2026-06-10 14:58:54.294906	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
40	\N	2026-06-10 14:58:56.355756	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
41	\N	2026-06-10 14:58:59.764363	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
42	\N	2026-06-10 14:59:02.044431	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
43	\N	2026-06-10 14:59:04.464856	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
44	\N	2026-06-10 14:59:06.357373	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
45	\N	2026-06-10 14:59:08.784032	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
46	\N	2026-06-10 14:59:11.169135	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
47	\N	2026-06-10 14:59:13.394678	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
48	\N	2026-06-10 14:59:15.509989	ELIMINAR_PARTIDO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
49	1	2026-06-10 15:19:40.641476	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
50	\N	2026-06-10 16:11:35.757442	CREAR_TORNEO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
51	\N	2026-06-10 16:18:31.289521	CREAR_TORNEO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
52	\N	2026-06-10 16:32:04.66758	CREAR_TORNEO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
53	1	2026-06-10 17:42:39.780092	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0	exitoso	\N
54	1	2026-06-10 18:09:01.567759	INTENTO_FALLIDO	::ffff:127.0.0.1	Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
55	1	2026-06-10 18:09:12.298031	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36	exitoso	\N
56	1	2026-06-10 18:13:07.841929	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
57	1	2026-06-10 19:19:47.949225	INICIO_SESION	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
58	1	2026-06-10 19:31:48.61857	INICIO_SESION	127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0	exitoso	\N
59	1	2026-06-10 19:33:36.856534	INICIO_SESION	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
60	\N	2026-06-10 19:36:36.925086	CREAR_EQUIPO	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
61	1	2026-06-10 19:44:33.810047	INICIO_SESION	127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/424.3.924152415 Mobile/15E148 Safari/604.1	exitoso	\N
62	1	2026-06-10 19:48:33.063682	INTENTO_FALLIDO	127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/424.3.924152415 Mobile/15E148 Safari/604.1	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
63	1	2026-06-10 19:48:44.922653	INICIO_SESION	127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/424.3.924152415 Mobile/15E148 Safari/604.1	exitoso	\N
64	\N	2026-06-10 19:52:20.665198	CREAR_PARTIDO	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	exitoso	\N
65	1	2026-06-10 19:53:17.047792	INICIO_SESION	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	exitoso	\N
66	1	2026-06-10 20:20:29.370717	INICIO_SESION	127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0	exitoso	\N
67	\N	2026-06-10 20:24:30.246621	ELIMINAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0	exitoso	\N
68	\N	2026-06-10 20:24:31.91848	ELIMINAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0	exitoso	\N
69	\N	2026-06-10 20:24:33.55697	ELIMINAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0	exitoso	\N
70	\N	2026-06-10 20:24:35.186201	ELIMINAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0	exitoso	\N
71	1	2026-06-10 20:38:43.60187	INICIO_SESION	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
72	\N	2026-06-10 20:40:27.160869	ELIMINAR_PARTIDO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
73	1	2026-06-11 11:18:55.434518	INTENTO_FALLIDO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	fallido	{"entity":"Usuario","entityId":1,"motivo":"Contraseña incorrecta"}
74	1	2026-06-11 11:18:59.975584	INICIO_SESION	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
75	\N	2026-06-11 15:35:50.643143	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
76	\N	2026-06-11 15:39:23.089951	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
77	11	2026-06-11 15:54:32.944333	INTENTO_FALLIDO	127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":11,"motivo":"Contraseña incorrecta"}
78	11	2026-06-11 15:54:36.392981	INTENTO_FALLIDO	127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":11,"motivo":"Contraseña incorrecta"}
79	2	2026-06-11 15:54:39.636928	INTENTO_FALLIDO	127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":2,"motivo":"Contraseña incorrecta"}
80	2	2026-06-11 15:54:48.339871	INTENTO_FALLIDO	127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":2,"motivo":"Contraseña incorrecta"}
81	2	2026-06-11 15:54:48.594384	INTENTO_FALLIDO	127.0.0.1	curl/7.81.0	fallido	{"entity":"Usuario","entityId":2,"motivo":"Contraseña incorrecta"}
82	\N	2026-06-11 15:54:52.52909	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
83	\N	2026-06-11 15:59:13.19666	ACTUALIZAR_TORNEO	127.0.0.1	curl/7.81.0	exitoso	\N
84	\N	2026-06-11 16:00:34.922587	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
85	\N	2026-06-11 16:09:28.85772	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
86	\N	2026-06-11 16:09:28.87243	SUBIR_REGLAMENTO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
87	\N	2026-06-11 16:09:43.302375	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
88	\N	2026-06-11 16:11:42.939723	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
89	\N	2026-06-11 16:12:53.523007	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
90	\N	2026-06-11 16:12:53.535948	SUBIR_REGLAMENTO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
91	\N	2026-06-11 16:14:02.966707	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
92	\N	2026-06-11 16:21:04.616958	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
93	\N	2026-06-11 16:30:41.507972	CREAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
94	\N	2026-06-11 16:30:55.792834	CREAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
95	\N	2026-06-11 16:33:23.986275	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
96	\N	2026-06-11 16:35:23.341901	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
97	\N	2026-06-11 16:36:28.485517	ACTUALIZAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
98	\N	2026-06-11 16:45:18.263375	CREAR_EQUIPO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
99	\N	2026-06-11 16:50:00.73748	CREAR_TORNEO	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
100	1	2026-06-12 10:17:21.48136	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
101	\N	2026-06-12 10:18:49.560588	CREAR_USUARIO	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
102	12	2026-06-12 10:19:28.511284	INICIO_SESION	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	exitoso	\N
\.


--
-- Data for Name: cancha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cancha (id_cancha, id_distrito, id_disciplina, nombre, ubicacion, creado_en, actualizado_en) FROM stdin;
1	1	1	Estadio Central	Av. Principal 123	2026-06-10 10:30:50.895342	2026-06-10 10:30:50.895342
2	2	2	Cancha Norte de Futsal	Calle 5 N° 456	2026-06-10 10:30:50.897316	2026-06-10 10:30:50.897316
3	3	3	Gimnasio Sur	Av. Deportiva 789	2026-06-10 10:30:50.898477	2026-06-10 10:30:50.898477
4	4	4	Polideportivo Este	Ruta 8 Km 10	2026-06-10 10:30:50.901381	2026-06-10 10:30:50.901381
5	5	1	Cancha Oeste	Calle 12 N° 345	2026-06-10 10:30:50.903363	2026-06-10 10:30:50.903363
6	6	1	Estadio Metropolitano	Av. Libertador 567	2026-06-10 10:30:50.904995	2026-06-10 10:30:50.904995
7	7	3	Gimnasio del Valle	Ruta 5 Km 20	2026-06-10 10:30:50.906884	2026-06-10 10:30:50.906884
8	1	2	Cancha de Futsal Central	Calle Deportes 100	2026-06-10 10:30:50.908408	2026-06-10 10:30:50.908408
\.


--
-- Data for Name: disciplina; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disciplina (id_disciplina, nombre, reglamento, jugadores_por_equipo, descripcion) FROM stdin;
1	Fútbol	\N	11	Fútbol 11
2	Futsal	\N	5	Futsal de salón
3	Voleibol	\N	6	Voleibol de cancha
4	Baloncesto	\N	5	Baloncesto
6	pub	\N	2	ad
7	asdasdas	\N	12	asd
8	asdasdas2312312	\N	123	1
\.


--
-- Data for Name: disponibilidad_cancha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disponibilidad_cancha (id_disponibilidad, fecha_horario, id_cancha) FROM stdin;
1	2026-01-20 15:00:00	1
2	2026-01-22 17:00:00	2
3	2026-01-25 16:00:00	3
4	2026-02-05 15:00:00	4
5	2026-02-10 17:00:00	5
6	2026-02-15 16:00:00	6
7	2026-02-20 15:00:00	7
8	2026-03-01 17:00:00	8
9	2026-03-10 16:00:00	1
10	2026-03-15 15:00:00	2
11	2026-07-15 09:00:00	1
12	2026-06-11 09:00:00	1
\.


--
-- Data for Name: distrito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.distrito (id_distrito, id_region, nombre, codigo) FROM stdin;
1	1	Distrito Central	DC-001
2	3	Distrito Norte	DNO-001
3	4	Distrito Sur	DSU-001
4	5	Distrito Este	DES-001
5	6	Distrito Oeste	DOE-001
6	2	Distrito Metropolitano Sur	DMS-001
7	3	Distrito Valle Norte	DVN-001
\.


--
-- Data for Name: equipo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipo (id_equipo, id_institucion, id_disciplina, id_usuario, nombre, colores, creado_en, actualizado_en) FROM stdin;
2	1	1	1	Club Atlético Central	Azul y Blanco	2026-06-10 10:31:08.842825	2026-06-10 10:31:08.842825
3	2	1	2	Leones del Norte	Rojo y Negro	2026-06-10 10:31:08.846117	2026-06-10 10:31:08.846117
4	3	2	4	Halcones del Sur	Verde y Blanco	2026-06-10 10:31:08.847991	2026-06-10 10:31:08.847991
5	4	4	6	Águilas del Este	Amarillo y Negro	2026-06-10 10:31:08.849733	2026-06-10 10:31:08.849733
6	5	3	8	Tiburones del Oeste	Celeste y Blanco	2026-06-10 10:31:08.851387	2026-06-10 10:31:08.851387
7	6	1	1	Deportivo Metropolitano	Naranja y Negro	2026-06-10 10:31:08.852759	2026-06-10 10:31:08.852759
8	7	3	2	Club del Valle	Violeta y Blanco	2026-06-10 10:31:08.853947	2026-06-10 10:31:08.853947
9	8	2	4	Futsal Stars	Azul y Oro	2026-06-10 10:31:08.854877	2026-06-10 10:31:08.854877
10	9	4	6	Baloncesto Técnico	Gris y Rojo	2026-06-10 10:31:08.855946	2026-06-10 10:31:08.855946
11	10	2	8	Deportivo Sur	Blanco y Negro	2026-06-10 10:31:08.85693	2026-06-10 10:31:08.85693
13	1	1	1	Equipo de Prueba	\N	2026-06-10 11:56:06.790641	2026-06-10 11:56:06.790641
14	6	1	1	Club	\N	2026-06-10 19:36:36.895304	2026-06-10 19:36:36.895304
15	10	4	1	asdad	\N	2026-06-11 16:45:18.259966	2026-06-11 16:45:18.259966
\.


--
-- Data for Name: equipo_alumno; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipo_alumno (id_equipo_alumno, id_equipo, id_usuario) FROM stdin;
1	2	3
2	2	5
3	4	7
\.


--
-- Data for Name: fecha_cancha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fecha_cancha (id_fecha_cancha, fecha) FROM stdin;
1	2026-01-20
2	2026-01-22
3	2026-01-25
4	2026-02-05
5	2026-02-10
6	2026-02-15
7	2026-02-20
8	2026-03-01
9	2026-03-10
10	2026-03-15
11	2026-07-15
12	2026-06-11
\.


--
-- Data for Name: fecha_horario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fecha_horario (fecha_horario, id_fecha_cancha, id_horario_cancha) FROM stdin;
2026-01-20 15:00:00	1	2
2026-01-22 17:00:00	2	4
2026-01-25 16:00:00	3	3
2026-02-05 15:00:00	4	2
2026-02-10 17:00:00	5	4
2026-02-15 16:00:00	6	3
2026-02-20 15:00:00	7	2
2026-03-01 17:00:00	8	4
2026-03-10 16:00:00	9	3
2026-03-15 15:00:00	10	2
2026-07-15 09:00:00	11	1
2026-06-11 09:00:00	12	1
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
1	1	Colegio Nacional Central	Público	Av. Principal 123	\N	2026-06-10 10:30:50.880189	2026-06-10 10:30:50.880189
2	2	Instituto Técnico Norte	Público	Calle 5 N° 456	\N	2026-06-10 10:30:50.88221	2026-06-10 10:30:50.88221
3	3	Escuela Deportiva Sur	Privado	Av. Deportiva 789	\N	2026-06-10 10:30:50.88382	2026-06-10 10:30:50.88382
4	4	Academia Olímpica Este	Privado	Ruta 8 Km 10	\N	2026-06-10 10:30:50.885144	2026-06-10 10:30:50.885144
5	5	Centro Educativo Oeste	Público	Calle 12 N° 345	\N	2026-06-10 10:30:50.886394	2026-06-10 10:30:50.886394
6	6	Liceo Metropolitano	Público	Av. Libertador 567	\N	2026-06-10 10:30:50.887767	2026-06-10 10:30:50.887767
7	7	Colegio del Valle	Privado	Ruta 5 Km 20	\N	2026-06-10 10:30:50.889529	2026-06-10 10:30:50.889529
8	1	Instituto Superior del Deporte	Privado	Calle Deportes 100	\N	2026-06-10 10:30:50.890784	2026-06-10 10:30:50.890784
9	2	Escuela Técnica Regional	Público	Av. Industrial 200	\N	2026-06-10 10:30:50.891757	2026-06-10 10:30:50.891757
10	3	Colegio del Sur	Privado	Calle 3 N° 789	\N	2026-06-10 10:30:50.892796	2026-06-10 10:30:50.892796
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
1	2	1	6	5	1	0	15	3	16	2026-06-10 10:31:08.874672	2026-06-10 10:31:08.874672
2	3	1	6	4	1	1	12	5	13	2026-06-10 10:31:08.878215	2026-06-10 10:31:08.878215
3	7	1	6	3	2	1	8	6	11	2026-06-10 10:31:08.880322	2026-06-10 10:31:08.880322
4	8	1	6	2	1	3	7	10	7	2026-06-10 10:31:08.881783	2026-06-10 10:31:08.881783
5	4	2	5	4	0	1	20	8	12	2026-06-10 10:31:08.883311	2026-06-10 10:31:08.883311
6	9	2	5	3	1	1	15	10	10	2026-06-10 10:31:08.884903	2026-06-10 10:31:08.884903
7	11	2	5	2	1	2	12	14	7	2026-06-10 10:31:08.886426	2026-06-10 10:31:08.886426
8	6	2	5	1	0	4	6	18	3	2026-06-10 10:31:08.888022	2026-06-10 10:31:08.888022
9	6	3	4	3	1	0	12	4	10	2026-06-10 10:31:08.889284	2026-06-10 10:31:08.889284
10	8	3	4	3	0	1	10	6	9	2026-06-10 10:31:08.89092	2026-06-10 10:31:08.89092
11	5	3	4	1	1	2	6	9	4	2026-06-10 10:31:08.892497	2026-06-10 10:31:08.892497
12	5	4	3	3	0	0	24	12	9	2026-06-10 10:31:08.893941	2026-06-10 10:31:08.893941
13	10	4	3	1	1	1	18	20	4	2026-06-10 10:31:08.895147	2026-06-10 10:31:08.895147
14	4	4	3	0	1	2	14	22	1	2026-06-10 10:31:08.896653	2026-06-10 10:31:08.896653
\.


--
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region (id_region, nombre, descripcion) FROM stdin;
1	Región Central	Región central del área metropolitana
2	Región Metropolitana	Área metropolitana y alrededores
3	Región Norte	Zona norte del país
4	Región Sur	Zona sur del país
5	Región Este	Zona este del país
6	Región Oeste	Zona oeste del país
7	Región de prueba	Región creada durante testing
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
5	Editor
\.


--
-- Data for Name: staff_partido; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_partido (id_partido_usuario, id_partido, id_usuario) FROM stdin;
\.


--
-- Data for Name: torneo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.torneo (id_torneo, id_disciplina, id_instancia, nombre, categoria, fecha_inicio, fecha_fin, estado, creado_en, actualizado_en, descripcion, reglamento) FROM stdin;
4	4	1	Campeonato de Baloncesto	Sub-17	2026-02-15	2026-05-01	Finalizado	2026-06-10 10:31:08.868298	2026-06-10 10:31:08.868298	Hola soy prueva	uploads/torneos/reglamento_4_1781205173530.docx
9	1	1	asda	2026	2026-06-11	\N	En Progreso	2026-06-11 16:30:41.504193	2026-06-11 16:30:41.504193	\N	\N
10	4	2	asd	2026	2026-06-11	\N	En Progreso	2026-06-11 16:30:55.789903	2026-06-11 16:30:55.789903	\N	\N
3	3	1	Liga Escolar de Voleibol	Sub-15	2026-03-01	2026-06-30	En Progreso	2026-06-10 10:31:08.865693	2026-06-10 10:31:08.865693	\N	\N
2	2	1	Torneo Apertura Futsal	Sub-18	2026-02-01	2026-05-30	Finalizado	2026-06-10 10:31:08.863013	2026-06-10 10:31:08.863013	\N	\N
1	1	1	Copa Verano 2026	Sub-16	2026-01-15	2026-04-30	Finalizado	2026-06-10 10:31:08.859422	2026-06-10 10:31:08.859422	\N	\N
11	8	1	dasdas	2026	2026-06-27	2026-07-25	Programado	2026-06-11 16:50:00.731845	2026-06-11 16:50:00.731845	\N	\N
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario (id_usuario, id_rol, nombre, password_hash, email, estado, ultimo_acceso, creado_en, actualizado_en) FROM stdin;
1	1	Admin JEBO	$2a$12$55y5QCZXWaR5r2myMa6hcuJkgPdK.hbBz/LhS0EhWj/P61OVSYejS	admin@jebo2026.com	Activo	2026-06-12 10:17:21.476077	2026-06-03 12:06:39.36979	2026-06-03 12:06:39.36979
11	1	Usuario Test	$2a$12$8CK2l6HlkZ/qDKenE2x.h.MwC6wSjJKS5/3MV17ZnWyOBLESXeXZq	usuario.test@test.com	Activo	2026-06-10 11:59:06.842238	2026-06-10 11:58:08.303517	2026-06-10 11:58:08.303517
12	1	Liparelli	$2a$12$OcwZpirK0GD0zeXKtdFol.lBdcHFuoOZFDSRBzdsoYfNnaJlUIlQK	liparelli@jebo2026.com	Activo	2026-06-12 10:19:28.506364	2026-06-12 10:18:49.555975	2026-06-12 10:18:49.555975
5	5	Ana García	$2a$12$lPzSAJm3xyhHGXZPEwjD8es9n.sQCH4BhTSf8jfhTR0098jbZT8Ey	ana@jebo2026.com	Activo	2026-06-10 13:56:38.8374	2026-06-10 10:30:51.165797	2026-06-10 10:30:51.165797
2	5	Carlos Méndez	$2a$12$zLUS2ItaPOv5ILeCm6UFne9IWPgmxgYPgUDjvUYMpLXOGO.BHwTMC	carlos@jebo2026.com	Activo	\N	2026-06-10 10:30:51.157809	2026-06-10 10:30:51.157809
4	5	Juan Pérez	$2a$12$439WfgNkRCBorzeb0K0UrOCXnLcerBkAxg/lXhVPccT5LQXaUPihG	juan@jebo2026.com	Activo	\N	2026-06-10 10:30:51.1643	2026-06-10 10:30:51.1643
6	5	Pedro Ruiz	$2a$12$PnQi6UXoyY006jDmxgqfoOfcGIfPqT/Nes9Ors7wk7iMnnSKLrrTy	pedro@jebo2026.com	Activo	\N	2026-06-10 10:30:51.167269	2026-06-10 10:30:51.167269
8	5	Diego Torres	$2a$12$JGKhGOkC6Bymq0y7NdRZs.bugefT/9IdTNOUcl2f7NFdEy0i/z.bu	diego@jebo2026.com	Activo	\N	2026-06-10 10:30:51.169745	2026-06-10 10:30:51.169745
3	5	María López	$2a$12$eajmvlbYmH2XVZVEBPxwgeBIu8/5ia1AYucbdJxDlXD9ZACvU4gyC	maria@jebo2026.com	Activo	\N	2026-06-10 10:30:51.162776	2026-06-10 10:30:51.162776
7	5	Lucía Fernández	$2a$12$QfiBtoOVuRmvGEQfCN8qze6LnRCJKNF8kDqfLWeWBYHCshcs5tKoi	lucia@jebo2026.com	Activo	\N	2026-06-10 10:30:51.168519	2026-06-10 10:30:51.168519
9	5	Test User	$2a$12$B8MgCQHyg6mbenhthZLb6eHekACfdKKlP5zEByT1y13Z5KTc.jQmu	test-register@test.com	Activo	\N	2026-06-10 11:33:40.458817	2026-06-10 11:33:40.458817
10	5	Test User 2	$2a$12$fve9dfSdu.2reu2BiUuWjeViNwLYEmnp1eE/MJTpAsbZ0L8KuX1L2	test2@test.com	Activo	\N	2026-06-10 11:33:44.160581	2026-06-10 11:33:44.160581
\.


--
-- Data for Name: usuario_institucion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario_institucion (id_usuario_institucion, id_usuario, id_institucion) FROM stdin;
1	1	1
2	2	2
3	4	3
4	6	4
5	8	5
\.


--
-- Name: bitacora_id_bitacora_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bitacora_id_bitacora_seq', 102, true);


--
-- Name: cancha_id_cancha_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cancha_id_cancha_seq', 8, true);


--
-- Name: disciplina_id_disciplina_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disciplina_id_disciplina_seq', 8, true);


--
-- Name: disponibilidad_cancha_id_disponibilidad_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disponibilidad_cancha_id_disponibilidad_seq', 12, true);


--
-- Name: distrito_id_distrito_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.distrito_id_distrito_seq', 7, true);


--
-- Name: equipo_alumno_id_equipo_alumno_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipo_alumno_id_equipo_alumno_seq', 3, true);


--
-- Name: equipo_id_equipo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipo_id_equipo_seq', 15, true);


--
-- Name: fecha_cancha_id_fecha_cancha_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fecha_cancha_id_fecha_cancha_seq', 12, true);


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

SELECT pg_catalog.setval('public.institucion_id_institucion_seq', 10, true);


--
-- Name: partido_id_partido_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partido_id_partido_seq', 14, true);


--
-- Name: posicion_id_posicion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posicion_id_posicion_seq', 14, true);


--
-- Name: region_id_region_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.region_id_region_seq', 7, true);


--
-- Name: reglamento_id_reglamento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reglamento_id_reglamento_seq', 1, false);


--
-- Name: rol_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rol_id_rol_seq', 5, true);


--
-- Name: staff_partido_id_partido_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_partido_id_partido_usuario_seq', 1, false);


--
-- Name: torneo_id_torneo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.torneo_id_torneo_seq', 11, true);


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_id_usuario_seq', 12, true);


--
-- Name: usuario_institucion_id_usuario_institucion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_institucion_id_usuario_institucion_seq', 5, true);


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

\unrestrict r0dSQiluOdVSDQ79EHiv8N7fTx2laMtJCajOVT1ah9N9zoLb8x0DArZfqtwmhpm


--
-- PostgreSQL database dump
--

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
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

--
-- Name: equipo_alumno; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipo_alumno (
    id_equipo_alumno integer NOT NULL,
    id_equipo integer NOT NULL,
    id_usuario integer NOT NULL
);

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

--
-- Name: horarios_cancha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.horarios_cancha (
    id_horario_cancha integer NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL
);

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

-- Name: bitacora bitacora_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.bitacora ADD CONSTRAINT bitacora_pkey PRIMARY KEY (id_bitacora);

-- Name: cancha cancha_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.cancha ADD CONSTRAINT cancha_pkey PRIMARY KEY (id_cancha);

-- Name: disciplina disciplina_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.disciplina ADD CONSTRAINT disciplina_pkey PRIMARY KEY (id_disciplina);

-- Name: disponibilidad_cancha disponibilidad_cancha_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.disponibilidad_cancha ADD CONSTRAINT disponibilidad_cancha_pkey PRIMARY KEY (id_disponibilidad);

-- Name: distrito distrito_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.distrito ADD CONSTRAINT distrito_pkey PRIMARY KEY (id_distrito);

-- Name: equipo_alumno equipo_alumno_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.equipo_alumno ADD CONSTRAINT equipo_alumno_pkey PRIMARY KEY (id_equipo_alumno);

-- Name: equipo equipo_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.equipo ADD CONSTRAINT equipo_pkey PRIMARY KEY (id_equipo);

-- Name: fecha_cancha fecha_cancha_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.fecha_cancha ADD CONSTRAINT fecha_cancha_pkey PRIMARY KEY (id_fecha_cancha);

-- Name: fecha_horario fecha_horario_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.fecha_horario ADD CONSTRAINT fecha_horario_pkey PRIMARY KEY (fecha_horario);

-- Name: horarios_cancha horarios_cancha_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.horarios_cancha ADD CONSTRAINT horarios_cancha_pkey PRIMARY KEY (id_horario_cancha);

-- Name: imagenes imagenes_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.imagenes ADD CONSTRAINT imagenes_pkey PRIMARY KEY (id_serie);

-- Name: instancia instancia_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.instancia ADD CONSTRAINT instancia_pkey PRIMARY KEY (id_instancia);

-- Name: institucion institucion_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.institucion ADD CONSTRAINT institucion_pkey PRIMARY KEY (id_institucion);

-- Name: partido partido_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.partido ADD CONSTRAINT partido_pkey PRIMARY KEY (id_partido);

-- Name: posicion posicion_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.posicion ADD CONSTRAINT posicion_pkey PRIMARY KEY (id_posicion);

-- Name: region region_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.region ADD CONSTRAINT region_pkey PRIMARY KEY (id_region);

-- Name: reglamento reglamento_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.reglamento ADD CONSTRAINT reglamento_pkey PRIMARY KEY (id_reglamento);

-- Name: rol rol_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.rol ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);

-- Name: staff_partido staff_partido_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.staff_partido ADD CONSTRAINT staff_partido_pkey PRIMARY KEY (id_partido_usuario);

-- Name: torneo torneo_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.torneo ADD CONSTRAINT torneo_pkey PRIMARY KEY (id_torneo);

-- Name: usuario_institucion usuario_institucion_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.usuario_institucion ADD CONSTRAINT usuario_institucion_pkey PRIMARY KEY (id_usuario_institucion);

-- Name: usuario usuario_pkey; Type: CONSTRAINT
ALTER TABLE ONLY public.usuario ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);

-- Name: usuario_email_key; Type: CONSTRAINT
ALTER TABLE ONLY public.usuario ADD CONSTRAINT usuario_email_key UNIQUE (email);

-- Name: bitacora_id_usuario_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.bitacora ADD CONSTRAINT bitacora_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

-- Name: cancha_id_disciplina_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.cancha ADD CONSTRAINT cancha_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);

-- Name: cancha_id_distrito_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.cancha ADD CONSTRAINT cancha_id_distrito_fkey FOREIGN KEY (id_distrito) REFERENCES public.distrito(id_distrito);

-- Name: disponibilidad_cancha_fecha_horario_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.disponibilidad_cancha ADD CONSTRAINT disponibilidad_cancha_fecha_horario_fkey FOREIGN KEY (fecha_horario) REFERENCES public.fecha_horario(fecha_horario);

-- Name: disponibilidad_cancha_id_cancha_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.disponibilidad_cancha ADD CONSTRAINT disponibilidad_cancha_id_cancha_fkey FOREIGN KEY (id_cancha) REFERENCES public.cancha(id_cancha);

-- Name: distrito_id_region_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.distrito ADD CONSTRAINT distrito_id_region_fkey FOREIGN KEY (id_region) REFERENCES public.region(id_region);

-- Name: equipo_alumno_id_equipo_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.equipo_alumno ADD CONSTRAINT equipo_alumno_id_equipo_fkey FOREIGN KEY (id_equipo) REFERENCES public.equipo(id_equipo);

-- Name: equipo_alumno_id_usuario_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.equipo_alumno ADD CONSTRAINT equipo_alumno_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

-- Name: equipo_id_disciplina_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.equipo ADD CONSTRAINT equipo_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);

-- Name: equipo_id_institucion_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.equipo ADD CONSTRAINT equipo_id_institucion_fkey FOREIGN KEY (id_institucion) REFERENCES public.institucion(id_institucion);

-- Name: equipo_id_usuario_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.equipo ADD CONSTRAINT equipo_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

-- Name: fecha_horario_id_fecha_cancha_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.fecha_horario ADD CONSTRAINT fecha_horario_id_fecha_cancha_fkey FOREIGN KEY (id_fecha_cancha) REFERENCES public.fecha_cancha(id_fecha_cancha);

-- Name: fecha_horario_id_horario_cancha_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.fecha_horario ADD CONSTRAINT fecha_horario_id_horario_cancha_fkey FOREIGN KEY (id_horario_cancha) REFERENCES public.horarios_cancha(id_horario_cancha);

-- Name: institucion_id_distrito_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.institucion ADD CONSTRAINT institucion_id_distrito_fkey FOREIGN KEY (id_distrito) REFERENCES public.distrito(id_distrito);

-- Name: partido_id_disponibilidad_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.partido ADD CONSTRAINT partido_id_disponibilidad_fkey FOREIGN KEY (id_disponibilidad) REFERENCES public.disponibilidad_cancha(id_disponibilidad);

-- Name: partido_id_equipo_local_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.partido ADD CONSTRAINT partido_id_equipo_local_fkey FOREIGN KEY (id_equipo_local) REFERENCES public.equipo(id_equipo);

-- Name: partido_id_equipo_visitante_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.partido ADD CONSTRAINT partido_id_equipo_visitante_fkey FOREIGN KEY (id_equipo_visitante) REFERENCES public.equipo(id_equipo);

-- Name: partido_id_torneo_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.partido ADD CONSTRAINT partido_id_torneo_fkey FOREIGN KEY (id_torneo) REFERENCES public.torneo(id_torneo);

-- Name: posicion_id_equipo_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.posicion ADD CONSTRAINT posicion_id_equipo_fkey FOREIGN KEY (id_equipo) REFERENCES public.equipo(id_equipo);

-- Name: posicion_id_torneo_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.posicion ADD CONSTRAINT posicion_id_torneo_fkey FOREIGN KEY (id_torneo) REFERENCES public.torneo(id_torneo);

-- Name: reglamento_id_disciplina_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.reglamento ADD CONSTRAINT reglamento_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);

-- Name: staff_partido_id_partido_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.staff_partido ADD CONSTRAINT staff_partido_id_partido_fkey FOREIGN KEY (id_partido) REFERENCES public.partido(id_partido);

-- Name: staff_partido_id_usuario_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.staff_partido ADD CONSTRAINT staff_partido_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

-- Name: torneo_id_disciplina_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.torneo ADD CONSTRAINT torneo_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.disciplina(id_disciplina);

-- Name: torneo_id_instancia_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.torneo ADD CONSTRAINT torneo_id_instancia_fkey FOREIGN KEY (id_instancia) REFERENCES public.instancia(id_instancia);

-- Name: usuario_id_rol_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.usuario ADD CONSTRAINT usuario_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol);

-- Name: usuario_institucion_id_institucion_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.usuario_institucion ADD CONSTRAINT usuario_institucion_id_institucion_fkey FOREIGN KEY (id_institucion) REFERENCES public.institucion(id_institucion);

-- Name: usuario_institucion_id_usuario_fkey; Type: FK CONSTRAINT
ALTER TABLE ONLY public.usuario_institucion ADD CONSTRAINT usuario_institucion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

--
-- Data for Name: bitacora; Type: TABLE DATA; Schema: public; Owner: postgres
--

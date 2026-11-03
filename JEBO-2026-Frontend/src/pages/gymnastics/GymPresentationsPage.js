import React, { useState, useEffect, useCallback } from 'react';
import { styles, COLORS } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal, Notification } from '../../components/ui/Modal.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { IconPlus, IconTrash, IconEye } from '../../components/icons/index.js';
import presentacionService from '../../services/presentacionService.js';
import tournamentService from '../../services/tournamentService.js';
import disciplineService from '../../services/disciplineService.js';
import teamService from '../../services/teamService.js';
import userService from '../../services/userService.js';
import { ROUTES } from '../../config/constants.js';
import { formatearFecha } from '../../services/dateService.js';
import { esAdministrador } from '../../services/roles.js';

const { createElement: h } = React;

// El alta NO usa el componente `Modal`: ese componente siempre dibuja su par de

const modalFormStyle = {
    ...styles.modal,
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto'
};

/**
 * Alta de un encuentro.
 *
 * El backend exige torneo, disciplina, orden, participante con su orden de salida
 * y al menos un juez, asi que el formulario arma el cuerpo completo en un paso.
 *
 * El trío es UNO y no una lista: Gimnasia Artística no juega por equipos
 * enfrentados, así que cada presentación es el encuentro de un solo trío, que
 * sale solo, se lo evalúa y termina. Antes sePuedían tildar varios y quedaba
 * una grilla de evaluación con tríos que nunca se enfrentaron entre sí, más un
 * ranking que no significaba nada. El backend lo rechaza (`409`), el trigger
 * `presentacion_un_solo_trio` también, y el selector lo hace imposible por
 * construcción: no hay lista de donde elegir más de uno.
 *
 * No se pide la disciplina porque sale sola del torneo: `POST /presentaciones`
 * la rechaza si no es de tipo EVALUACION, y elegirla a mano en el form solo
 * abriría la puerta a mandarle una disciplina de marcador.
 */
function FormNuevoEncuentro({ torneo, equipos, jueces, cargandoEquipos, onElegirTorneo, onCancelar, onGuardar, guardando }) {
    const [form, setForm] = useState({ id_torneo: '', orden: '', fecha_hora: '', equipo: '', jueces: [] });

    // El torneo manda sobre el resto: al cambiarlo se descarta el trío del
    // torneo anterior, que ya no es válido para el nuevo.
    const cambiarTorneo = (id) => {
        setForm(f => ({ ...f, id_torneo: id, equipo: '' }));
        onElegirTorneo(id);
    };

    const alternarJuez = (id) => setForm(f => ({
        ...f,
        jueces: f.jueces.includes(id) ? f.jueces.filter(j => j !== id) : [...f.jueces, id]
    }));

    // El primero de la lista de jueces es el presidente del jurado, que es como
    // lo trata el reglamento. Se guarda el orden en que se fueron tildando.
    //
    // La disciplina no la elige el usuario, pero el backend la exige en el body
    // (`POST /presentaciones` la valida como EVALUACION y la guarda). Se deriva
    // del torneo elegido, que ya la trae, en vez de pedirla de nuevo.
    const enviar = () => {
        const torneoElegido = torneo.find(t => String(t.id_torneo) === String(form.id_torneo));
        return onGuardar({
            id_torneo: Number(form.id_torneo),
            id_disciplina: torneoElegido ? Number(torneoElegido.id_disciplina) : undefined,
            orden: Number(form.orden),
            fecha_hora: form.fecha_hora ? new Date(form.fecha_hora).toISOString() : undefined,
            participantes: [{
                id_equipo: Number(form.equipo),
                rol: 'GRUPO',
                orden_salida: 1
            }],
            staff: form.jueces.map((id, i) => ({
                id_usuario: id,
                rol: i === 0 ? 'JUEZ_PRESIDENTE' : 'JUEZ'
            }))
        });
    };

    const faltaAlgo = !form.id_torneo || !form.orden || !form.equipo || form.jueces.length === 0;

    return h('div', null,
        h('div', { style: styles.twoColumnGrid },
            h('div', null,
                h('label', { style: styles.formLabel }, 'Torneo'),
                h('select', {
                    value: form.id_torneo,
                    onChange: e => cambiarTorneo(e.target.value),
                    style: styles.formSelect
                },
                    h('option', { value: '' }, 'Elegir torneo...'),
                    torneo.map(t => h('option', { key: t.id_torneo, value: t.id_torneo },
                        `${t.nombre} — ${t.disciplina_nombre || ''}`)
                    )
                )
            ),
            h('div', null,
                h('label', { style: styles.formLabel }, 'Orden de salida en el torneo'),
                h('input', {
                    type: 'number', min: 1,
                    value: form.orden,
                    onChange: e => setForm({ ...form, orden: e.target.value }),
                    style: styles.formInput
                })
            )
        ),

        h('div', { style: styles.formGroup },
            h('label', { style: styles.formLabel }, 'Fecha y hora'),
            h('input', {
                type: 'datetime-local',
                value: form.fecha_hora,
                onChange: e => setForm({ ...form, fecha_hora: e.target.value }),
                style: styles.formInput
            })
        ),

        // Un `<select>` y no una lista de checkboxes: un encuentro es de un solo
        // trío, así que no tiene que haber una forma de elegir más de uno. Con
        // checkboxes el error era del usuario; acá es imposible.
        h('div', { style: styles.formGroup },
            h('label', { style: styles.formLabel }, 'Trío que se presenta'),
            !form.id_torneo
                ? h('div', { style: { color: COLORS.textMuted, fontSize: '14px' } }, 'Elegí un torneo para ver sus tríos.')
                : cargandoEquipos
                    ? h('div', { style: { color: COLORS.textMuted, fontSize: '14px' } }, 'Cargando tríos...')
                    : equipos.length === 0
                        ? h('div', { style: { color: COLORS.textMuted, fontSize: '14px' } }, 'Ese torneo no tiene tríos cargados.')
                        : h('select', {
                            value: form.equipo,
                            onChange: e => setForm({ ...form, equipo: e.target.value }),
                            style: styles.formSelect
                        },
                            h('option', { value: '' }, 'Elegir trío...'),
                            equipos.map(e => h('option', { key: e.id_equipo, value: e.id_equipo },
                                e.institucion_nombre ? `${e.nombre} — ${e.institucion_nombre}` : e.nombre
                            ))
                        )
        ),

        h('div', { style: styles.formGroup },
            h('label', { style: styles.formLabel },
                `Jurado (${form.jueces.length}) — el primero tildado es el presidente`),
            h('div', {
                style: {
                    ...styles.formSelect,
                    minHeight: '140px',
                    maxHeight: '140px',
                    overflowY: 'auto'
                }
            },
                jueces.length === 0
                    ? h('div', { style: { color: COLORS.textMuted, fontSize: '14px' } }, 'No hay usuarios con rol Juez.')
                    : jueces.map(j => h('label', {
                        key: j.id_usuario,
                        style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '3px 0', cursor: 'pointer' }
                    },
                        h('input', {
                            type: 'checkbox',
                            checked: form.jueces.includes(j.id_usuario),
                            onChange: () => alternarJuez(j.id_usuario)
                        }),
                        h('span', null, j.nombre)
                    ))
            )
        ),

        faltaAlgo && h('div', { style: { fontSize: '12px', color: COLORS.textMedium } },
            'Falta el torneo, el orden de salida, el trío y al menos un juez.'),

        h('div', { style: styles.formActions },
            h('button', { style: styles.buttonOutline, onClick: onCancelar }, 'Cancelar'),
            h('button', {
                style: styles.buttonPrimary,
                disabled: faltaAlgo || guardando,
                onClick: enviar
            }, guardando ? 'Guardando...' : 'Crear encuentro')
        )
    );
}

// `Badge` solo acepta `variant`: el `style` que se le pasaba antes se descartaba y
// los cuatro estados salian del mismo verde. Es el mismo criterio y el mismo nombre
// que en Partidos, Mis Partidos y el detalle de partido.
function getBadgeVariant(estado) {
    const e = (estado || '').toUpperCase();
    if (e === 'EN_CURSO') return 'green';
    if (e === 'FINALIZADA') return 'blue';
    if (e === 'CANCELADA') return 'red';
    return 'yellow';
}

// La fecha del backend es "YYYY-MM-DD", sin hora ni zona. `new Date('2026-01-15')`
// la interpreta como medianoche UTC, que en cualquier container con offset
// negativo es el 14 del mismo mes: la fila de enero se rotulaba con la fecha
// equivocada y el "Comenzar" se bloqueaba por el motivo equivocado. Se leen los
// tres numeros directamente.
function partesDeFecha(fecha) {
    if (!fecha) return null;
    const soloFecha = String(fecha).slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(soloFecha);
    if (!m) return null;
    return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

// El encuentro se puede arrancar solo el día que le toca, igual que el árbitro de
// un partido: si el turno ya pasó, nadie va a estar en el gimnasio para evaluar.
function esHoy(fecha) {
    const p = partesDeFecha(fecha);
    if (!p) return false;
    const hoy = new Date();
    return p.anio === hoy.getFullYear() && p.mes === hoy.getMonth() + 1 && p.dia === hoy.getDate();
}

function fechaEnCastellano(fecha) {
    const p = partesDeFecha(fecha);
    if (!p) return fecha;
    return `${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}/${p.anio}`;
}

function GymPresentationsPage({ onNavigate, user }) {
    // El listado cambio de dueño: ahora tambien lo ve el juez, que entra por esta
    // pantalla a llenar su hoja. Lo que es del admin (dar de alta un encuentro,
    // arrancarlo, cerrarlo, eliminarlo) queda oculto para el resto.
    //
    // Ocultarlo NO alcanza como proteccion: el backend exige rol admin en esos
    // endpoints. Acá esta para que al juez no le ofrezcan acciones que le van a
    // ser rechazadas.
    //
    // Sin `user` (o con un rol que no sea admin) se oculta todo lo del admin. Es
    // el criterio que ya usa `GymScoringPage`, centralizado en `esAdministrador`
    // para que SuperAdmin y Administrador entren igual y ningun otro rol.
    const esAdmin = esAdministrador(user);

    const [tournaments, setTournaments] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [presentaciones, setPresentaciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ id_torneo: '', id_disciplina: '', estado: '' });
    const [notif, setNotif] = useState(null);

    // Alta de encuentro. Los catálogos (tríos del torneo, jurado) se piden al
    // abrir el modal y no antes, para no gastar tres requests en una pantalla que
    // la mayoría de las veces solo se mira.
    const [modalAbierto, setModalAbierto] = useState(false);
    const [equiposTorneo, setEquiposTorneo] = useState([]);
    const [cargandoEquipos, setCargandoEquipos] = useState(false);
    const [jueces, setJueces] = useState([]);
    const [guardando, setGuardando] = useState(false);

    // Ciclo de vida del encuentro. El boton de la fila no cambia el estado:
    // abre un modal y recien ahi, con el aviso a la vista, se avisa al backend.
    // Sin ese paso, un clic de paso dejaba el encuentro consumido.
    const [transicion, setTransicion] = useState(null); // { presentacion, accion }
    const [cambiandoEstado, setCambiandoEstado] = useState(false);

    // Baja de un encuentro. Antes se confirmaba con `window.confirm`, que no usa
    // el `Modal` compartido: mismo flujo encolado que el resto (el boton de la
    // fila abre el modal y recien ahi se llama al backend), con el mismo diseño
    // que el resto de los modulos.
    const [presentacionAEliminar, setPresentacionAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => {
        Promise.all([
            tournamentService.getAll(1, 100),
            disciplineService.getAll()
        ]).then(([t, d]) => {
            setTournaments(t.data || t);
            setDisciplines(d.data || d);
        }).catch(() => {});
    }, []);

    const fetchPresentaciones = useCallback(async () => {
        setLoading(true);
        try {
            const params = { ...filters };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const data = await presentacionService.getAll(params);
            setPresentaciones(data.data || data);
        } catch (err) {
            setNotif({ message: 'Error al cargar: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Cargar al montar y cuando cambian los filtros
    useEffect(() => { fetchPresentaciones(); }, [fetchPresentaciones]);

    useEffect(() => { if (notif) { const t = setTimeout(() => setNotif(null), 3000); return () => clearTimeout(t); } }, [notif]);

    // El torneo se elige adentro del modal, así que el jurado se pide al abrir y los
    // tríos cuando ya se sabe de qué torneo. `GET /teams` no acepta filtro por
    // torneo ni por disciplina, así que se traen todos y se acota en el cliente.
    const abrirAlta = async () => {
        setModalAbierto(true);
        setEquiposTorneo([]);
        try {
            const ju = await userService.getAll({ rol: 'Juez' });
            setJueces(Array.isArray(ju) ? ju : ju.data || []);
        } catch (err) {
            setNotif({ message: 'No se pudo cargar el jurado: ' + err.message, type: 'error' });
        }
    };

    const onElegirTorneo = async (idTorneo) => {
        if (!idTorneo) { setEquiposTorneo([]); return; }
        const torneo = tournaments.find(t => String(t.id_torneo) === String(idTorneo));
        if (!torneo) return;
        setCargandoEquipos(true);
        try {
            const todos = await teamService.getAll({ limit: 100 });
            const lista = Array.isArray(todos) ? todos : todos.data || [];
            setEquiposTorneo(lista.filter(t => t.id_disciplina === torneo.id_disciplina));
        } catch (err) {
            setNotif({ message: 'No se pudieron cargar los tríos: ' + err.message, type: 'error' });
        } finally {
            setCargandoEquipos(false);
        }
    };

    const guardarNueva = async (payload) => {
        setGuardando(true);
        try {
            const creada = await presentacionService.create(payload);
            const id = creada.data?.id_presentacion ?? creada.id_presentacion ?? creada.data?.id;
            setModalAbierto(false);
            setNotif({ message: 'Encuentro creado', type: 'success' });
            await fetchPresentaciones();
            if (id) onNavigate(`${ROUTES.GYM_PRESENTACIONES}/${id}/detalle`);
        } catch (err) {
            setNotif({ message: 'No se pudo crear: ' + err.message, type: 'error' });
        } finally {
            setGuardando(false);
        }
    };

    // El backend es el que valida (jurado completo, fecha, transiciones
    // válidas). Lo que se le pasa es el estado destino, y su mensaje se muestra
    // tal cual: es más útil que uno propio que adivine por qué falló.
    const confirmarTransicion = async () => {
        const t = transicion;
        // `Modal` no tiene `disabled` para el boton de confirmar: el guarda de
        // `cambiandoEstado` es lo que evita el doble clic.
        if (!t || cambiandoEstado) return;
        setCambiandoEstado(true);
        try {
            await presentacionService.updateEstado(t.presentacion.id_presentacion, t.estadoDestino);
            setNotif({ message: t.mensaje, type: 'success' });
            setTransicion(null);
            await fetchPresentaciones();
        } catch (err) {
            setNotif({ message: err.message, type: 'error' });
        } finally {
            setCambiandoEstado(false);
        }
    };

    // El boton de la fila solo abre el modal: no se toca el backend hasta
    // confirmar, igual que en Comenzar/Finalizar y que en los otros modulos.
    const pedirEliminar = (p) => setPresentacionAEliminar(p);

    const confirmarEliminar = async () => {
        const p = presentacionAEliminar;
        // `Modal` no tiene `disabled` para el boton de confirmar: el guarda de
        // `eliminando` es lo que evita el doble clic.
        if (!p || eliminando) return;
        setEliminando(true);
        try {
            await presentacionService.delete(p.id_presentacion);
            setNotif({ message: 'Encuentro eliminado', type: 'success' });
            setPresentacionAEliminar(null);
            await fetchPresentaciones();
        } catch (err) {
            setNotif({ message: 'Error: ' + err.message, type: 'error' });
        } finally {
            setEliminando(false);
        }
    };

    const abrirHoja = (p) => onNavigate(`${ROUTES.GYM_PRESENTACIONES}/${p.id_presentacion}/detalle`);

    const abrirComenzar = (p) => setTransicion({
        presentacion: p,
        estadoDestino: 'EN_CURSO',
        titulo: `Dar inicio a la presentación N° ${p.orden}`,
        cuerpo: 'Se habilita la hoja de evaluación para el jurado. ¿Querés continuar?',
        confirmar: 'Comenzar',
        mensaje: 'Presentación iniciada'
    });

    const abrirFinalizar = (p) => setTransicion({
        presentacion: p,
        estadoDestino: 'FINALIZADA',
        titulo: `Finalizar presentación`,
        cuerpo: `Vas a registrar la finalización de la presentación N° ${p.orden} `
            + `de ${p.torneo_nombre || 'este torneo'}. `
            + 'La evaluación ya no podrá modificarse.',
        confirmar: 'Finalizar',
        mensaje: 'Presentación finalizada'
    });

    // Solo los torneos de una disciplina de evaluación admiten encuentros; el
    // backend rechaza el resto, así que tampoco se ofrecen.
    const torneosEvaluacion = tournaments.filter(t => {
        const d = disciplines.find(x => x.id_disciplina === t.id_disciplina);
        return d ? d.tipo_competencia === 'EVALUACION' : false;
    });

    // Las filas de carga y de lista vacia viven DENTRO de la tabla, con el
    // `colSpan` de sus columnas. Antes el `Loading` reemplazaba la tabla entera
    // (y `loadingContainer` mide el 100vh del viewport), asi que la pantalla
    // saltaba de alto y la grilla de columnas desaparecia en cada recarga.
    // Para el juez falta la ultima columna (la del ciclo de vida), asi que el
    // `colSpan` tiene que acompanar al encabezado o la fila de "No hay
    // encuentros" se parte en dos.
    const columnas = esAdmin ? 8 : 7;

    const renderFila = (p) => {
        const fecha = p.fecha ? formatearFecha(p.fecha) : '—';
        const hora = p.hora_inicio ? p.hora_inicio.slice(0, 5) : '';

        // "Evaluar" es lo que el juez viene a hacer, pero solo se puede guardar
        // con el encuentro EN_CURSO (`guardarHoja` lo exige). En los demas estados
        // el boton abre la misma hoja en lectura, asi que se rotula segun lo que
        // realmente va a poder hacer. Una cancelada no muestra nada.
        const seEvalua = p.estado !== 'CANCELADA';

        return h(TableRow, { key: p.id_presentacion },
            h(TableCell, null, p.orden),
            h(TableCell, null, h('div', { style: { fontWeight: 500 } }, p.torneo_nombre || p.id_torneo)),
            h(TableCell, null, p.disciplina_nombre),
            h(TableCell, null,
                h('div', null, fecha),
                hora && h('div', { style: { fontSize: '12px', color: COLORS.textMuted } },
                    `${hora} · ${p.cancha_nombre || '—'}`)
            ),
            // El estado va en el segundo argumento de `h`, nunca en el de props:
            // `h(Badge, p.estado)` hace que React evalue `'__self' in "EN_CURSO"`,
            // que revienta con "Cannot use 'in' operator" y deja la pantalla en
            // blanco.
            h(TableCell, null, h(Badge, { variant: getBadgeVariant(p.estado) }, p.estado)),
            h(TableCell, null,
                h('div', null, p.equipo_nombre || '—'),
                p.institucion_nombre && h('div', { style: { fontSize: '12px', color: COLORS.textMuted } },
                    p.institucion_nombre)
            ),
            h(TableCell, null,
                h(TableActions, null,
                    seEvalua && h('button', {
                        // Iconos solos: padding de 6px como los botones de fila de
                        // Partidos, para que midan lo mismo que en el resto de las
                        // tablas (antes 40px de ancho contra 28px).
                        style: { ...styles.buttonInfo, padding: '6px' },
                        onClick: () => abrirHoja(p),
                        title: p.estado === 'EN_CURSO' ? 'Evaluar' : 'Ver hoja'
                    }, h(IconEye)),
                    // Borrar solo mientras no empezó: después hay
                    // evaluaciones cargadas y el encuentro ya
                    // cuenta en el torneo. Y solo para el admin.
                    esAdmin && p.estado === 'PROGRAMADA' && h('button', {
                        style: { ...styles.buttonDanger, padding: '6px' },
                        onClick: () => pedirEliminar(p),
                        title: 'Eliminar'
                    }, h(IconTrash))
                )
            ),
            // El ciclo de vida va en su propia columna y no en Acciones: son
            // acciones sobre el ESTADO del encuentro, no sobre la fila. Para el
            // juez la columna no existe: no tiene nada que decidir ahi.
            esAdmin && h(TableCell, null,
                h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                    p.estado === 'PROGRAMADA' && h('button', {
                        // `minHeight: 'auto'` en los dos botones de estado: los de
                        // icono de Acciones miden 32px de alto, y sin esto estos
                        // median 44px en la misma fila.
                        style: {
                            ...styles.buttonPrimary,
                            padding: '6px 12px',
                            minHeight: 'auto',
                            opacity: esHoy(p.fecha) ? 1 : 0.5,
                            cursor: esHoy(p.fecha) ? 'pointer' : 'not-allowed'
                        },
                        disabled: !esHoy(p.fecha),
                        onClick: () => abrirComenzar(p),
                        title: esHoy(p.fecha) ? 'Comenzar' : `La fecha (${fechaEnCastellano(p.fecha)}) ya pasó`
                    }, 'Comenzar'),
                    // `buttonDanger` y no `buttonOutline`: finalizar no se puede
                    // deshacer, asi que va en rojo como el "Finalizar" de Mis
                    // Partidos. En azul_OUTLINE se leia como una accion mas.
                    p.estado === 'EN_CURSO' && h('button', {
                        style: { ...styles.buttonDanger, padding: '6px 12px', minHeight: 'auto' },
                        onClick: () => abrirFinalizar(p)
                    }, 'Finalizar')
                ),
                p.estado === 'PROGRAMADA' && !esHoy(p.fecha) && h('div', {
                    style: { fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }
                }, `La fecha (${fechaEnCastellano(p.fecha)}) ya pasó`)
            )
        );
    };

    // `td` y no `TableCell`: ese componente no reenvia props extra, asi que el
    // `colSpan` se perdia y la celda ocupaba una sola columna de las ocho.
    const renderFilas = () => {
        if (loading) {
            return h(TableRow, null,
                h('td', {
                    colSpan: columnas,
                    style: { ...styles.tableCell, textAlign: 'center', color: COLORS.textMuted }
                }, 'Cargando...'));
        }
        if (presentaciones.length === 0) {
            return h(TableRow, null,
                h('td', {
                    colSpan: columnas,
                    style: { ...styles.tableCell, textAlign: 'center', color: COLORS.textMuted }
                }, 'No hay encuentros'));
        }
        return presentaciones.map(renderFila);
    };

    return h('div', null,
        // Titulo de pagina, como en Distritos, Regiones e Instituciones: el nombre
        // de la seccion estaba en el menu y la pantalla arrancaba sin encabezado.
        h('div', { style: { marginBottom: '16px' } },
            h('h1', {
                style: {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: styles.cardTitle.color,
                    marginBottom: '4px'
                }
            }, 'Presentaciones de Gimnasia Artística'),
            h('p', { style: { fontSize: '14px', color: COLORS.textMedium } },
                esAdmin
                    ? 'Alta de encuentros, jurado y ciclo de vida de cada presentación.'
                    : 'Los encuentros en los que sos parte del jurado y sus hojas de evaluación.')
        ),

        // El modal de alta va PRIMERO en el DOM, no al final como los demas: sus
        // `<select>` tienen que leerse antes que los del filtro de la pagina, que
        // listan todos los torneos y no solo los de gimnastica.
        modalAbierto && h('div', {
            style: styles.modalOverlay,
            onClick: () => setModalAbierto(false)
        },
            h('div', { style: modalFormStyle, onClick: e => e.stopPropagation() },
                h('h3', { style: styles.modalTitle }, 'Nuevo encuentro'),
                h(FormNuevoEncuentro, {
                    torneo: torneosEvaluacion,
                    equipos: equiposTorneo,
                    jueces,
                    cargandoEquipos,
                    onElegirTorneo,
                    guardando,
                    onCancelar: () => setModalAbierto(false),
                    onGuardar: guardarNueva
                })
            )
        ),

        h(Card, null,
            // Filtros y accion de alta en el mismo `CardHeader`, que es donde los
            // pone Partidos y Mis Partidos. Antes el boton de alta estaba en un
            // encabezado suelto del `CardHeader` y los filtros en otra tira debajo,
            // con el `marginBottom` del cuerpo de la Card.
            h(CardHeader, { title: 'Encuentros de Gimnasia' },
                h('div', {
                    style: {
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end'
                    }
                },
                    h('select', {
                        'aria-label': 'Filtrar por torneo',
                        value: filters.id_torneo,
                        onChange: e => setFilters({ ...filters, id_torneo: e.target.value }),
                        style: { ...styles.formSelect, width: '240px', marginBottom: 0 }
                    },
                        h('option', { value: '' }, 'Todos los torneos'),
                        tournaments.map(t => h('option', { key: t.id_torneo, value: t.id_torneo }, t.nombre))
                    ),
                    h('select', {
                        'aria-label': 'Filtrar por disciplina',
                        value: filters.id_disciplina,
                        onChange: e => setFilters({ ...filters, id_disciplina: e.target.value }),
                        style: { ...styles.formSelect, width: '240px', marginBottom: 0 }
                    },
                        h('option', { value: '' }, 'Todas las disciplinas'),
                        disciplines.map(d => h('option', { key: d.id_disciplina, value: d.id_disciplina }, d.nombre))
                    ),
                    h('select', {
                        'aria-label': 'Filtrar por estado',
                        value: filters.estado,
                        onChange: e => setFilters({ ...filters, estado: e.target.value }),
                        style: { ...styles.formSelect, width: '160px', marginBottom: 0 }
                    },
                        h('option', { value: '' }, 'Todos los estados'),
                        h('option', { value: 'PROGRAMADA' }, 'Programada'),
                        h('option', { value: 'EN_CURSO' }, 'En curso'),
                        h('option', { value: 'FINALIZADA' }, 'Finalizada'),
                        h('option', { value: 'CANCELADA' }, 'Cancelada')
                    ),
                    h('button', { style: styles.buttonPrimary, onClick: fetchPresentaciones, disabled: loading },
                        'Buscar'),
                    esAdmin && h('button', {
                        style: { ...styles.buttonPrimary, display: 'flex', alignItems: 'center', gap: '6px' },
                        onClick: () => abrirAlta()
                    }, h(IconPlus), 'Nuevo encuentro')
                )
            ),

            h(Table, null,
                // `TableHeader` ya arma su propio `<thead><tr>`, asi que las celdas
                // van directo: envolverlas en un `TableRow` produce
                // `<tr><tr>...</tr></tr>`.
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Orden'),
                    h(TableHeaderCell, null, 'Torneo'),
                    h(TableHeaderCell, null, 'Disciplina'),
                    h(TableHeaderCell, null, 'Fecha / Cancha'),
                    h(TableHeaderCell, null, 'Estado'),
                    h(TableHeaderCell, null, 'Trío'),
                    h(TableHeaderCell, { style: { width: '110px' } }, 'Acciones'),
                    esAdmin && h(TableHeaderCell, null, 'Estado del encuentro')
                ),
                // Las filas van dentro de un `tbody` explicito: `Table` solo arma el
                // `<table>`, y el navegador mete las sueltas en un tbody vacio
                // autogenerado, dejando los `<tr>` colgando fuera de lugar y el
                // `<thead>` separado del cuerpo.
                h('tbody', null, renderFilas())
            )
        ),

        // Modal de confirmacion del componente compartido: mismo overlay, misma caja
        // y mismos botones que el resto de la app (antes era un overlay propio, con
        // otro radio de esquina, otra sombra y otro `z-index`).
        transicion && h(Modal, {
            isOpen: true,
            onClose: () => setTransicion(null),
            onConfirm: confirmarTransicion,
            title: transicion.titulo,
            message: transicion.cuerpo,
            confirmText: cambiandoEstado ? 'Guardando...' : transicion.confirmar,
            cancelText: 'Cancelar',
            // Finalizar es la unica de las dos que no se puede deshacer: por eso el
            // borde rojo y el boton de confirmar tambien. Es lo que hace "Finalizar
            // partido" en Mis Partidos.
            confirmStyle: transicion.estadoDestino === 'FINALIZADA' ? 'danger' : 'primary',
            warning: transicion.estadoDestino === 'FINALIZADA'
        }),

        // Baja del encuentro: mismo `Modal` que el resto de los modulos, con el
        // aviso a la vista. Se muestra el numero y el torneo para que se sepa
        // cual se esta por borrar sin volver a la tabla.
        presentacionAEliminar && h(Modal, {
            isOpen: true,
            onClose: () => setPresentacionAEliminar(null),
            onConfirm: confirmarEliminar,
            title: 'Eliminar presentación',
            message: `¿Eliminar la presentación N° ${presentacionAEliminar.orden}`
                + ` de ${presentacionAEliminar.torneo_nombre || 'este torneo'}?`
                + ' Esta acción no se puede deshacer.',
            confirmText: eliminando ? 'Eliminando...' : 'Eliminar',
            cancelText: 'Cancelar',
            confirmStyle: 'danger',
            warning: true
        }),

        notif && h(Notification, {
            message: notif.message,
            type: notif.type,
            onClose: () => setNotif(null)
        })
    );
}

export { GymPresentationsPage };

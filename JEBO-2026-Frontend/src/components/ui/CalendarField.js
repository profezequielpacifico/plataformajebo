import React, { useState } from 'react';
import { styles } from '../../styles/theme/index.js';

const { createElement: h } = React;

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const pad = (n) => String(n).padStart(2, '0');

const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseD = (s) => {
    if (!s) return null;
    const p = s.split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    return new Date(p[0], p[1] - 1, p[2]);
};

const parseDT = (s) => {
    if (!s) return { date: null, time: '' };
    const [datePart, timePart] = String(s).split('T');
    return { date: parseD(datePart), time: timePart ? timePart.slice(0, 5) : '' };
};

const paddedDate = (v) => {
    const dt = parseDT(v);
    return dt.date ? toISO(dt.date).split('-').reverse().join('/') : '';
};

const buildCells = (year, month) => {
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((firstOffset + daysInMonth) / 7) * 7;
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstOffset + 1;
        cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
    }
    return cells;
};

const dayClasses = (d) => {
    if (d.isSelected) return { bg: '#3b82f6', fg: '#ffffff', weight: 600 };
    if (d.inRange) return { bg: '#dbeafe', fg: '#1e40af', weight: 600 };
    if (d.extra) return { bg: d.extra.bg || '#d1fae5', fg: d.extra.fg || '#065f46', weight: 600 };
    return { bg: 'transparent', fg: '#374151', weight: 400 };
};

function renderDayCell(dayNum, ctx) {
    if (dayNum === null) return h('span', { key: ctx.key, style: { padding: '4px 0' } });

    const dStr = toISO(new Date(ctx.year, ctx.month, dayNum));
    const isSelected = ctx.valueDate && toISO(ctx.valueDate) === dStr;
    const inRange = ctx.inRange(dayNum);
    const extra = isSelected || inRange ? null : ctx.extraRange(dayNum);
    const isToday = toISO(new Date()) === dStr;
    const cls = dayClasses({ isSelected, inRange, extra });

    return h('button', {
        key: ctx.key,
        type: 'button',
        onClick: () => ctx.onSelect(dayNum),
        style: {
            border: isToday ? '1px solid #3b82f6' : '1px solid transparent',
            borderRadius: '6px',
            padding: '5px 0',
            textAlign: 'center',
            fontSize: '13px',
            cursor: 'pointer',
            backgroundColor: cls.bg,
            color: cls.fg,
            fontWeight: cls.weight,
            boxSizing: 'border-box'
        }
    }, String(dayNum));
}

function renderNavHeader(ctx) {
    return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
        h('button', {
            type: 'button',
            style: { ...styles.buttonOutline, padding: '4px 10px', fontSize: '14px', lineHeight: '1' },
            onClick: () => ctx.onNav(-1)
        }, '‹'),
        h('span', { style: { fontWeight: 600, fontSize: '14px', color: '#374151' } },
            `${MONTHS[ctx.month]} ${ctx.year}`
        ),
        h('button', {
            type: 'button',
            style: { ...styles.buttonOutline, padding: '4px 10px', fontSize: '14px', lineHeight: '1' },
            onClick: () => ctx.onNav(1)
        }, '›')
    );
}

function renderWeekDays() {
    return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' } },
        WEEKDAYS.map(w => h('span', {
            key: 'wd-' + w,
            style: {
                textAlign: 'center', fontSize: '11px', fontWeight: 600,
                color: '#9ca3af', padding: '4px 0'
            }
        }, w))
    );
}

function renderTimeControls(ctx) {
    if (!ctx.withTime) return null;
    return h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' } },
        h('select', {
            value: ctx.time || '00:00',
            style: styles.formSelect,
            onChange: (e) => ctx.onApplyTime(e.target.value)
        }, ctx.hours.map(hh => h('option', { key: hh, value: hh }, hh))),
        h('span', { style: { fontWeight: 600, color: '#374151' } }, ':'),
        h('select', {
            value: (ctx.time || '00:00').substring(3) || '00',
            style: styles.formSelect,
            onChange: (e) => ctx.onApplyTime(`${(ctx.time || '00:00').slice(0, 2)}:${e.target.value}`)
        }, ctx.minutes.map(mm => h('option', { key: mm, value: mm }, mm))),
        h('button', {
            type: 'button',
            style: { ...styles.buttonPrimary, padding: '6px 14px', marginLeft: 'auto' },
            onClick: () => ctx.onClose()
        }, 'OK')
    );
}

function renderCalendar(ctx) {
    return h('div', {
        style: {
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1999,
            width: ctx.withTime ? '300px' : '280px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '12px'
        }
    },
        renderNavHeader(ctx),
        renderWeekDays(),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginTop: '4px' } },
            ctx.cells.map((dayNum, idx) => renderDayCell(dayNum, {
                key: idx,
                year: ctx.year,
                month: ctx.month,
                valueDate: ctx.valueDate,
                inRange: ctx.isInRange,
                extraRange: ctx.getExtraRange,
                onSelect: ctx.onSelect
            }))
        ),
        renderTimeControls(ctx)
    );
}

export function CalendarField({ value, onChange, rangeStart, rangeEnd, disabled, withTime, extraRanges }) {
    const [open, setOpen] = useState(false);
    const parsed = parseDT(value);
    const valueDate = parsed.date;
    const [time, setTime] = useState(parsed.time);
    const [viewMonth, setViewMonth] = useState(() => {
        const base = valueDate || new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });

    const start = parseD(rangeStart);
    const end = parseD(rangeEnd);

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const cells = buildCells(year, month);

    const isInRange = (dayNum) => {
        const d = new Date(year, month, dayNum);
        if (!start && !end) return false;
        if (start && end) return d >= start && d <= end;
        if (start) return toISO(d) === toISO(start);
        return toISO(d) === toISO(end);
    };

    const getExtraRange = (dayNum) => {
        if (!Array.isArray(extraRanges)) return null;
        const d = new Date(year, month, dayNum);
        for (const r of extraRanges) {
            if (!r || (!r.start && !r.end)) continue;
            const rs = parseD(r.start);
            const re = parseD(r.end);
            if (re && rs && d >= rs && d <= re) return r;
            if (rs && !re && toISO(d) === toISO(rs)) return r;
            if (re && !rs && toISO(d) === toISO(re)) return r;
        }
        return null;
    };

    const handleSelect = (dayNum) => {
        setViewMonth(new Date(year, month, 1));
        if (withTime) {
            onChange(`${toISO(new Date(year, month, dayNum))}T${time || '00:00'}`);
        } else {
            onChange(toISO(new Date(year, month, dayNum)));
            setOpen(false);
        }
    };

    const applyTime = (t) => {
        setTime(t);
        if (valueDate) onChange(`${toISO(valueDate)}T${t}`);
    };

    const nav = (delta) => {
        setViewMonth(new Date(year, month + delta, 1));
    };

    let inputValue = '';
    if (value) {
        const timePart = withTime && value.split('T')[1] ? value.split('T')[1].slice(0, 5) : '';
        inputValue = withTime ? `${paddedDate(value)} ${timePart}` : paddedDate(value);
    }

    const inputStyle = {
        ...styles.formInput,
        ...(value ? { borderColor: '#3b82f6', backgroundColor: '#eff6ff' } : {}),
        cursor: 'pointer'
    };

    const hours = [];
    for (let i = 0; i < 24; i++) hours.push(pad(i));
    const minutes = [];
    for (let i = 0; i < 60; i += 5) minutes.push(pad(i));

    const calendarCtx = {
        month,
        year,
        cells,
        valueDate,
        isInRange,
        getExtraRange,
        onSelect: handleSelect,
        withTime,
        time,
        hours,
        minutes,
        onNav: nav,
        onApplyTime: applyTime,
        onClose: () => setOpen(false)
    };

    return h('div', { style: { position: 'relative' } },
        h('input', {
            type: 'text',
            readOnly: true,
            value: inputValue,
            placeholder: withTime ? 'dd/mm/aaaa hh:mm' : 'dd/mm/aaaa',
            disabled,
            style: inputStyle,
            onClick: () => { if (!disabled) setOpen(true); },

            onFocus: () => { if (!disabled) setOpen(true); }
        }),

        open && !disabled && h('div', {
            style: {
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 1998,
                cursor: 'default'
            },
            onClick: () => setOpen(false)
        }),

        open && !disabled && renderCalendar(calendarCtx)
    );
}

export default CalendarField;
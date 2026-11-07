import React from 'react';
import { MapPin, Landmark } from 'lucide-react';

const { createElement: h } = React;

export function IconLoader() {
    return h('div', {
        style: {
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
        }
    });
}

export function IconCheck() {
    return h('div', {
        style: {
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#4caf50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'white',
            fontSize: '30px',
            fontWeight: 'bold'
        }
    }, '✓');
}

function SvgIcon({ viewBox, size = 16, children, ...props }) {
    return h('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: viewBox || '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ...props
    }, children);
}

function Icon({ size = 16, ...props }) {
    return h('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ...props
    });
}

export function IconPlus({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
        h('line', { x1: '5', y1: '12', x2: '19', y2: '12' })
    );
}

export function IconEdit({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
        h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
    );
}

export function IconTrash({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('polyline', { points: '3 6 5 6 21 6' }),
        h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
    );
}

export function IconSave({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z' }),
        h('polyline', { points: '17 21 17 13 7 13 7 21' }),
        h('polyline', { points: '7 3 7 8 15 8' })
    );
}

export function IconArrowLeft({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('line', { x1: '19', y1: '12', x2: '5', y2: '12' }),
        h('polyline', { points: '12 19 5 12 12 5' })
    );
}

export function IconTrophy({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6' }),
        h('path', { d: 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18' }),
        h('path', { d: 'M4 22h16' }),
        h('path', { d: 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' }),
        h('path', { d: 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' }),
        h('path', { d: 'M18 2H6v7a6 6 0 0 0 12 0V2Z' })
    );
}

export function IconUsers({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }),
        h('circle', { cx: '9', cy: '7', r: '4' }),
        h('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }),
        h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })
    );
}

export function IconHome({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
        h('polyline', { points: '9 22 9 12 15 12 15 22' })
    );
}

export function IconShield({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
    );
}

export function IconBarChart({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('line', { x1: '18', y1: '20', x2: '18', y2: '10' }),
        h('line', { x1: '12', y1: '20', x2: '12', y2: '4' }),
        h('line', { x1: '6', y1: '20', x2: '6', y2: '14' })
    );
}

export function IconAward({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('circle', { cx: '12', cy: '8', r: '6' }),
        h('path', { d: 'M15.477 12.89 17 22l-5-3-5 3 1.523-9.11' })
    );
}

export function IconStar({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' })
    );
}

export function IconFileText({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
        h('polyline', { points: '14 2 14 8 20 8' }),
        h('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
        h('line', { x1: '16', y1: '17', x2: '8', y2: '17' })
    );
}

export function IconMenu({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('line', { x1: '4', y1: '6', x2: '20', y2: '6' }),
        h('line', { x1: '4', y1: '12', x2: '15', y2: '12' }),
        h('line', { x1: '4', y1: '18', x2: '20', y2: '18' })
    );
}

export function IconClose({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
        h('line', { x1: '18', y1: '6', x2: '6', y2: '18' })
    );
}

export function IconLogOut({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }),
        h('polyline', { points: '16 17 21 12 16 7' }),
        h('line', { x1: '21', y1: '12', x2: '9', y2: '12' })
    );
}

export function IconEye({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
        h('circle', { cx: '12', cy: '12', r: '3' })
    );
}

export function IconCalendar({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' }),
        h('line', { x1: '16', y1: '2', x2: '16', y2: '6' }),
        h('line', { x1: '8', y1: '2', x2: '8', y2: '6' }),
        h('line', { x1: '3', y1: '10', x2: '21', y2: '10' })
    );
}

export function IconCheckCircle({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
        h('polyline', { points: '22 4 12 14.01 9 11.01' })
    );
}

export function IconMap({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('polygon', { points: '1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6' }),
        h('line', { x1: '8', y1: '2', x2: '8', y2: '18' }),
        h('line', { x1: '16', y1: '6', x2: '16', y2: '22' })
    );
}

export function IconGamepad({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('line', { x1: '6', y1: '11', x2: '10', y2: '11' }),
        h('line', { x1: '8', y1: '9', x2: '8', y2: '13' }),
        h('line', { x1: '15', y1: '12', x2: '15.01', y2: '12' }),
        h('line', { x1: '18', y1: '10', x2: '18.01', y2: '10' }),
        h('path', { d: 'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z' })
    );
}

export function IconMapPin(props) {
    return h(MapPin, { size: 16, ...props });
}

export function IconDistrict({ size = 16, ...props }) {
    return h(Landmark, { size, ...props });
}

export function IconActivity({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('circle', { cx: '12', cy: '12', r: '10' }),
        h('polyline', { points: '12 6 12 12 16 14' })
    );
}

export function IconAlertCircle({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('circle', { cx: '12', cy: '12', r: '10' }),
        h('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
        h('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' })
    );
}

export function IconSport({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('circle', { cx: '12', cy: '12', r: '5' }),
        h('path', { d: 'M12 1v4' }),
        h('path', { d: 'M12 19v4' }),
        h('path', { d: 'M1 12h4' }),
        h('path', { d: 'M19 12h4' }),
        h('path', { d: 'M4.22 4.22l2.83 2.83' }),
        h('path', { d: 'M16.95 16.95l2.83 2.83' }),
        h('path', { d: 'M4.22 19.78l2.83-2.83' }),
        h('path', { d: 'M16.95 7.05l2.83-2.83' })
    );
}

export function IconSettings({ size = 16, ...props }) {
    return h(Icon, { size, ...props },
        h('circle', { cx: '12', cy: '12', r: '3' }),
        h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' })
    );
}

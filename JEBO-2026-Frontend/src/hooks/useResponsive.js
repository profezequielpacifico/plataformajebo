import { useState, useEffect } from 'react';

const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280
};

export function calcUiScale(width = window.innerWidth, height = window.innerHeight) {
    const escala = Math.min(width / 1600, height / 800);
    return Math.round(Math.min(Math.max(escala, 1), 1.6) * 100) / 100;
}

export function useUiScale() {
    const [escala, setEscala] = useState(() => calcUiScale());

    useEffect(() => {
        const handleResize = () => setEscala(calcUiScale());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return escala;
}

export function useResponsive() {
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        let timer;
        const handleResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setWidth(window.innerWidth), 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    return {
        width,
        isSm: width < breakpoints.sm,
        isMd: width < breakpoints.md,
        isLg: width < breakpoints.lg,
        isXl: width < breakpoints.xl,
        lessThan: (bp) => width < (typeof bp === 'string' ? breakpoints[bp] : bp),
        greaterThan: (bp) => width >= (typeof bp === 'string' ? breakpoints[bp] : bp),
        breakpoints
    };
}

export default useResponsive;

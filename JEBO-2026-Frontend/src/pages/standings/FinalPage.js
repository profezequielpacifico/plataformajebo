import React from 'react';
import { Card, CardHeader } from '../../components/ui/Card.js';

const { createElement: h } = React;

export function FinalPage() {
    return h(Card, null,
        h(CardHeader, { title: 'Finales del Torneo' }),
        h('p', { style: { color: '#6b7280', fontSize: '13px' } },
            'Gestión de las finales del torneo JEBO 2026.'
        )
    );
}

export default FinalPage;

import React from 'react';
import { COLORS } from '../../styles/theme/index.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';

const { createElement: h } = React;

export function ClassicStandingsTable({ standingsData, setStandingsData }) {
    const handleInputChange = (rowIndex, field, value) => {
        const newValue = value === '' ? 0 : parseInt(value, 10);
        setStandingsData(prevData => {
            const newData = [...prevData];
            newData[rowIndex] = { ...newData[rowIndex], [field]: newValue };
            return newData;
        });
    };

    return h('div', { className: 'standings-table-container' },
        h(Table, null,
            h(TableHeader, { className: 'standings-table-header' },
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '80px', minWidth: '80px' } }, 'Region'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '60px', minWidth: '60px' } }, '1'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '60px', minWidth: '60px' } }, '2'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '60px', minWidth: '60px' } }, '3'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '60px', minWidth: '60px' } }, '4'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '60px', minWidth: '60px' } }, '5'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '80px', minWidth: '80px' } }, 'Gol a Favor'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '80px', minWidth: '80px' } }, 'Gol en contra'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '90px', minWidth: '90px' } }, 'Diferencia de goles'),
                h(TableHeaderCell, { className: 'standings-table-header-cell', align: 'center', style: { width: '70px', minWidth: '70px' } }, 'Posicion')
            ),
            h('tbody', null,
                standingsData.map((row, index) =>
                    h(TableRow, {
                        key: index,
                        className: 'standings-table-row'
                    },
                        h(TableCell, { className: 'standings-region-cell', align: 'center' }, row.region),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.match1,
                                onChange: (e) => handleInputChange(index, 'match1', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.match2,
                                onChange: (e) => handleInputChange(index, 'match2', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.match3,
                                onChange: (e) => handleInputChange(index, 'match3', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.match4,
                                onChange: (e) => handleInputChange(index, 'match4', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.match5,
                                onChange: (e) => handleInputChange(index, 'match5', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.gf,
                                onChange: (e) => handleInputChange(index, 'gf', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.gc,
                                onChange: (e) => handleInputChange(index, 'gc', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell', align: 'center' },
                            h('input', {
                                type: 'number',
                                value: row.dg,
                                onChange: (e) => handleInputChange(index, 'dg', e.target.value),
                                className: 'standings-input'
                            })
                        ),
                        h(TableCell, { className: 'standings-table-cell standings-highlight-cell', align: 'center' }, index + 1)
                    )
                )
            )
        )
    );
}

export default ClassicStandingsTable;

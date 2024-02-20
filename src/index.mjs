// @ts-check
import { h, render } from 'preact';
import { useState } from 'preact/hooks';

import {
    parseXLSX,
    classInfoKeyTitles,
} from './parser/utils.mjs';
import Bustan from './parser/bustan.mjs';
import Golestan from './parser/golestan.mjs';

import Table from './components/table.mjs';
import Navbar from './components/navbar.mjs';
import {
    DayMajorPlanner,
    ComplicatedAndBuggyPlanner,
} from './components/planner.mjs';

import './style.css';

/**
 * creates an async loader callback for Navbar component
 * @param {import('./parser/types').ExcelColumnMapper} a
 * @param {import('./parser/types').RowIDGenerator} b
 * @param {Function} setData
 * @param {Function} setPicks
 */
function generateLoader(a, b, setData, setPicks) {
    return /** @param {File} file */ async (file) => {
        const buffer = await file.arrayBuffer();
        const parsed = await parseXLSX(buffer, a, b);
        if (parsed !== undefined) {
            setData(parsed);
            setPicks({ids:[],items:[]});
        } else setData([]);
    };
};

// ! TODO: customization
const _cls = 'container mx-auto p-2.5';
const accept = ['xlsx'];
const customizableColumns = true;
const enableSearch = true;
const pagination = 25;
const Planner = DayMajorPlanner;

function App() {
    const name = this.constructor.name;

    /** @type {[import('./parser/types').ClassInfo[], Function]} */
    const [data, setData] = useState([]);

    const [picks, setPicks] = useState({
        /** @type {Array<import('./parser/types').ClassInfo['id']>} */
        ids: [],
        /** @type {Array<import('./parser/types').ClassInfo>} */
        items: []
    });

    /** @type {Record<string, { title: string, loader: (f: File) => Promise<void> }>} */
    const handlers = {
        'bustan': {
            title: 'بوستان',
            loader: generateLoader(Bustan.defaultAssigners, Bustan.defaultGetRowId, setData, setPicks)
        },
        'golestan': {
            title: 'گلستان',
            loader: generateLoader(Golestan.defaultAssigners, Golestan.defaultGetRowId, setData, setPicks)
        },
    };

    return h('div', { name, class: _cls },
        h(Navbar, { accept, handlers }),
        h(Table, {
            rows: data,
            columnTitles: classInfoKeyTitles,
            pagination,
            enableSearch,
            customizableColumns,
            isSelected: (row) => picks.ids.includes(row.id),
            setSelect: (row, isSelected) => {
                const alreadyPicked = picks.ids.includes(row.id);
                // isSelected(true)  === alreadyPicked(true)
                // isSelected(false) === alreadyPicked(false)
                // otherwise update picks
                (isSelected !== alreadyPicked) && setPicks({
                    ids: isSelected
                        ? [...picks.ids, row.id]
                        : picks.ids.filter(v => (v !== row.id)),
                    /** @ts-ignore god kill me why is this thing so retarded */
                    items: isSelected
                        ? [...picks.items, row]
                        : picks.items.filter(r => (r.id !== row.id)),
                });
            },
        }),
        h(Planner, { picks: picks.items })
    );
}

render(
    h(App, null),
    document.body
);

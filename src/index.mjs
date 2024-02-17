// @ts-check
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import { parseXLSX, classInfoKeyTitles } from './parser/utils.mjs';
import Bustan from './parser/bustan.mjs';
import Golestan from './parser/golestan.mjs';
import Table from './components/table.mjs';
import Navbar from './components/navbar.mjs';

import './style.css';

function generateLoader(a, b, setData) {
    return async (file) => {
        const buffer = await file.arrayBuffer();
        const parsed = await parseXLSX(buffer, a, b);
        if (parsed !== undefined) setData(parsed);
        else setData([]);
    };
};

function App() {
    const name = this.constructor.name;
    const _cls = 'container mx-auto p-2.5';

    /** @type {[import('./parser/types').ClassInfo[], Function]} */
    const [data, setData] = useState([]);

    /** @type {Record<string, { title: string, loader: (f: File) => Promise<void> }>} */
    const handlers = {
        'bustan': {
            title: 'بوستان',
            loader: generateLoader(Bustan.defaultAssigners, Bustan.defaultGetRowId, setData)
        },
        'golestan': {
            title: 'گلستان',
            loader: generateLoader(Golestan.defaultAssigners, Golestan.defaultGetRowId, setData)
        },
    };

    const accept = ['xlsx'];

    return h('div', { name, class: _cls },
        h(Navbar, { accept, handlers }),
        h(Table,  { items: data, titles: classInfoKeyTitles, pagination: 25 }),
    );
}

render(
    h(App, null),
    document.body
);

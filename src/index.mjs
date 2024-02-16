// @ts-check
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import { parseXLSX, classInfoKeyTitles } from './parser/utils.mjs';
import Bustan from './parser/bustan.mjs';
import Golestan from './parser/golestan.mjs';
import Table from './components/table.mjs';
import Navbar from './components/navbar.mjs';

import './style.css';

function App() {
    const name = this.constructor.name;
    const _cls = 'container mx-auto p-2.5';

    /** @type {[any[], Function]} */
    const [data, setData] = useState([]);

    const buildLoader = (a, b) => {
        return async (file) => {
            const buffer = await file.arrayBuffer();
            const parsed = await parseXLSX(buffer, a, b);
            (parsed !== undefined) && setData(parsed);
        };
    };

    /** @type {Record<string, { title: string, loader: (f: File) => Promise<void> }>} */
    const handlers = {
        'bustan': { title: 'بوستان', loader: buildLoader(Bustan.defaultAssigners, Bustan.defaultGetRowId) },
        'golestan': { title: 'گلستان', loader: buildLoader(Golestan.defaultAssigners, Golestan.defaultGetRowId) },
    };

    const accept = ['xlsx'];

    return h('div', { name, class: _cls },
        h(Navbar, { accept, handlers, data, setData }),
        h(Table,  { items: data, caption: undefined, titles: classInfoKeyTitles, pagination: 25 }),
    );
}

render(
    h(App, null),
    document.body
);

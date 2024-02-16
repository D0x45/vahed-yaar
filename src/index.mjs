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

    const [data, setData] = useState({
        /** @type {undefined|Partial<Record<keyof import('./parser/types').ClassInfo, string>>} */
        columnClass: undefined,
        /** @type {import('./parser/types').ClassInfo[]} */
        items: [],
    });

    const buildLoader =
    /** @param {typeof data['columnClass']} columnClass */
    (a, b, columnClass) => {
        return async (file) => {
            const buffer = await file.arrayBuffer();
            const parsed = await parseXLSX(buffer, a, b);
            (parsed !== undefined) && setData({ columnClass, items: parsed });
        };
    };

    /** @type {Record<string, { title: string, loader: (f: File) => Promise<void> }>} */
    const handlers = {
        'bustan': {
            title: 'بوستان',
            loader: buildLoader(
                Bustan.defaultAssigners,
                Bustan.defaultGetRowId,
                {
                    credit: 'hidden',
                    campusId: 'hidden lg:inline',
                    courseType: 'hidden lg:inline',
                }
            )
        },
        'golestan': {
            title: 'گلستان',
            loader: buildLoader(
                Golestan.defaultAssigners,
                Golestan.defaultGetRowId,
                {
                    courseType: 'hidden',
                    courseId: 'hidden lg:inline',
                    campusId: 'hidden md:inline',
                    sessions: 'hidden md:inline',
                }
            )
        },
    };

    const accept = ['xlsx'];

    return h('div', { name, class: _cls },
        h(Navbar, { accept, handlers }),
        h(Table,  { items: data.items, columnClass: data.columnClass, titles: classInfoKeyTitles, pagination: 25 }),
    );
}

render(
    h(App, null),
    document.body
);

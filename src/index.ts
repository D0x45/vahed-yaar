// App
// ┌────────────────────────────────────────────┐
// │  Navbar                                    │
// │ ┌────────────────────────────────────────┐ │
// │ │ set input files and dataset type.      │ │
// │ └────────────────────────────────────────┘ │
// │  Planner                                   │
// │ ┌────────────────────────────────────────┐ │
// │ │ display the items selected and bold out│ │
// │ │ any overlapping items.                 │ │
// │ │                                        │ │
// │ └────────────────────────────────────────┘ │
// │  Data View Table                           │
// │ ┌────────────────────────────────────────┐ │
// │ │ a table that allows displaying generic │ │
// │ │ array of records with pagination and   │ │
// │ │ searching through rows.                │ │
// │ │                                        │ │
// │ │ allows customization and stuff.        │ │
// │ │                                        │ │
// │ │                                        │ │
// │ └────────────────────────────────────────┘ │
// └────────────────────────────────────────────┘

import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import { ClassInfo } from './types';

// import {
//     parseXLSX,
//     classInfoKeyTitles,
// } from './parser/utils.mjs';
// import Bustan from './parser/bustan.mjs';
// import Golestan from './parser/golestan.mjs';

// import Table from './components/table.mjs';
// import Navbar from './components/navbar.mjs';
// import {
//     DayMajorPlanner,
//     ComplicatedAndBuggyPlanner,
// } from './components/planner.mjs';

// import './style.css';


//// T ODO: customization
// const _cls = ;
// const ACCEPT = ['xlsx'];
// const CUSTOM_COLUMNS = true;
// const ALOW_SEARCH = true;
// const PAGINATION = 15;
// const MAX_CREDIT = 24;
// const Planner = DayMajorPlanner;

type DataSetLoader = (f: File) => Promise<void>;

function App(
    this: typeof App,
    { dataLoaders }: { dataLoaders: Record<string, DataSetLoader> }
) {
    const name = this.constructor.name;

    const [dataRows, setDataRows] = useState<ClassInfo[]>([]);

    // an array of index numbers just to prevent data duplication
    const [pickedRows, setPickedRows] = useState<number[]>([]);

    // const handlers = {
    //     'bustan': {
    //         title: 'بوستان',
    //         loader: generateLoader(Bustan.defaultAssigners, Bustan.defaultGetRowId, setData)
    //     },
    //     'golestan': {
    //         title: 'گلستان',
    //         loader: generateLoader(Golestan.defaultAssigners, Golestan.defaultGetRowId, setData)
    //     },
    // };

    return h('div', { name, class: 'container mx-auto p-2.5' },
        h(Navbar, { accept: ACCEPT, handlers }),
        h(Planner, { picks: picks.items, clearPicks: () => setPicks({ids: [], items: []}), maxCredit: MAX_CREDIT }),
        h(Table, {
            rows: data,
            columnTitles: classInfoKeyTitles,
            pagination: PAGINATION,
            enableSearch: ALOW_SEARCH,
            customizableColumns: CUSTOM_COLUMNS,
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
    );
}

render(
    h(App, null),
    document.body
);

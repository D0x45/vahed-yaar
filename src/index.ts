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
import {
    useMemo,
    useState,
} from 'preact/hooks';
import {
    type ClassInfo,
    type ClassInfoParser,
} from './types';
import * as util from './parser/common';
import { BustanParser } from './parser/bustan';
// import * as Golestan from './parser/golestan';
import Navbar from './components/navbar';
import DayMajorPlanner from './components/planner';
import Table from './components/table';
import Footer from './components/footer';
import './style.css'

function App(
    this: typeof App, {
        parsers,
        maxCredit,
        pagination,
        enableSearch,
        searchBoxHint,
        customizableColumns,
        useLocalStorage,
    }: {
        parsers: Array<new () => ClassInfoParser>,
        maxCredit: number,
        pagination: number,
        enableSearch?: boolean,
        searchBoxHint?: string,
        customizableColumns?: boolean,
        useLocalStorage?: boolean,
    }
) {
    const name = this.constructor.name;

    const [dataRows, setDataRows] = useState<ClassInfo[]>([]);
    const [pickedRows, setPickedRows] = useState<ClassInfo[]>([]);

    // construct the parsers, bind their result to the component state,
    // and also catch the exceptions they may throw...
    const boundParsers = useMemo(() => {
        return Object.fromEntries(
            parsers.map(ctor => {
                const p = new ctor();
                p.setLocalStorageUse(!!useLocalStorage);
                return [
                    p.getDisplayName(),
                    async function (f: File) {
                        try {
                            const parsed = await p.parseFile(f);
                            setDataRows(parsed);
                            setPickedRows([]);
                        } catch (e) {
                            // TODO: show a better dialog :0
                            alert(e);
                            console.error(e);
                        }
                    }
                ];
            })
        );
    }, [parsers]);

    console.debug(`[${name}] parsers=`, parsers);
    console.debug(`[${name}] boundParsers=`, boundParsers);
    console.debug(`[${name}] pickedRows=`, pickedRows);
    console.debug(`[${name}] dataRows=`, dataRows);

    return h('div', { name, class: 'container mx-auto p-2.5' },
        h(Navbar, { datasetLoaders: boundParsers }),
        h(DayMajorPlanner, {
            pickedRows, maxCredit,
            clearPicks: () => setPickedRows([])
        }),
        h(Table<ClassInfo>, {
            dataRows,
            columnTitles: util.classInfoKeyTitles,
            pagination,
            enableSearch,
            customizableColumns,
            useLocalStorage,
            isSelected: (row: ClassInfo) => pickedRows.some(c => c.id === row.id),
            setSelect: (row: ClassInfo, isSelected: boolean) => {
                const alreadyIncludes = pickedRows.some(c => c.id === row.id);
                // row is not in the list and was selected
                if (!alreadyIncludes && isSelected)
                    setPickedRows([row, ...pickedRows]);
                // row is in the list and was unselected
                if (!isSelected && alreadyIncludes)
                    setPickedRows(pickedRows.filter(c => c.id !== row.id));
            },
            searchBoxHint
        }),
        h(Footer, null),
    );
}

render(
    h(App, {
        parsers: [ BustanParser ],
        maxCredit: 24,
        pagination: 30,
        enableSearch: true,
        customizableColumns: true,
        useLocalStorage: true,
        searchBoxHint: 'برای مثال «روز:شنبه» را جستجو کنید...'
    }),
    document.body
);

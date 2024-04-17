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

import {
    type ClassInfo,
    type DatasetLoaderMap,
    type ExcelColumnMapper,
    type RowIDGenerator,
    type DatasetLoader,
} from './types';

import { h, render } from 'preact';
import {
    type StateUpdater,
    useState,
} from 'preact/hooks';

import * as util from './parser/utils';
import * as Bustan from './parser/bustan';
import * as Golestan from './parser/golestan';

import Navbar from './components/navbar';
import DayMajorPlanner from './components/planner';
import Table from './components/table';

import './style.css'

function makeLoaderFn(
    mapper: ExcelColumnMapper,
    idGen: RowIDGenerator,
    updateDataset: StateUpdater<ClassInfo[]>,
    setPickedRows: StateUpdater<ClassInfo[]>,
): DatasetLoader['fn'] {
    return async (file: File) => {
        let result = undefined;
        const ext = file.name.substring(file.name.lastIndexOf('.') + 1);

        if (ext !== 'xlsx')
            return alert(`file type '${ext}' is not supported!`);

        try {
            result = await util.parseXLSX(await file.arrayBuffer(), mapper, idGen);
        } catch (e) {
            return alert(e);
        }

        if (result === undefined)
            return alert('there was a problem parsing the dataset!');

        updateDataset(result);
        setPickedRows([]);
    }
}

function App(
    this: typeof App,
    {
        maxCredit,
        pagination,
        enableSearch,
        customizableColumns,
    } : {
        maxCredit: number,
        pagination: number,
        enableSearch?: boolean,
        customizableColumns?: boolean,
    }
) {
    const name = this.constructor.name;

    const [dataRows, setDataRows] = useState<ClassInfo[]>([]);
    const [pickedRows, setPickedRows] = useState<ClassInfo[]>([]);

    /** @todo find a better way to accept this as a prop and bind it to `setDataRows` (maybe currying?) */
    const datasetLoaders: DatasetLoaderMap = {
        'bustan': {
            title: 'بوستان',
            fn: makeLoaderFn(Bustan.defaultMappers, Bustan.defaultGetRowId, setDataRows, setPickedRows)
        },
        'golestan': {
            title: 'گلستان',
            fn: makeLoaderFn(Golestan.defaultMapper, Golestan.defaultGetRowId, setDataRows, setPickedRows)
        }
    };

    return h('div', { name, class: 'container mx-auto p-2.5' },
        h(Navbar, { datasetLoaders }),
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
            isSelected: (row: ClassInfo) => pickedRows.some(c => c.id === row.id),
            setSelect: (row: ClassInfo, isSelected: boolean) => {
                const alreadyIncludes = pickedRows.some(c => c.id === row.id);
                // row is not in the list and was selected
                if (!alreadyIncludes && isSelected)
                    setPickedRows([row, ...pickedRows]);
                // row is in the list and was unselected
                if (!isSelected && alreadyIncludes)
                    setPickedRows(pickedRows.filter(c => c.id !== row.id));
                // discarded states:
                //  isSelected && alreadyIncludes
                // !isSelected && !alreadyIncludes
            },
        }),
    );
}

render(
    h(App, {
        maxCredit: 24,
        pagination: 15,
        enableSearch: true,
        customizableColumns: true,
    }),
    document.body
);

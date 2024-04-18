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
): DatasetLoader<ClassInfo>['fn'] {
    return async (file: File) => {
        const ext = file.name.substring(file.name.lastIndexOf('.') + 1);
        let result: undefined | ClassInfo[];

        try {
            switch (ext) {
                case 'xlsx':
                    result = await util.parseXLSX(await file.arrayBuffer(), mapper, idGen);
                    break;
                default:
                    throw new Error(`file type '${ext}' is not supported!`)
            }
            if (result === undefined || result.length === 0)
                throw new Error('there was a problem parsing the dataset!');
        } catch (e) {
            alert(e);
            return undefined;
        }

        return result;
    }
}

function wrapLoaderWithState<T>(
    loader: DatasetLoader<T>['fn'],
    setDataRows: StateUpdater<T[]>,
    setPickedRows: StateUpdater<T[]>,
): DatasetLoader<T>['fn'] {
    return async (file: File) => {
        const dataset = await loader(file);
        if (dataset !== undefined) {
            setDataRows(dataset);
            setPickedRows([]);
        }
        return undefined;
    };
}

const presetLoaders: DatasetLoaderMap<ClassInfo> = {
    'bustan': {
        title: 'بوستان',
        fn: makeLoaderFn(Bustan.defaultMappers, Bustan.defaultGetRowId)
    },
    'golestan': {
        title: 'گلستان',
        fn: makeLoaderFn(Golestan.defaultMapper, Golestan.defaultGetRowId)
    }
};

function App(
    this: typeof App, {
        datasetLoaders,
        maxCredit,
        pagination,
        enableSearch,
        customizableColumns,
    }: {
        datasetLoaders: DatasetLoaderMap<ClassInfo>,
        maxCredit: number,
        pagination: number,
        enableSearch?: boolean,
        customizableColumns?: boolean,
    }
) {
    const name = this.constructor.name;

    const [dataRows, setDataRows] = useState<ClassInfo[]>([]);
    const [pickedRows, setPickedRows] = useState<ClassInfo[]>([]);
    const wrappedLoaders: DatasetLoaderMap<ClassInfo> = {};

    // wrap the given loaders to app states
    for (const loaderName in datasetLoaders) {
        wrappedLoaders[loaderName] = {
            title: datasetLoaders[loaderName].title,
            fn: wrapLoaderWithState<ClassInfo>(
                datasetLoaders[loaderName].fn,
                setDataRows, setPickedRows
            )
        };
    }

    return h('div', { name, class: 'container mx-auto p-2.5' },
        h(Navbar<ClassInfo>, { datasetLoaders: wrappedLoaders }),
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
        datasetLoaders: presetLoaders,
        maxCredit: 24,
        pagination: 15,
        enableSearch: true,
        customizableColumns: true,
    }),
    document.body
);

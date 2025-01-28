import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import * as util from '../parser/utils';

function makeCaption(start: any, end: any, total: any, page: any, query: any) {
    return `نمایش ردیف ${start}-${end} از ${total} (صفحه ${page})`
        + (query ? ` (نتایج جستجو: "${query}")` : '');
}

// ! TODO: localization and custom css
const _table = [
    'w-full', 'text-sm',
    'text-center', 'text-gray-500'
].join(' ');
const _thead = [
    'text-xs', 'text-gray-700',
    'uppercase', 'bg-gray-50',
    'border', 'border-gray-200'
].join(' ');
const _pg_btn = [
    'text-gray-500', 'text-sm',
    'border', 'border-gray-500',
    'px-1', 'mr-1', 'rounded'
].join(' ');
const _alert_class = [
    'w-full', 'text-center', 'py-1.5', 'rounded',
    'bg-gray-100', 'border', 'border-gray-400',
    'text-gray-500', 'px-2',
].join(' ');
const _alert_text = 'داده ای برای نمایش نیست!'
const _caption = [
    'mb-2', 'text-right', 'text-sm',
    'font-normal', 'text-gray-500'
].join(' ');
const _input_class = [
    'bg-gray-200', 'border-gray-200', 'text-gray-700',
    'focus:border-purple-500',
    'appearance-none', 'text-sm', 'leading-tight',
    'border-1', 'rounded', 'mr-1', 'grow'
].join(' ');
const _input_placeholder = 'جستجو...';
const _next_pg = 'بعدی';
const _prev_pg = 'قبلی';

function Table<T extends Record<string, any>>(
    this: typeof Table, {
        dataRows, columnTitles, pagination,
        customizableColumns,
        enableSearch, isSelected, setSelect,
        searchBoxHint
    }: {
        dataRows: T[],
        columnTitles: Record<keyof T, string>,
        pagination: number,
        customizableColumns?: boolean,
        enableSearch?: boolean,
        isSelected?: ((row: T) => boolean),
        setSelect?: ((row: T, x: boolean) => void),
        searchBoxHint?: string
    }
) {
    const name = this.constructor.name;
    const invalidData = dataRows.length === 0;
    const columns = Object.keys(columnTitles);

    const [page, setPage] = useState(1);
    const [hiddenCols, setHiddenCols] = useState<string[]>([]);
    const [query, setQuery] = useState('');

    const items = useMemo<Array<Record<keyof typeof columnTitles, any>>>(() => {
        // reset page on change
        setPage(1);
        // split query into subqueries
        const subqueries = query.trim().split(' ');
        // ! TODO: improve generic search
        return query
            ? dataRows.filter(r => {
                const rowStr = JSON.stringify(r);
                return !!subqueries.filter(q => rowStr.includes(q)).length;
            })
            : dataRows;
    }, [dataRows, query]);

    const p0 = pagination * (page - 1);
    const p1 = pagination * page;

    console.debug(`[${name}] hiddenCols=`, hiddenCols);
    console.debug(`[${name}] query=`, query);
    console.debug(`[${name}] page=`, page);
    console.debug(`[${name}] columns=`, columns);
    console.debug(`[${name}] p0=`, p0);
    console.debug(`[${name}] p1=`, p1);

    return h('div', { name, class: 'flex justify-center mb-4' },
        // invalid data alert:
        invalidData ? h('span', { class: _alert_class }, _alert_text) :
            // table itself:
            h('table', { class: _table },
                h('caption', { class: _caption },
                    h('div', { class: 'flex mb-1' },
                        // table caption
                        makeCaption(
                            util.clamp(p0, 1, items.length),
                            util.clamp(p1, 1, items.length),
                            items.length, page, query
                        ),
                        // next page button
                        h('button', {
                            class: _pg_btn,
                            onClick: () => setPage(p => ((p * pagination) < items.length) ? ++p : p)
                        }, _next_pg),
                        // previous page
                        h('button', {
                            class: _pg_btn,
                            onClick: () => setPage(p => ((p - 1) * pagination) < 1 ? p : --p)
                        }, _prev_pg),
                        // search box
                        enableSearch ? h('input', {
                            type: 'text',
                            class: _input_class,
                            placeholder: searchBoxHint || _input_placeholder,
                            onChange: ({ target }) => {
                                const newQuery = target && ('value' in target) && (typeof target.value === 'string')
                                    ? target.value.trim()
                                    : undefined;
                                // update query only if changed
                                (newQuery !== query) && setQuery(newQuery || '');
                            }
                        }) : undefined,
                    ),
                    // columns checkbox
                    ...columns.map(col => customizableColumns ? [
                        /** @ts-ignore */
                        h('input', {
                            id: `ch-${col}`,
                            type: 'checkbox',
                            class: 'mr-2',
                            checked: !hiddenCols.includes(col),
                            onChange: (e: any) => e.target && setHiddenCols(c => {
                                if (e.target['checked']) c = c.filter(v => v !== col);
                                else c.push(col);
                                return [...c];
                            })
                        }),
                        h('label', { for: `ch-${col}`, class: 'mr-1' }, columnTitles[col])
                    ] : undefined),
                ),
                h('thead', { class: _thead },
                    h('tr', null,
                        // an optional select column if any selection utility provided
                        (setSelect && isSelected) ? h('th', null, '~') : undefined,
                        // the rest of the columns
                        ...columns.map(
                            col => h('th', {
                                class: hiddenCols.includes(col) ? 'hidden' : undefined
                            }, columnTitles[col])
                        )
                    )
                ),
                h('tbody', null,
                    ...items.slice(p0, p1).map(row => {
                        return h('tr', { class: 'odd:bg-white even:bg-gray-100 border border-gray-200' },
                            // a checkbox cell if any selection utility was provided
                            (setSelect && isSelected) ? h('td', null,
                                // @ts-ignore
                                h('input', {
                                    type: 'checkbox',
                                    checked: isSelected(row),
                                    onChange: (e: any) => e.target && setSelect(row, !!e.target['checked'])
                                })
                            ) : undefined,
                            // the rest of the data cells
                            ...columns.map(col => {
                                const cellData = row[col];
                                return h('td', { class: hiddenCols.includes(col) ? 'hidden' : undefined },
                                    // empty values are represented with a dash
                                    (cellData == undefined || cellData == null) || (
                                        typeof (cellData) === 'object'
                                        && 'length' in cellData
                                        && cellData.length === 0
                                    ) ? '-' : (
                                        Array.isArray(cellData) && (cellData.length > 1)
                                            // generate an array with <br/> between the items
                                            ? util.fillBetweenArray(cellData, h('br', null), (i: any) => i?.toString())
                                            : cellData.toString()
                                    )
                                )
                            })
                        );
                    })
                )
            )
    );
}

export default Table;

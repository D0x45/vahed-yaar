// @ts-check
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { clamp } from '../parser/utils.mjs';

function genCaption(start, end, total, page, query) {
    return `نمایش ${start}-${end} ردیف از ${total} (صفحه ${page})`
            + (query ? ` (نتایج جستجو: "${query}")` : '');
}

// ! TODO: localization and custom css
const _table = 'w-full text-sm text-center text-gray-500 dark:text-gray-400';
const _thead = 'text-xs text-gray-700 uppercase bg-gray-50';
const _pg_btn = 'text-gray-500 text-sm border border-gray-500 px-1 mr-1 rounded';
const _alert = {
    class: 'w-full text-center bg-gray-100 border border-gray-400 text-gray-500 px-2 py-1.5 rounded',
    text: 'داده ای برای نمایش نیست!'
};
const _caption = 'mb-2 text-right text-sm font-normal text-gray-500 dark:text-gray-400';
const _input =  {
    class: [
        'bg-gray-200 border-gray-200 text-gray-700',
        'focus:border-purple-500',
        'appearance-none text-sm leading-tight',
        'border-1 rounded mr-3'
    ].join(' '),
    placeholder: 'جستجو...',
};
const _next_pg = 'بعدی';
const _prev_pg = 'قبلی';

/**
 * @template {Record<string, any>} T
 * @param {Object} props
 * @param {T[]} props.rows
 * @param {Record<keyof T, string>} props.columnTitles
 * @param {number} props.pagination
 * @param {undefined|((row: T) => boolean)} props.isSelected
 * @param {undefined|((row: T, x: boolean) => void)} props.setSelect
 */
function Table({
    rows,
    columnTitles,
    pagination,
    isSelected,
    setSelect
}) {
    const name = this.constructor.name;
    const invalidData = (!Array.isArray(rows) || rows.length === 0);
    const columns = Object.keys(columnTitles);

    // pagination
    const [page, setPage] = useState(1);

    /** @type {[string[], Function]} */
    const [hiddenCols, setHiddenCols] = useState([]);

    /** search query to filter rows */
    const [query, setQuery] = useState('');

    /** @type {Array<Record<keyof columnTitles, any>>} */
    const items = useMemo(() => {
        // reset page on change
        setPage(1);
        // ! TODO: improve search
        return query
            ? rows.filter(r => JSON.stringify(r).includes(query))
            : rows;
    }, [rows, query]);

    return h('div', { name, class: 'flex justify-center mb-4' },
            // invalid data alert:
            invalidData ? h('span', { class: _alert.class }, _alert.text) :
            // table itself:
            h('table', { class: _table },
                h('caption', { class: _caption },
                    // table caption
                    genCaption(
                        clamp(pagination * (page-1), 1, items.length),
                        clamp(pagination * page, 1, items.length),
                        items.length,
                        page,
                        query
                    ),
                    // next page button
                    h('button', {
                        class: _pg_btn,
                        onclick: () => setPage(p => ((p * pagination) < items.length) ? ++p : p)
                    }, _next_pg),
                    // previous page
                    h('button', {
                        class: _pg_btn,
                        onclick: () => setPage(p => ((p-1) * pagination) < 1 ? p : --p)
                    }, _prev_pg),
                    // columns checkbox
                    ...columns.map(col => [
                        /** @ts-ignore */
                        h('input', {
                            id: `ch-${col}`,
                            type: 'checkbox',
                            class: 'mr-2',
                            checked: !hiddenCols.includes(col),
                            onChange: ({ target }) => target && setHiddenCols(c => {
                                if (target['checked']) c = c.filter(v => v !== col);
                                else c.push(col);
                                return [...c];
                            })
                        }),
                        h('label', { for: `ch-${col}`, class: 'mr-1' }, columnTitles[col])
                    ]),
                    // search box
                    h('input', {
                        type: 'text',
                        class: _input.class,
                        placeholder: _input.placeholder,
                        onChange: ({ target }) => {
                            const newQuery = target && ('value' in target) && (typeof target.value === 'string')
                                ? target.value.trim()
                                : undefined;
                            // update query only if changed
                            (newQuery !== query) && setQuery(newQuery || '');
                        }
                    })
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
                    ...items.slice(pagination * (page-1), pagination * page).map(row => {
                        return h('tr', { class: 'odd:bg-white even:bg-gray-100' },
                            // a checkbox cell if any selection utility was provided
                            (setSelect && isSelected) ? h('td', null,
                                // @ts-ignore
                                h('input', {
                                    type: 'checkbox',
                                    checked: isSelected(row),
                                    onChange: ({ target }) => target && setSelect(row, !!target['checked'])
                                })
                            ) : undefined,
                            // the rest of the ata cells
                            ...columns.map(col => h(
                                    'td', { class: hiddenCols.includes(col) ? 'hidden' : undefined },
                                    // empty values are represented with a dash
                                    (row[col] == undefined || row[col] == null) || (
                                        typeof(row[col]) === 'object'
                                        && 'length' in row[col]
                                        && row[col].length === 0
                                    ) ? '-' : (
                                        Array.isArray(row[col]) && (row[col].length > 1)
                                        // generate an array with <br/> in between of multiple items. yay
                                        ? [...row[col].flatMap((v, i) => (i+1) === row[col].length ? v.toString() : [v.toString(), h('br', null)] )]
                                        : row[col].toString()
                                    )
                                ))
                        );
                    })
                )
            )
        );
}

export default Table;

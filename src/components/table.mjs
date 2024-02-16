// @ts-check
import { h } from 'preact';
import { useState } from 'preact/hooks';

function clamp(a, min, max) {
    return Math.min(Math.max(a, min), max);
}

function Table({
    items,
    titles,
    pagination,
}) {
    const name = this.constructor.name;
    const invalidData = (!Array.isArray(items) || items.length === 0);

    // pagination
    const [page, setPage] = useState(1);
    const [columns, setColumns] = useState(Object.keys(titles));

    // ! TODO: localization and custom css
    const _table = 'w-full text-sm text-center text-gray-500 dark:text-gray-400';
    const _thead = 'text-xs text-gray-700 uppercase bg-gray-50';
    const _pg_btn = 'text-gray-500 text-sm border border-gray-500 px-1 mr-1 rounded';
    const _alert = {
        class: 'w-full bg-gray-100 border border-gray-400 text-gray-500 px-2 py-1.5 rounded',
        text: 'داده ای برای نمایش نیست!'
    };
    const _caption = 'mb-2 text-right text-sm font-normal text-gray-500 dark:text-gray-400';

    return invalidData
        ? h('span', { class: _alert.class }, _alert.text)
        : h('div', { name, class: 'flex justify-center mb-4' },
            // table itself:
            h('table', { class: _table },
                h('caption', { class: _caption },
                    // info
                    'نمایش ', clamp(pagination * (page-1), 1, items.length),
                    '-', clamp(pagination * page, 1, items.length),
                    ' ردیف از ', items.length,
                    ' (صفحه ', page, ')',
                    // next page
                    h('button', {
                        class: _pg_btn,
                        onclick: () => setPage(p => ((p * pagination) < items.length) ? ++p : p)
                    }, 'بعدی'),
                    // previous page
                    h('button', {
                        class: _pg_btn,
                        onclick: () => setPage(p => ((p-1) * pagination) < 1 ? p : --p)
                    }, 'قبلی'),
                ),
                h('thead', { class: _thead },
                    h('tr', null, ...columns.map( col => h('th', null, titles[col]) ) )
                ),
                h('tbody', null,
                    ...items.slice(pagination * (page-1), pagination * page).map(row => {
                        return h('tr', null,
                            ...columns.map(col => h(
                                    'td', null,
                                    // empty values are represented with a dash
                                    (row[col] == undefined || row[col] == null) || (
                                        typeof(row[col]) === 'object'
                                        && 'length' in row[col]
                                        && row[col].length === 0
                                    ) ? '-' : row[col].toString()
                                ))
                        );
                    })
                )
            )
        );
}

export default Table;

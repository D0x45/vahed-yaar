// @ts-check
import { h } from 'preact';

function Table({
    items,
    titles,
    caption,
    pagination,
}) {
    const name = this.constructor.name;

    const invalidData = (!Array.isArray(items) || items.length === 0);
    const columns = invalidData ? undefined : Object.keys(items[0]);

    // ! TODO: localization and custom css
    const _table = 'w-full text-sm text-right text-gray-500 dark:text-gray-400';
    const _thead = 'text-xs text-gray-700 uppercase bg-gray-50';
    const _alert = {
        class: 'w-full bg-gray-100 border border-gray-400 text-gray-500 px-2 py-1.5 rounded',
        text: 'داده ای برای نمایش نیست!'
    };
    const _caption = {
        class: 'mb-2 text-right text-sm font-normal text-gray-500 dark:text-gray-400',
        text: `${items.length} ردیف` + (caption ? ` - ${caption}` : '')
    };

    return h(
        'div', { name, class: 'flex justify-center mb-4' },
        // show alert if invalid data
        invalidData ? h('span', { class: _alert.class }, _alert.text) :
            // render the table otherwise
            h('table', { class: _table },
                // table caption:
                h('caption', { class: _caption.class }, _caption.text),
                h('thead', { class: _thead },
                    h('tr', null,
                        // @ts-ignore columns is never undefined here
                        ...columns.map(col => h(
                            'th', null,
                            (titles && (col in titles) ? titles[col] : col)
                        ))
                    )
                ),
                h('tbody', null,
                    ...items.map(row => {
                        return h('tr', null,
                            ...Object.values(row)
                                .map(value => h(
                                    'td', null,
                                    (value == undefined || value == null) ? '-' : value.toString()
                                ))
                        );
                    })
                )
            )
    );
}

export default Table;

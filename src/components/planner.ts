import {
    type Time,
    type ClassInfo,
} from '../types';

import { h } from 'preact';

import * as util from '../parser/utils';

const _thead = 'text-xs text-gray-700 uppercase bg-gray-50';
const _alert = {
    class: 'w-full text-center bg-gray-100 border border-gray-400 text-gray-500 px-2 py-1.5 rounded',
    text: 'جدول انتخاب خالی است...'
};

const _col_day = 'روز هفته';
const _col_name = 'کلاس های انتخاب شده';
const _tbl = 'w-full text-sm text-right text-gray-500 border border-gray-400';
const _tr = 'odd:bg-white even:bg-gray-100 border border-gray-400 bg-gray-100';
const _clr = {
    class: 'text-gray-500 border border-gray-500 px-1 mr-1 rounded',
    text: 'حذف همه'
};
const _export = {
    class: _clr.class,
    text: 'دریافت خروجی'
};

function DayMajorPlanner(
    this: typeof DayMajorPlanner,
    { pickedRows, clearPicks, maxCredit }: {
        maxCredit: number,
        pickedRows: ClassInfo[],
        clearPicks: () => void,
    }
) {
    const name = this.constructor.name;

    const picksByDay: ClassInfo[][] = Array.from({ length: 7 }, _ => []);
    const invalidOrNoData = pickedRows.length === 0;
    let totalPickedCredit = 0;

    if (invalidOrNoData === false) {
        for (const p of pickedRows) {
            totalPickedCredit += (p.credit || 0);
            for (const s of p.sessions) {
                // undefined day or duplicate item in the same day:
                if (
                    s.day === undefined
                    || picksByDay[s.day].some(c => c.id === p.id)
                ) continue;
                picksByDay[s.day].push(p);
            }
        }
    }

    console.debug(`[${name}] invalidOrNoData=`, invalidOrNoData);
    console.debug(`[${name}] totalPickedCredit=`, totalPickedCredit);
    console.debug(`[${name}] picksByDay=`, picksByDay);

    return h('div', { name, class: 'flex justify-center mb-4' },
        invalidOrNoData ? h('span', { class: _alert.class }, _alert.text) :
            h('table', { class: _tbl },
                h('thead', { class: _thead },
                    h('tr', null,
                        h('th', null, _col_day),
                        h(
                            'th', { class: (totalPickedCredit > maxCredit ? 'bg-red-200' : undefined) },
                            `${_col_name} (${totalPickedCredit} واحد)`,
                            h('button', {
                                class: _clr.class,
                                onClick: clearPicks
                            }, _clr.text),
                            h('button', {
                                class: _export.class,
                                onClick: () => {
                                    // meow
                                    window.open(
                                        window.URL.createObjectURL(
                                            util.makeCSV(
                                                picksByDay.flat(1)
                                            )
                                        )
                                    );
                                }
                            }, _export.text)
                        ),
                    )
                ),
                h('tbody', null,
                    ...picksByDay.map((itemsInDay, day) => {
                        if (itemsInDay.length === 0) return undefined;
                        const thisDaysSessions: Array<{ starts: Time, ends: Time, node: any }> = [];

                        // loop through current day's sessions and stringify them!
                        for (const item of itemsInDay) {
                            // check if exam date/time overlaps with another item
                            const examIsOverlapping = pickedRows.some(
                                c => (c != item) && c.exams.some(
                                    e => item.exams.some(
                                        x => (x.day === e.day) && (x.month === e.month) && (x.year === e.year)
                                        // && (x.hour === e.hour) && (x.minute === e.minute)
                                    )
                                )
                            );

                            // check the sessions
                            for (const s of item.sessions) {
                                if (s.day !== day) continue;
                                const timeStr = '[' + util.timeToStr(s.starts.hour, s.starts.minute, true)
                                    + '-' + util.timeToStr(s.ends.hour, s.ends.minute, true)
                                    + ']';

                                const evenOddFlag = (
                                    s.dates === undefined
                                        ? undefined
                                        : h('span', {
                                            class: `bold mx-1 ${s.dates === 'even' ? 'bg-yellow-200' : 'bg-blue-200'}`
                                        }, s.dates === 'even' ? '[زوج]' : '[فرد]')
                                );

                                const place = s.place
                                    ? h('span', { class: 'mx-1 underline' }, `(${s.place})`)
                                    : undefined;

                                const exams = item.exams.length === 0 ? undefined : item.exams.toString();

                                const timeRangesOverlap = itemsInDay.some(
                                    info => info.sessions.some(
                                        session => (
                                            // don't compare the same object to itself!
                                            (session != s)
                                            // sessions on the same day
                                            && (session.day === s.day)
                                            // sessions with matching even/odd dates
                                            && (session.dates == undefined || session.dates === s.dates)
                                            // at last, check the overlapping time ranges
                                            && util.rangesOverlap(s.starts.hour, s.ends.hour, session.starts.hour, session.ends.hour)
                                        )
                                    )
                                );

                                thisDaysSessions.push({
                                    starts: s.starts,
                                    ends: s.ends,
                                    node: h('span', null,
                                        h('span', { class: timeRangesOverlap ? 'bg-red-200' : undefined }, timeStr),
                                        evenOddFlag,
                                        h('b', { class: 'mx-1' }, `${item.courseTitle} [${item.id}]`),
                                        place,
                                        exams ? h('span', { class: examIsOverlapping ? 'bg-red-200' : undefined }, `(آزمون: ${exams})`) : undefined
                                    )
                                });
                            }
                        }

                        return h('tr', { class: _tr },
                            h('td', null, util.daysOfWeek[day] + ` (${itemsInDay.length})`),
                            h('td', null, ...util.fillBetweenArray(
                                thisDaysSessions.sort(
                                    (a, b) => ((a.starts.hour * 60) + a.starts.minute) - ((b.starts.hour * 60) + b.starts.minute)
                                ).map(i => i.node),
                                h('br', null)
                            ))
                        );
                    })
                )
            )
    );
}

export default DayMajorPlanner;

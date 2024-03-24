// @ts-check
import { h } from 'preact';
import {
    makeTimeSpans, timeToStr, customSessionStr,
    daysOfWeek, gcd, timeEq, fillBetweenArray, rangesOverlap
} from '../parser/utils.mjs';

const _tbl = 'w-full text-sm text-center text-gray-500 border border-gray-400';
const _thead = 'text-xs text-gray-700 uppercase bg-gray-50';
const _caption = 'w-full text-right bg-yellow-100 border border-yellow-500 text-gray-500 mb-2 px-2 py-1.5 rounded';
const _alert = {
    class: 'w-full text-center bg-gray-100 border border-gray-400 text-gray-500 px-2 py-1.5 rounded',
    text: 'جدول انتخاب خالی است...'
};

/**
 * @todo overlapping range items warning
 * @param {Object} props
 * @param {Array<import('../parser/types').ClassInfo>} props.picks
 */
function ComplicatedAndBuggyPlanner({ picks }) {
    const name = this.constructor.name;
    const invalidData = (false === Array.isArray(picks)) || (picks.length === 0);

    /** @type {Record<string, number[]>} e.g. `{ '00:00': [ index_of_item_in_pick' }` */
    const picksByTime = {};
    const warnings = [ 'test' ];

    let startHour = 23, endHour = 0, minuteSpan = 0;

    // loop through picked items and limit the planner time span
    for (let i = 0; i < picks.length; ++i) {
        // sessions grouping and all that shit
        for (let j = 0; j < picks[i].sessions.length; ++j) {
            const sessionStartTimeStr = timeToStr(
                picks[i].sessions[j].starts.hour,
                picks[i].sessions[j].starts.minute,
                true
            );
            startHour = Math.min(startHour, picks[i].sessions[j].starts.hour);
            endHour = Math.max(endHour, picks[i].sessions[j].ends.hour);
            minuteSpan = gcd(
                picks[i].sessions[j].starts.minute,
                picks[i].sessions[j].starts.minute
            );
            if (undefined === picksByTime[sessionStartTimeStr]) {
                // set new empty new array
                picksByTime[sessionStartTimeStr] = [i];
            } else picksByTime[sessionStartTimeStr].push(i);
        }

        // overlapping ranges
        // for (let k = 0; k < picks.length; ++k) { }
    }

    // default fallback of 60 minute span
    minuteSpan = (minuteSpan || 60);
    console.log(startHour, endHour, minuteSpan, picksByTime);

    return h('div', { name, class: 'flex justify-center mb-4' },
        // invalid data alert:
        invalidData ? h('span', { class: _alert.class }, _alert.text) :
        // the table:
        h('table', { class: _tbl },
            // table CAPTION:
            h('caption', {
                class: _caption + (warnings.length ? '' : ' hidden')
            }, ...warnings.map(w => h('li', null, w))),
            // table HEAD:
            h('thead', { class: _thead },
                h('tr', null,
                    // first column:
                    h('th', null, '#'),
                    // the rest of the columns:
                    ...daysOfWeek.map(d => h('th', null, d))
                )
            ),
            // table BODY:
            h('tbody', null,
                // generate rows based on time span range
                ...makeTimeSpans(
                    startHour, endHour, minuteSpan
                ).map(time => {
                    const timeStr = timeToStr(time.a, time.b, true);
                    // a single row:
                    /** @ts-ignore of course <td> has rowspan="" */
                    return h('tr', null,
                        h('td', null, timeStr),
                        // produce child nodes for each column
                        ...daysOfWeek.map( (thisDayStr, thisDay) => {
                            if (
                                   undefined !== picksByTime[timeStr]
                                && picksByTime[timeStr].length !== 0
                            ) {
                                // it should be just one item?
                                const indexOfItemInThisDayAndHour = picksByTime[timeStr].find(
                                    k => picks[k].sessions.some( s => (s.day === thisDay) )
                                );
                                const itemInThisDayAndHour = indexOfItemInThisDayAndHour !== undefined
                                    ? picks[indexOfItemInThisDayAndHour]
                                    : undefined;
                                console.log(
                                    'indexOfItemInThisDayAndHour=', indexOfItemInThisDayAndHour,
                                    ',itemInThisDayAndHour=', itemInThisDayAndHour
                                );
                                // well there was a match, yay
                                if (itemInThisDayAndHour !== undefined) {
                                    const todaysSession = itemInThisDayAndHour.sessions.find(s => (s.day === thisDay));
                                    // different hours on the same day:
                                    if (todaysSession !== undefined && timeEq(
                                        { hour: time.a, minute: time.b },
                                        todaysSession.starts
                                    )) {
                                        return h('td', {
                                                // TODO calculate this
                                                rowspan: (
                                                    (
                                                        ((todaysSession.ends.hour*60)+todaysSession.ends.minute)
                                                            -
                                                        ((todaysSession.starts.hour*60)+todaysSession.starts.minute)
                                                    ) / minuteSpan
                                                ),
                                                class: 'border border-gray-400 bg-gray-100'
                                            },
                                            itemInThisDayAndHour.courseTitle,
                                            h('br', null),
                                            customSessionStr(todaysSession, true)
                                        );
                                    }
                                }
                            }

                            // no match
                            return h('td', null, '-');
                        })
                    );
                })
            ),
        )
    );
}

const _mjr_col_day = 'روز هفته';
const _mjr_col_name = 'کلاس های انتخاب شده';
const _mjr_tbl = 'w-full text-sm text-right text-gray-500 border border-gray-400';
const _mjr_tr = 'odd:bg-white even:bg-gray-100 border border-gray-400 bg-gray-100';
const _mjr_clr = {
    class: 'text-gray-500 border border-gray-500 px-1 mr-1 rounded',
    text: 'حذف همه'
};

/**
 * @param {Object} props
 * @param {Array<import('../parser/types').ClassInfo>} props.picks
 * @param {Function} props.clearPicks
 * @param {number} props.maxCredit
 */
function DayMajorPlanner({ picks, clearPicks, maxCredit }) {
    const name = this.constructor.name;

    /** @type {import('../parser/types').ClassInfo[][]} e.g. `[ [ ClassInfo, ... ], [], [] ]` */
    const picksByDay = Array.from({ length: 7 }, _ => []);
    const invalidData = (false === Array.isArray(picks)) || (picks.length === 0);
    let totalPickedCredit = 0;
    if (invalidData === false) {
        for (const p of picks) {
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

    return h('div', { name, class: 'flex justify-center mb-4' },
        invalidData ? h('span', { class: _alert.class }, _alert.text) :
        h('table', { class: _mjr_tbl },
            h('thead', { class: _thead },
                h('tr', null,
                    h('th', null, _mjr_col_day),
                    h(
                        'th', { class: (totalPickedCredit > maxCredit ? 'bg-red-200' : undefined) },
                        `${_mjr_col_name} (${totalPickedCredit} واحد)`,
                        /** @ts-ignore */
                        h('button', {
                            class: _mjr_clr.class,
                            onClick: clearPicks
                        }, _mjr_clr.text)
                    ),
                )
            ),
            h('tbody', null,
                ...picksByDay.map((itemsInDay, day) => {
                    if (itemsInDay.length === 0) return undefined;
                    /** @type {Array<{ starts: import('../parser/types').Time, ends: import('../parser/types').Time, node: any }>} */
                    const thisDaysSessions = [];

                    // loop through current day's sessions and stringify them!
                    for (const item of itemsInDay) {
                        // check if exam date/time overlaps with another item
                        const examIsOverlapping = picks.some(
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
                            const timeStr = '[' + timeToStr(s.starts.hour, s.starts.minute, true)
                                          + '-' + timeToStr(s.ends.hour, s.ends.minute, true)
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
                                        && rangesOverlap(s.starts.hour, s.ends.hour, session.starts.hour, session.ends.hour)
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

                    return h('tr', { class: _mjr_tr },
                        h('td', null, daysOfWeek[day] + ` (${itemsInDay.length})`),
                        h('td', null, ...fillBetweenArray(
                            thisDaysSessions.sort(
                                (a,b) => ((a.starts.hour*60) + a.starts.minute) - ((b.starts.hour*60) + b.starts.minute)
                            ).map(i => i.node),
                            h('br', null)
                        ))
                    );
                })
            )
        )
    );
}

export {
    ComplicatedAndBuggyPlanner,
    DayMajorPlanner
};

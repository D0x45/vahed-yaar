// @ts-check
import { h } from 'preact';
import {
    makeTimeSpans, timeToStr, customSessionStr,
    daysOfWeek, gcd, timeEq, fillBetweenArray
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

const _col_0 = 'روز هفته';
const _col_1 = 'کلاس های انتخاب شده';
const _mjr_tbl = 'w-full text-sm text-right text-gray-500 border border-gray-400';

/**
 * @param {Object} props
 * @param {Array<import('../parser/types').ClassInfo>} props.picks
 */
function DayMajorPlanner({ picks }) {
    const name = this.constructor.name;

    /** @type {import('../parser/types').ClassInfo[][]} e.g. `[ [ ClassInfo, ... ], [], [] ]` */
    const picksByDay = Array.from({ length: 7 }, _ => []);
    const alerts = [];
    let invalidData = (false === Array.isArray(picks)) || (picks.length === 0);

    if (invalidData) {
        // default text for invalid data alert
        alerts.push(_alert.text);
    } else {
        for (const p of picks) {
            for (const s of p.sessions) {
                if (s.day === undefined) {
                    console.warn('session=', s, ' has invalid day');
                    continue;
                }
                picksByDay[s.day].push(p);
            }
        }
    }

    return h('div', { name, class: 'flex justify-center mb-4' },
        // invalidData ? h('span', { class: _alert.class }, ...fillBetweenArray(alerts, h('br', null))) :
        h('table', { class: _mjr_tbl },
            h('thead', { class: _thead },
                h('th', null, _col_0),
                h('th', null, _col_1),
            ),
            h('tbody', null,
                ...picksByDay.map((itemsInDay, day) => {
                    return itemsInDay.length === 0 ? undefined :
                    h('tr', { class: 'odd:bg-white even:bg-gray-100 border border-gray-400 bg-gray-100' },
                        h('td', null, daysOfWeek[day] + ` (${itemsInDay.length})`),
                        h('td', null,
                            ...fillBetweenArray(
                                itemsInDay
                                // ! TODO: better sort for sessions
                                .sort((a, b) => a.sessions[0].starts.hour - b.sessions[0].starts.hour)
                                .map(c => `[${c.id}] ${c.courseTitle} (${c.teachers.toString()}) (` + customSessionStr(
                                    // pick only sessions within this day:
                                    c.sessions.filter(s => s.day === day),
                                    true, true
                                ) + ')'),
                                h('br', null)
                            )
                        )
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

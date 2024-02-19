// @ts-check
import { h } from 'preact';
import {
    makeTimeSpans, timeToStr,
    daysOfWeek, gcd
} from '../parser/utils.mjs';

const _tbl = 'w-full text-sm text-center text-gray-500 border border-gray-400';
const _thead = 'text-xs text-gray-700 uppercase bg-gray-50';
const _caption = 'w-full text-right bg-yellow-100 border border-yellow-500 text-gray-500 mb-2 px-2 py-1.5 rounded';
const _alert = {
    class: 'w-full text-center bg-gray-100 border border-gray-400 text-gray-500 px-2 py-1.5 rounded',
    text: 'داده ای برای نمایش نیست!'
};

/**
 * @param {Object} props
 * @param {Array<import('../parser/types').ClassInfo>} props.picks
 */
function Planner({ picks }) {
    const name = this.constructor.name;
    const invalidData = (false === Array.isArray(picks)) || (picks.length === 0);

    /** @type {Record<string, number[]>} e.g. `{ '00:00': [ index_of_item_in_pick' }` */
    const picksByTime = {};
    const warnings = [ 'dumb fucking nigger' ];

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
        // invalidData ? h('span', { class: _alert.class }, _alert.text) :
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
                        console.debug('timeStr=',timeStr),
                        // produce child nodes for each column
                        ...daysOfWeek.map( (thisDayStr, thisDay) => {
                            console.debug('thisDay=', thisDay, ',thisDayStr=', thisDayStr);
                            console.debug('picksByTime[timeStr]=', picksByTime[timeStr]);
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
                                    return h('td', {
                                        // TODO calculate this
                                        rowspan: (
                                            (
                                                ((itemInThisDayAndHour.sessions[0].ends.hour*60)+itemInThisDayAndHour.sessions[0].ends.minute)
                                                    -
                                                ((itemInThisDayAndHour.sessions[0].starts.hour*60)+itemInThisDayAndHour.sessions[0].starts.minute)
                                            ) / minuteSpan
                                        ),
                                        class: 'border border-gray-400 bg-gray-100'
                                    }, itemInThisDayAndHour.courseTitle  + ' ' + itemInThisDayAndHour.sessions.toString());
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

export default Planner;

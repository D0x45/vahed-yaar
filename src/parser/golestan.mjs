// @ts-check
import {
    sanitizeFarsi, defaultEmptyCell, dayFromStr,
    defaultSessionToStr, defaultExamToStr, timeEq
} from './utils.mjs';

/** @type {import('./types').ExcelColumnMapper} */
const defaultAssigners = [
    /* A */ (value, o) => o.campusId = +value || 0,
    /* B */ (value, o) => o.campus = value ? sanitizeFarsi(value) : defaultEmptyCell,
    /* C */ undefined,
    /* D */ undefined,
    /* E */ (value, o) => {
        const [courseId, classId] = value.split('_');
        o.courseId = +courseId || 0;
        o.id = +`${courseId}${classId}` || 0;
    },
    /* F */ (value, o) => o.courseTitle = value ? sanitizeFarsi(value) : defaultEmptyCell,
    /* G */ (value, o) => o.credit = +value || 0,
    /* H */ undefined,
    /* I */ (value, o) => o.capacity = +value || 0,
    /* J */ undefined,
    /* K */ undefined,
    /* L */ undefined,
    /* M */ (value, o) => {
        if (typeof value !== 'string') return;
        const sv = sanitizeFarsi(value);
        o.teachers.includes(sv) || o.teachers.push(sv);
    },
    /* N */ (value, o) => {
        const [type, item, sessionType] = parseExamOrSession(value, defaultSessionToStr, defaultExamToStr);
        if (type === 'sessions') {
            // update info for courseType based on sessionType
            if (sessionType !== undefined) {
                if (undefined === o.courseType) o.courseType = sessionType;
                else if (false === o.courseType.includes(sessionType)) {
                    o.courseType += (`،${sessionType}`);
                }
            }

            // loop through all the stored sessions to find duplicates and merge them
            for (let i = 0; i < o.sessions.length; ++i) {
                // merge the sessions which start exactly
                // when the next one starts
                // e.g.: WED 12-13 + WED 13-14 => WED 12-14
                if (
                       o.sessions[i].day === item.day
                    // && o.sessions[i].dates === item.dates
                    && timeEq(o.sessions[i].ends, item.starts)
                    // ! TODO: check for place to be equal for merging...
                    // && (item.place)
                ) {
                    o.sessions[i].ends = item.ends;
                    return;
                }

                // check for duplicate odd/even sessions on the same date
                // for instance there are two sessions on Mondays 10 to 12
                // one with {date: odd} and the other with {date: even}
                // these two must be merged into one {date: undefined}
                if (
                       o.sessions[i].day === item.day
                    && timeEq(o.sessions[i].starts, item.starts)
                    && timeEq(o.sessions[i].ends, item.ends)
                ) {
                    // possible cases:
                    // +------------+------------+
                    // | session[i] |  new_item  |
                    // +------------+------------+
                    // |    odd     |  undefined |
                    // |   even     |  undefined |
                    // | undefined  |     odd    |
                    // | undefined  |    even    |
                    // |    odd     |    even    |
                    // |    even    |     odd    |
                    // +------------+------------+
                    if (o.sessions[i].dates !== item.dates)
                        // other possible cases that are ignored,
                        // since they don't affect the logic:
                        // undefined <=> undefined
                        // odd       <=> odd
                        // even      <=> even
                        o.sessions[i].dates = undefined;
                    // either way this is duplicate value now,
                    // and we do not need to push it to the list
                    return;
                }
            }
        }
        // @ts-ignore
        type && o[type].push(item);
    }
];

/** @type {(rowValues: any[]) => string} */
const defaultGetRowId = (rowValues) => {
    // column E contains course id and class id
    // you might ask why using index 5, since column E is the 5th column
    // shouldn't we use index 4 ?!
    // well parseXLSX passes raw ExcelJS.Workbook.row[i].rowValues to this function
    // and as i have previously mentioned ExcelJS puts a null at index 0 of every rowValues array
    // therefore that's why :D
    return rowValues[5];
};

/**
 * @param {any} raw
 * @param {import('./types').ClassInfoValueToStr<'sessions'>} sessionToStr
 * @param {import('./types').ClassInfoValueToStr<'exams'>} examToStr
 * @returns { [undefined, undefined, undefined] | ['exams', import('./types').ClassInfo['exams'][0], undefined] | ['sessions', import('./types').ClassInfo['sessions'][0], undefined|string] }
 */
function parseExamOrSession(raw, sessionToStr, examToStr) {
    if (
        !raw || typeof raw !== 'string'
        || raw.length === 0 || raw === defaultEmptyCell
    ) return [undefined, undefined, undefined];

    if (raw.startsWith('درس') || raw.startsWith('حل')) {
        const afterFirstColon = raw.substring(raw.indexOf(':') + 1);
        const sessionTypeIdentifier = raw.charAt(raw.indexOf('(') + 1);
        // [sessionTypeIdentifier]
        //      |
        //      |   [dayStr]             [oddOrEvenFlag] this character may not exist at all
        //      |      |                 |
        //      v  vvvvvvvvvv            v
        // DARS(T): saturday 10:00-12:00 o place: engineering 101
        //                   ^          ^  ^^^^^^^^^^^^^^^^^^^^^^ -> the rest is place
        //                   |[timeSpan]|
        //                   |          posFirstSpaceAfterFirstDigit
        //                   posFirstDigitAfterFirstColon
        const posFirstDigitAfterFirstColon = afterFirstColon.search(/[0-9]/);
        const posFirstSpaceAfterFirstDigit = afterFirstColon.indexOf(' ', posFirstDigitAfterFirstColon);
        const dayStr = afterFirstColon.substring(0, posFirstDigitAfterFirstColon).trim();
        const timeSpan = afterFirstColon.substring(posFirstDigitAfterFirstColon, posFirstSpaceAfterFirstDigit);
        const oddOrEvenFlag = afterFirstColon.charAt(posFirstSpaceAfterFirstDigit + 1);
        const place = afterFirstColon.substring(afterFirstColon.indexOf(':', posFirstSpaceAfterFirstDigit) + 1).trim();
        const timeSpanValues = timeSpan.split('-').map(v => v.split(':').map(v => +v || 0));
        const session = {
            starts: { hour: timeSpanValues[0][0], minute: timeSpanValues[0][1] },
            ends:   { hour: timeSpanValues[1][0], minute: timeSpanValues[1][1] },
            /** @type {undefined|'odd'|'even'} */
            dates: (oddOrEvenFlag === 'ز') ? 'even' : (oddOrEvenFlag === 'ف' ? 'odd' : undefined),
            day: dayFromStr(dayStr),
            place: place ? sanitizeFarsi(place) : undefined
        };
        session.toString = sessionToStr;

        return ['sessions', session, sessionTypeIdentifier];
    }

    if (raw.startsWith('امتحان')) {
        const date = raw.match(/[0-9]{4}\.[0-9]{2}\.[0-9]{2}/)?.at(0)?.split('.', 3).map(v => +v || 0);
        const timeSpanValues = raw.substring(raw.indexOf(':') + 1).trim().split('-').map(v => v.split(':').map(v => +v || 0));
        const exam = {
            year:  date ? date[0] : 0,
            month: date ? date[1] : 0,
            day:   date ? date[2] : 0,
            hour: timeSpanValues[0][0] || 0,
            minute: timeSpanValues[0][1] || 0
        };
        exam.toString = examToStr;

        return ['exams', exam, undefined];
    }

    return [undefined, undefined, undefined];
}

export default {
    defaultAssigners,
    defaultGetRowId,
    parseExamOrSession,
};

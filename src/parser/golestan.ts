import {
    type ClassInfoFieldStringifier,
    type ExcelColumnMapper,
    type ClassInfo,
    type RowIDGenerator,
} from '../types'

import * as util from './utils';

type ParseExamOrSessionResult =
    | [undefined, undefined, undefined]
    | ['exams', ClassInfo['exams'][0], undefined]
    | ['sessions', ClassInfo['sessions'][0], string | undefined];

export const defaultGetRowId: RowIDGenerator = (rowValues: any[]) => {
    // column E contains course id and class id
    return rowValues[4];
};

export function parseExamOrSession(
    raw: any,
    sessionToStr: ClassInfoFieldStringifier<'sessions'>,
    examToStr: ClassInfoFieldStringifier<'exams'>
): ParseExamOrSessionResult {
    if (
        !raw || typeof raw !== 'string'
        || raw.length === 0 || raw === util.defaultEmptyCell
    ) return [undefined, undefined, undefined];

    console.debug(
        '[GOLESTAN] parseExamOrSession(\nraw=', raw,
        '\nsessionToStr=', sessionToStr.name,
        '\nexamToStr=', examToStr.name, ')'
    );

    if (raw.startsWith('درس') || raw.startsWith('حل')) {
        const firstColonIndex = raw.indexOf(':');
        // const afterFirstColon = raw.substring(raw.indexOf(':') + 1);
        const sessionTypeIdentifier = raw.charAt(firstColonIndex - 2);
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
        const timeSpanStr = raw.match(
            /([0-9]{2}\:[0-9]{2})\-([0-9]{2}\:[0-9]{2})/
        );

        if (!timeSpanStr || timeSpanStr.length == 0) {
            console.error('[GOLESTAN] timeSpanStr must be a valid string!');
            return [undefined, undefined, undefined];
        }

        const dayStr = raw.slice(
            firstColonIndex + 1, /* inclusive */
            timeSpanStr.index /* exclusive */
        ).trim();

        const tmp = raw.slice((timeSpanStr.index || 0) + timeSpanStr[0].length).trim();
        const timeSpanValues = timeSpanStr[0].split('-').map(v => v.split(':').map(v => +v || 0));

        let oddOrEvenFlag: 'odd' | 'even' | undefined = undefined;
        let place = undefined;

        if (tmp.length > 0) {
            if (tmp[0] === 'ز') oddOrEvenFlag = 'even';
            if (tmp[0] === 'ف') oddOrEvenFlag = 'odd';

            const tmp2 = tmp.slice( +(oddOrEvenFlag !== undefined) ).trim();
            if (tmp2.startsWith('مکان:')) {
                place = tmp2.slice(6).trim();
            }
        }

        console.debug(
            '[GOLESTAN]\n',
            `firstColonIndex=${firstColonIndex}\n`,
            `sessionTypeIdentifier=${sessionTypeIdentifier}\n`,
            `timeSpanStr=${timeSpanStr[0]}\n`,
            `dayStr=${dayStr}\n`,
            `tmp=${tmp}\n`,
            `oddOrEvenFlag=${oddOrEvenFlag}\n`,
            `place=${place}\n`,
            'timeSpanValues=', timeSpanValues, '\n'
        );

        const session: ClassInfo['sessions'][0] = {
            starts: { hour: timeSpanValues[0][0], minute: timeSpanValues[0][1] },
            ends:   { hour: timeSpanValues[1][0], minute: timeSpanValues[1][1] },
            dates: oddOrEvenFlag,
            day: util.dayFromStr(dayStr),
            place: place ? util.sanitizeFarsi(place) : undefined
        };

        // @ts-ignore: toJSON does not exist on type session. yeah no shit.
        session.toJSON = function (this: ClassInfo['sessions'][0]) {
            return {
                ...this,
                __day_str: 'روز:' + util.dayToStr(this.day)
            };
        };
        session.toString = sessionToStr;

        return ['sessions', session, sessionTypeIdentifier];
    }

    if (raw.startsWith('امتحان')) {
        const date = [0,0,0];
        const matches = raw.match(/[0-9]{4}\.[0-9]{2}\.[0-9]{2}/);
        if (matches !== null) {
            const first_match = matches[0];
            const splitted = first_match.split('.', 3);
            date[0] = +splitted[0] || 0;
            date[1] = +splitted[1] || 0;
            date[2] = +splitted[2] || 0;
        }
        const timeSpanValues = raw.substring(raw.indexOf(':') + 1).trim().split('-').map(v => v.split(':').map(v => +v || 0));
        const exam: ClassInfo['exams'][0] = {
            year:  date[0],
            month: date[1],
            day:   date[2],
            hour: timeSpanValues[0][0] || 0,
            minute: timeSpanValues[0][1] || 0,
            ends: {
                hour: timeSpanValues[1][0] || 0,
                minute: timeSpanValues[1][1] || 0,
            }
        };
        exam.toString = examToStr;

        console.debug(
            '[GOLESTAN]\n',
            'exam=',exam,'\n',
            `timeSpanValues=`,timeSpanValues
        );

        return ['exams', exam, undefined];
    }

    return [undefined, undefined, undefined];
}

export const defaultMapper: ExcelColumnMapper = [
    /* A */ (value, o) => o.campusId = +value || 0,
    /* B */ (value, o) => o.campus = value ? util.sanitizeFarsi(value) : util.defaultEmptyCell,
    /* C */ undefined,
    /* D */ undefined,
    /* E */ (value, o) => {
        // i hate edge cases >:|
        if (typeof value !== 'string') return;

        const [courseId, classId] = value.split('_');
        o.courseId = +courseId || 0;
        o.id = +`${courseId}${classId}` || 0;
    },
    /* F */ (value, o) => o.courseTitle = value ? util.sanitizeFarsi(value) : util.defaultEmptyCell,
    /* G */ (value, o) => o.credit = +value || 0,
    /* H */ undefined,
    /* I */ (value, o) => o.capacity = +value || 0,
    /* J */ (value, o) => o.capacity -= +value || 0,
    /* K */ undefined,
    /* L */ undefined,
    /* M */ (value, o) => {
        if (typeof value !== 'string') return;
        const sv = util.sanitizeFarsi(value);
        o.teachers.includes(sv) || o.teachers.push(sv);
    },
    /* N */ (value, o) => {
        const [type, item, sessionType] = parseExamOrSession(value, util.defaultSessionToStr, util.defaultExamToStr);
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
                    && util.timeEq(o.sessions[i].ends, item.starts)
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
                    && util.timeEq(o.sessions[i].starts, item.starts)
                    && util.timeEq(o.sessions[i].ends, item.ends)
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

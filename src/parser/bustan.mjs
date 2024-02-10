// @ts-check
import {
    dayFromStr, sanitizeFarsi, defaultEmptyCell,
    defaultExamToStr, defaultSessionToStr
} from './utils.mjs';

/** @type {import('./types').ExcelColumnMapper} */
const defaultAssigners = [
    /* A */ (value, o) => o.courseTitle = value ? sanitizeFarsi(value) : defaultEmptyCell,
    /* B */ (value, o) => o.courseId = +value || 0,
    /* C */ undefined,
    /* D */ (value, o) => o.courseType = value ? sanitizeFarsi(value) : defaultEmptyCell,
    /* E */ (value, o) => o.id = +value || 0,
    /* F */ (value, o) => o.capacity = +value || 0,
    /* G */ (value, o) => o.campusId = +value || 0,
    /* H */ (value, o) => o.campus = value ? sanitizeFarsi(value) : defaultEmptyCell,
    /* I */ (value, o) => {
        if (value) o.teachers.push(sanitizeFarsi(value));
    },
    /* J */ (value, o) => o.sessions = parseSessions(value, defaultSessionToStr),
    /* K */ (value, o) => o.exams = parseExams(value, defaultExamToStr),
];

/** @type {(rowValues: any[]) => string} */
const defaultGetRowId = (rowValues) => {
    // column E contains class id
    // you might ask why using index 5, since column E is the 5th column
    // shouldn't we use index 4 ?!
    // well parseXLSX passes raw ExcelJS.Workbook.row[i].rowValues to this function
    // and as i have previously mentioned ExcelJS puts a null at index 0 of every rowValues array
    // therefore that's why :D
    return rowValues[5];
};

/**
 * @param {any} raw
 * @param {import('./types').ClassInfoValueToStr<'sessions'>} toStr
 * @returns {import('./types').ClassInfo['sessions']}
 */
function parseSessions(raw, toStr) {
    if (
        !raw || typeof raw !== 'string'
        || raw.length === 0 || raw === defaultEmptyCell
    ) return [];

    const [s, e] = [...raw.matchAll(/[0-9]{2}:[0-9]{2}/g)]
        .map(x => x[0].split(':').map(a => +a || 0));
    const farsiDayStr = raw.split(/[0-9]{2}:[0-9]{2}/).at(0);

    const session = {
        starts: { hour: +(s && s[0]), minute: +(s && s[1]) },
        ends:   { hour: +(e && e[0]), minute: +(e && e[1]) },
        day: dayFromStr(farsiDayStr),
    };
    session.toString = toStr;

    return [ session ];
}

/**
 * @param {any} raw
 * @param {import('./types').ClassInfoValueToStr<'exams'>} toStr
 * @returns {import('./types').ClassInfo['exams']}
 */
function parseExams(raw, toStr) {
    if (
        !raw || typeof raw !== 'string'
        || raw.length === 0 || raw === defaultEmptyCell
    ) return [];

    const [a, _, b] = raw.split(' ');
    const d = a.split('/');
    const t = b.split(':');

    const exam = {
        year:   +d[0] || 0,
        month:  +d[1] || 0,
        day:    +d[2] || 0,
        hour:   +t[0] || 0,
        minute: +t[1] || 0
    };
    exam.toString = toStr;

    return [ exam ];
}

export default {
    defaultAssigners,
    defaultGetRowId,
    parseSessions,
    parseExams,
};

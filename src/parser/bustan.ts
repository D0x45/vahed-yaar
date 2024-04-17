import {
    type ExcelColumnMapper,
    type RowIDGenerator,
    type ClassInfoFieldStringifier,
    type ClassInfo,
} from '../types';

import * as util from './utils';

export const defaultGetRowId: RowIDGenerator = (rowValues: any[]) => {
    // column E contains class id
    return rowValues[4];
};

export function parseSessions(raw: any, toStr: ClassInfoFieldStringifier<'sessions'>): ClassInfo['sessions'] {
    if (
        !raw || typeof raw !== 'string'
        || raw.length === 0 || raw === util.defaultEmptyCell
    ) return [];

    const [s, e] = [...raw.matchAll(/[0-9]{2}:[0-9]{2}/g)]
        .map(x => x[0].split(':').map(a => +a || 0));
    const farsiDayStr = raw.split(/[0-9]{2}:[0-9]{2}/).at(0);

    const session = {
        starts: { hour: +(s && s[0]), minute: +(s && s[1]) },
        ends:   { hour: +(e && e[0]), minute: +(e && e[1]) },
        day: farsiDayStr ? util.dayFromStr(farsiDayStr) : undefined,
    };
    session.toString = toStr;

    return [ session ];
}

export function parseExams(raw: any, toStr: ClassInfoFieldStringifier<'exams'>): ClassInfo['exams'] {
    if (
        !raw || typeof raw !== 'string'
        || raw.length === 0 || raw === util.defaultEmptyCell
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

export const defaultMappers: ExcelColumnMapper = [
    /* A */ (value, o) => o.courseTitle = value ? util.sanitizeFarsi(value) : util.defaultEmptyCell,
    /* B */ (value, o) => o.courseId = +value || 0,
    /* C */ undefined,
    /* D */ (value, o) => o.courseType = value ? util.sanitizeFarsi(value) : util.defaultEmptyCell,
    /* E */ (value, o) => o.id = +value || 0,
    /* F */ (value, o) => o.capacity = +value || 0,
    /* G */ (value, o) => o.campusId = +value || 0,
    /* H */ (value, o) => o.campus = value ? util.sanitizeFarsi(value) : util.defaultEmptyCell,
    /* I */ (value, o) => value && o.teachers.push(util.sanitizeFarsi(value)),
    /* J */ (value, o) => o.sessions = parseSessions(value, util.defaultSessionToStr),
    /* K */ (value, o) => o.exams = parseExams(value, util.defaultExamToStr),
];

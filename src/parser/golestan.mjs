// @ts-check
import { sanitizeFarsi, defaultEmptyCell } from './utils.mjs';

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
    /* M */ (value, o) => o.teacher = value ? sanitizeFarsi(value) : defaultEmptyCell,
    /* N */ (value, o) => {
        // TODO: implement proper parsing
        o['sessions'] = [ value ];
        o['exams'] = [ value ];
    }
];

export default {
    defaultAssigners,
};

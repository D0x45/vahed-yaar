// @ts-check
import ExcelJS from 'exceljs';

const daysOfWeek = [
    'شنبه',
    'یکشنبه',
    'دوشنبه',
    'سه شنبه',
    'چهارشنبه',
    'پنجشنبه',
    'جمعه'
];

/** @type {Record<keyof import('./types').ClassInfo, string>} */
const classInfoKeyTitles = {
    id: '#',
    campus: 'دانشکده',
    campusId: 'شناسه دانشکده',
    courseId: 'شناسه درس',
    courseTitle: 'درس',
    capacity: 'ظرفیت',
    courseType: 'نوع درس',
    credit: 'واحد',
    exams: 'آزمون',
    sessions: 'کلاس',
    teacher: 'استاد'
};

const diff = {
    'أ': 'ا',
    'ة': 'ه',
    'ك': 'ک',
    'دِ': 'د',
    'بِ': 'ب',
    'زِ': 'ز',
    'ذِ': 'ذ',
    'شِ': 'ش',
    'سِ': 'س',
    'ى': 'ی',
    'ي': 'ی',
    '٠': '۰',
    '١': '۱',
    '٢': '۲',
    '٣': '۳',
    '٤': '۴',
    '٥': '۵',
    '٦': '۶',
    '٧': '۷',
    '٨': '۸',
    '٩': '۹',
    '(': ' ',
    ')': ' ',
    '\u200c': ' ',
};

function sanitizeFarsi(str) {
    for (const [key, value] of Object.entries(diff)) {
        str = str.replaceAll(key, value);
    }
    return str.replaceAll(/[\s]{2,}/g, ' ');
}

/** @returns {undefined|import('./types').DayOfWeek} */
function dayFromStr(farsi) {
    switch (farsi) {
        case 'شنبه': return 0;

        case 'یکشنبه':
        case 'یک شنبه':
        case 'يك‌شنبه': return 1;

        case 'دو شنبه':
        case 'دوشنبه': return 2;

        case 'سه‌شنبه':
        case 'سه شنبه': return 3;

        case 'چهار شنبه':
        case 'چهارشنبه': return 4;

        case 'پنج‌شنبه':
        case 'پنج شنبه':
        case 'پنجشنبه': return 5;

        case 'جمعه': return 6;
    }
    console.error(`unknown farsi day of week representation: '${farsi}'`);
    return undefined;
}

/** @param {undefined|import('./types').DayOfWeek} day */
function dayToStr(day) {
    if (day === undefined) return '-';
    return daysOfWeek[day];
}

function padLeft(num, len = 2, p = '0') {
    const s = `${num}`;
    return p.repeat(Math.abs(len-s.length)) + s;
}

/**
 * @todo maybe this fn receives an ExcelJS.Workbook instead?
 *
 * @param {ArrayBuffer} input
 * @param {import('./types').ExcelColumnMapper} assigners
 * @returns {Promise<undefined|Record<string, import('./types').ClassInfo>>}
 */
async function parseXLSX(input, assigners) {
    const wb = new ExcelJS.Workbook;
    await wb.xlsx.load(
        input,
        { ignoreNodes: ['dataValidations'] }
    );

    if (wb.worksheets.length === 0)
        return undefined;

    const sheet = wb.worksheets[0];
    const items = {};
    for (
        // indexing starts at 1
        // also first row is the header
        // so index 2 is the first row
        let i = 2;
        i <= sheet.actualRowCount;
        ++i
    ) {
        const row = sheet.getRow(i);
        const tmpClassInfo = {};

        // check for invalid row
        if (!Array.isArray(row.values) || row.values.length < assigners.length) {
            console.warn(`row ${i} has length of ${row.values.length} which is less than assigners.length=${assigners.length}`);
            continue;
        }

        assigners.forEach(
            (assignerFn, index) => (assignerFn instanceof Function) && assignerFn(
                row.values[index + 1],
                //               ^^^ the reason i applied this offset is that,
                // exceljs gives an undefined value for index 0 of every row.values
                // @ts-ignore i know, please, just shut up
                tmpClassInfo
            )
        );

        const classInfoKey = `${tmpClassInfo.id}`;
        // golestan produces multiple rows for exams/sessions
        // that results in multiple duplicate values with only different sessions
        // so every time you should check if it is already processed and then merge the new ones
        if (typeof items[classInfoKey] === 'undefined') items[classInfoKey] = tmpClassInfo;
        else {
            items[classInfoKey]['sessions'].push(...tmpClassInfo.sessions);
            items[classInfoKey]['exams'].push(...tmpClassInfo.exams);
        }
    }

     // @ts-ignore i have no idea
    return items;
}

/** @type {import('./types').ClassInfoValueToStr<'sessions'>} */
function defaultSessionToStr() {
    const m0 = this.starts.minute ? `:${padLeft(this.starts.minute)}` : '';
    const m1 = this.ends.minute   ? `:${padLeft(this.ends.minute)}`   : '';
    return `${dayToStr(this.day)} ${this.starts.hour}${m0} تا ${this.ends.hour}${m1}`;
};

/** @type {import('./types').ClassInfoValueToStr<'exams'>} */
function defaultExamToStr() {
    return `${this.year}/${padLeft(this.month)}/${padLeft(this.day)} ${padLeft(this.hour)}:${padLeft(this.minute)}`;
}

/** empty cell string indicating null or non-existing value */
const defaultEmptyCell = '-';

export {
    classInfoKeyTitles,
    sanitizeFarsi,
    dayFromStr,
    dayToStr,
    padLeft,
    parseXLSX,
    defaultExamToStr,
    defaultSessionToStr,
    defaultEmptyCell,
};

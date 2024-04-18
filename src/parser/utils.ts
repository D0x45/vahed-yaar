import {
    type DayOfWeek,
    type ClassInfo,
    type ExcelColumnMapper,
    type RowIDGenerator,
    type Time,
} from '../types';

import * as ExcelJS from 'exceljs';

export const defaultEmptyCell = '-';

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
    '-': ' ',
    'ئ': 'ی',
    '\u200c': ' ',
    '\u200f': ' ',
};

export const classInfoKeyTitles: Record<keyof ClassInfo, string> = {
    id: 'شناسه',
    campus: 'دانشکده',
    campusId: 'شناسه دانشکده',
    courseId: 'شناسه درس',
    courseTitle: 'درس',
    capacity: 'ظرفیت',
    courseType: 'نوع درس',
    credit: 'واحد',
    exams: 'آزمون',
    sessions: 'کلاس',
    teachers: 'استاد'
};

export const daysOfWeek = [
    'شنبه',
    'یکشنبه',
    'دوشنبه',
    'سه شنبه',
    'چهارشنبه',
    'پنجشنبه',
    'جمعه'
];

export function sanitizeFarsi(str: string): string {
    if (typeof str !== 'string') return '';
    for (const [key, value] of Object.entries(diff)) {
        str = str.replaceAll(key, value);
    }
    return str.replaceAll(/[\s]{2,}/g, ' ').trim();
}

export function dayFromStr(farsi: string): DayOfWeek | undefined {
    switch (farsi) {
        case 'شنبه': return 0;

        case 'یکشنبه':
        case 'يك شنبه':
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
    console.error(`unknown farsi DayOfWeek representation: '${farsi}'`);
    return undefined;
}

export function dayToStr(day?: DayOfWeek): string {
    if (day === undefined) return '-';
    return daysOfWeek[day];
}

export function padLeft(a: any, len = 2, p = '0'): string {
    const s = `${a}`;
    return p.repeat(Math.abs(len-s.length)) + s;
}

export async function parseXLSX(
    input: ArrayBuffer,
    mappers: ExcelColumnMapper,
    getUniqueId: RowIDGenerator
): Promise<undefined | ClassInfo[]> {
    const wb = new ExcelJS.Workbook;
    await wb.xlsx.load(
        input,
        { ignoreNodes: ['dataValidations'] }
    );

    if (wb.worksheets.length === 0)
        return undefined;

    const sheet = wb.worksheets[0];
    const items: ClassInfo[] = [];
    const idxMap: Record<string, number> = {};

    for (
        // indexing starts at 1
        // also first row is the header
        // so index 2 is the first row
        let i = 2;
        i <= sheet.actualRowCount;
        ++i
    ) {
        const row = sheet.getRow(i);
        const values = row.values;

        // check for invalid row
        if (!row.hasValues || !Array.isArray(values) || values.length < mappers.length) {
            console.warn(`row ${i} has length of ${values.length} which is less than mappers.length=${mappers.length}`);
            continue;
        }

        const rowId = getUniqueId(
               values.slice(1)
            // ^ skip the first item, since ExcelJS yields a null value at index 0
            // https://github.com/exceljs/exceljs/issues/698
            // indexing in xlsx files starts from number 1 (eg. A1 point to row 1 and column 1)
            // setting null at the start is much easier than always recalculating from 0 based to 1 based indexing
        );
        const itemIdx = typeof idxMap[rowId] === 'number'
            // an item with the same id exists, yay!
            ? idxMap[rowId]
            // acquire the last index of the array since we are pushing items to the end
            : (idxMap[rowId] = items.length);

        // init the empty class info
        if (items[itemIdx] === undefined)
            items[itemIdx] = {
                id: 0,
                campusId: 0,
                courseId: 0,
                capacity: 0,
                courseTitle: '',
                courseType: undefined,
                campus: '',
                credit: undefined,
                teachers: [],
                exams: [],
                sessions: [],
            };


        mappers.forEach(
            (assignerFn, index) => (assignerFn instanceof Function) && assignerFn(
                values[index + 1],
                //           ^^^
                // ExcelJS gives a null value for index 0 of every row.values
                items[itemIdx]
            )
        );
    }

    return items;
}

export function timeEq(a: Time, b: Time): boolean {
    return (a.hour === b.hour)
        && (a.minute === b.minute);
}

export function timeToStr(hour: number, minute: number, forceMinute = false): string {
    let s = !forceMinute ? `${hour}` : padLeft(hour || 0);
    if (minute || forceMinute)
        s += ':' + padLeft(minute || 0);
    return s;
}

/**
 * the `place` field is omitted by default, unless an `__append_place__` is set to a truthy value.
 * set `__full_time__` to truthy and get fully-padded time string representation
 * @see customSessionStr
 */
export function defaultSessionToStr(
    this: ClassInfo['sessions'][0] & {
        __full_time__?: boolean,
        __append_place__?: boolean
    }
) {
    const t0 = timeToStr(this.starts.hour, this.starts.minute, !!this.__full_time__),
          t1 = timeToStr(this.ends.hour, this.ends.minute, !!this.__full_time__),
          d = dayToStr(this.day);
    let tmp = `${d} ${t0} تا ${t1} `;
    // this is just a stupid workaround
    if (this.place && this.__append_place__) tmp += `(${this.place}) `;
    if (this.dates) tmp += this.dates === 'odd' ? '[فرد]' : '[زوج]';
    return tmp.trim();
}

// TODO: screw around type system in order to find a way
// of explicitly declaring the return type instead of compiler inferring it...
export function customSessionStr<
    T extends ClassInfo['sessions'][0],
>(
    itemOrItems: Array<T> | T,
    appendPlace?: boolean,
    fullTime?: boolean
) {
    // bind the modified Session with corresponding flags
    const mapper = (item: T) =>
        defaultSessionToStr.call({
            ...item,
            __append_place__: appendPlace,
            __full_time__: fullTime
        });
    return Array.isArray(itemOrItems)
        ? itemOrItems.map(mapper)
        : mapper(itemOrItems as T);
}

export function defaultExamToStr(this: ClassInfo['exams'][0]): string {
    return `${this.year}/${padLeft(this.month)}/${padLeft(this.day)} ${padLeft(this.hour)}:${padLeft(this.minute)}`;
}

export function clamp(a: number, min: number, max: number) {
    return Math.min(Math.max(a, min), max);
}

/** permutations of two arrays, e.g. `[a, b] * [c, d] = [ac,ad,bc,bd]` */
export function permutations<T, U=T>(p0: T[], p1: U[]): Array<{ a: T, b: U }> {
    return p0.flatMap(a => p1.map(b => ({a, b})));
}

export function rangeArray(start: number, stop: number, step = 1): number[] {
    return Array.from(
        { length: (stop - start) / step + 1 },
        (_, index) => (start + index * step)
    );
}

/** creates time spans in the given range, e.g. `(start: 10, end: 12, span: 30) => [10:00, 10:30, 11:00, 11:30, 12:00]` */
export function makeTimeSpans(startHour: number, endHour: number, minuteSpan: number) {
    return permutations(
        rangeArray(
            clamp(startHour, 0, 23),
            clamp(endHour, 0, 23)
        ),
        rangeArray(0, 59, clamp(minuteSpan, 1, 60))
    );
}

/**
 * greatest common divisor.
 * used to determine the smallest interval for different times.
 * e.g. `[15, 30] => 15`, meaning you will need 15-minute intervals in order
 * to fit all possible time fractions in your planner, since 30 mins is two 15 mins.
 */
export function gcd(a: number, b: number): number {
    if (a === 0) return b;
    return gcd(b % a, a);
}

/**
 * @param inclusive [08:00, 09:00] and [09:00, 10:00] are inclusive overlapping
 * @see https://stackoverflow.com/questions/36011227/javascript-check-if-time-ranges-overlap
 */
export function rangesOverlap<T = number>(a: T, b: T, c: T, d: T, inclusive?: boolean): boolean {
    return inclusive
        ? (b >= c && a <= d)
        : (b >  c && a <  d);
}

/** fill an `array` with `filler` in between */
export function fillBetweenArray<T, U=T, K=T>(array: T[], filler: U, itemMapper?: ((item: T) => K)): Array<T|U|K> {
    return (array.length < 2) ? array : [...array.flatMap((value, index) => {
        const mapped = (itemMapper === undefined)
            ? value
            : itemMapper(value);

        return (index + 1) === array.length
            ? mapped
            : [mapped, filler];
    })];
}

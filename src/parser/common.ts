import {
    type DayOfWeek,
    type ClassInfo,
    type Time,
} from '../types';

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
    campusId: 'ش. دانشکده',
    courseId: 'ش. درس',
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

export function newClassInfo(): ClassInfo {
    return {
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
}

export function dayToStr(day?: DayOfWeek): string {
    if (day === undefined) return '-';
    return daysOfWeek[day];
}

export function padLeft(a: any, len = 2, p = '0'): string {
    const s = `${a}`;
    return p.repeat(Math.abs(len-s.length)) + s;
}

export function timeEq(a: Time, b: Time): boolean {
    return (a.hour === b.hour)
        && (a.minute === b.minute);
}

export function timeToStr(
    hour: number,
    minute: number,
    forceMinute = false
): string {
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
    // FIXME: this is just a stupid workaround
    if (this.place && this.__append_place__) tmp += `(${this.place}) `;
    if (this.dates) tmp += this.dates === 'odd' ? '[فرد]' : '[زوج]';
    return tmp.trim();
}

export function defaultExamToStr(this: ClassInfo['exams'][0]): string {
    let tmp = `${this.year}/${padLeft(this.month)}/${padLeft(this.day)} ${padLeft(this.hour)}:${padLeft(this.minute)}`;

    if (this.ends !== undefined) {
        tmp += `-${padLeft(this.ends.hour)}:${padLeft(this.ends.minute)}`;
    }

    return tmp;
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
 * check if the two given ranges (a and b) overlap.
 * @param exclusive Default's to `false`. Since [08:00, 09:00] and [09:00, 10:00] are inclusive overlapping
 * @see https://stackoverflow.com/questions/36011227/javascript-check-if-time-ranges-overlap
 */
export function rangesOverlap<T extends number>(
    a0: T, a1: T,
    b0: T, b1: T,
    exclusive = false,
): boolean {
    // exclusive = false
    // [a0        a1]
    // [b0        b1]
    // overlap = false

    // exclusive = true
    //  [a0      a1]
    // [b0        b1]
    // overlap = true

    return (a1 > (b0 - (+exclusive)) )
        && (a0 < (b1 + (+exclusive)) );
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

/** create a simple csv export for reusing later */
export function makeCSV(items: ClassInfo[]): Blob {
    const csv_data = new TextEncoder().encode([
        Object.keys(items[0])
            // @ts-ignore: sigh... i don't even know why it's not deducing the type.
            .map((k: keyof ClassInfo) => classInfoKeyTitles[k])
            .join(','),
            // FIXME: escaping commas
        ...items.map(c => Object.values(c).join(','))
    ].join('\r\n'));

    return new Blob(['\uFEFF', csv_data], {
        type: 'text/csv;charset=utf-8'
    });
}

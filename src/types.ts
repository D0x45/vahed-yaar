/** time in 24-hour format (e.g. 23:15) */
export type Time = {
    hour: number,
    minute: number
};

/** structured representation of a valid date in any calendar */
export type Epoch = {
    year: number,
    month: number,
    day: number
};

/** day of the week number */
export const enum DayOfWeek {
    SAT, SUN, MON,
    TUE, WED, THU,
    FRI /* just in case anyone takes classes on a friday */
};

/**
 * these fields are common between
 * two datasets and can be reconstructed
 * to a degree which makes a perfect structure
 * but there may be extra fields in this record as extra metadata
 */
export interface ClassInfo {
    /**
     * bustan: `کد‌گروه‌درسي`,
     * golestan: `شماره و گروه درس`
     */
    id: number,
    /**
     * bustan: `كداستاندارد`,
     * golestan: `شماره و گروه درس`
     */
    courseId: number,
    /**
     * bustan: `درس`,
     * golestan: `نام درس`
     */
    courseTitle: string,
    /** bustan: `نوع‌درس` */
    courseType?: string,
    /** golestan: `کل` */
    credit?: number,
    /**
     * bustan: `ظرفیت خالی`,
     * golestan: `ظرفیت`
     */
    capacity: number,
    /**
     * bustan: `دانشكده`,
     * golestan: `دانشكده درس`
     */
    campus: string,
    /**
     * bustan: `شناسه دانشکده`,
     * golestan: `دانشکده درس`
     */
    campusId: number,
    /**
     * bustan: `نام‌مدرس`,
     * golestan: `نام استاد`
     */
    teachers: Array<string>,
    /**
     * bustan: `زمان‌ تشکيل‌ کلاس`,
     * golestan: `زمان و مكان ارائه/ امتحان`
     */
    sessions: Array<{
        starts: Time,
        ends: Time,
        /** whether the session is created on odd, even or all dates. undefined means all */
        dates?: 'odd' | 'even',
        day?: DayOfWeek,
        place?: string,
    }>,
    /**
     * bustan: `تاريخ‌ امتحان`,
     * golestan: `زمان و مكان ارائه/ امتحان`
     */
    exams: Array<Epoch & Time>
};

type _Assigner = (value: any, o: ClassInfo) => any;

/**
 * array of functions that take the raw `value` and the `output` object by reference
 * and parse that value and assign it to the `o` object
 *
 * each item in this array corresponds to a column:
 *
 * index `0` is column `A`,
 *
 * index `1` is column `B` and so on...
 *
 * NOTE: passing `undefined` discards that column
 */
export type ExcelColumnMapper = Array<undefined | _Assigner>;

/**
 * a function which will be bound to the field value on its creation inside the parser
 * that allows implementing custom string representation
 */
export type ClassInfoFieldStringifier<FieldName extends keyof ClassInfo> = (
    this: ClassInfo[FieldName] extends any[]
        // if it's an array then we need to extract the value type
        ? ClassInfo[FieldName][0]
        : ClassInfo[FieldName]
) => string;

/**
 * a function that determines a unique value id for the given row values.
 * the parser uses this to prevent data duplication
 */
export type RowIDGenerator = (rowValues: any[]) => string;

/**
 * descriptor type for dataset loaders.
 * functions that take raw `File`s and an `StateUpdater<ClassInfo[]>`
 */
export type DatasetLoader = {
    title: string,
    fn: (f: File) => Promise<void>
};

export type DatasetLoaderMap = Record<string, DatasetLoader>;

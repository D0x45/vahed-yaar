import {
    type ClassInfoFieldToStr,
    type ClassInfo,
    type ClassInfoParser,
} from '../types';

import * as common from './common';

// TODO: maybe use SheetJS?
import * as ExcelJS from 'exceljs';

const STORAGE_KEY0 = 'BustanParser_CreditMappings';

export class BustanParser implements ClassInfoParser {
    protected useLocalStorage: boolean = false;
    protected data: ClassInfo[];
    protected creditMappings: Record</* courseId */ string, number>;
    protected sessionsToStr: ClassInfoFieldToStr<'sessions'>;
    protected examsToStr: ClassInfoFieldToStr<'exams'>;

    constructor() {
        console.debug(`[${this.constructor.name}] constructor()`);
        this.data = [];
        this.sessionsToStr = common.defaultSessionToStr;
        this.examsToStr = common.defaultExamToStr;
        this.creditMappings = {};
    }

    protected parseExams(raw: any): ClassInfo['exams'] {
        if (
            !raw || typeof raw !== 'string'
            || raw.length === 0 || raw === common.defaultEmptyCell
        ) return [];

        console.debug(`[${this.constructor.name}] parseExams(raw=`, raw, ')');

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
        exam.toString = this.examsToStr;

        return [ exam ];
    }

    protected parseSessions(raw: any): ClassInfo['sessions'] {
        if (
            !raw || typeof raw !== 'string'
            || raw.length === 0 || raw === common.defaultEmptyCell
        ) return [];

        console.debug(`[${this.constructor.name}] parseSessions(raw=`, raw, ')');

        const [s, e] = [...raw.matchAll(/[0-9]{2}:[0-9]{2}/g)]
            .map(x => x[0].split(':').map(a => +a || 0));
        const farsiDayStr = raw.split(/[0-9]{2}:[0-9]{2}/).at(0);

        const session = {
            starts: { hour: +(s && s[0]), minute: +(s && s[1]) },
            ends:   { hour: +(e && e[0]), minute: +(e && e[1]) },
            day: farsiDayStr ? common.dayFromStr(farsiDayStr) : undefined,
        };

        // @ts-ignore: toJSON does not exist on type session. yeah no shit.
        session.toJSON = function (this: ClassInfo['sessions'][0]) {
            return {
                ...this,
                // a little hack for searching :)
                __day_str: 'روز:' + common.dayToStr(this.day)
            };
        };
        session.toString = this.sessionsToStr;

        return [ session ];
    }

    protected processClassInfoWorksheet(ws: ExcelJS.Worksheet) {
        console.debug(`[${this.constructor.name}] porcessClassInfoWorksheet(...)`);

        // is this inefficient?
        // let's hope the js engine optimizes this :\
        const mappers: Array<undefined|((v:any, o:ClassInfo)=>any)> = [
            /* A */ (value, o) => o.courseTitle = value ? common.sanitizeFarsi(value) : common.defaultEmptyCell,
            /* B */ (value, o) => o.courseId = +value || 0,
            /* C */ undefined, // discarded column
            /* D */ (value, o) => o.courseType = value ? common.sanitizeFarsi(value) : common.defaultEmptyCell,
            /* E */ (value, o) => o.id = +value || 0,
            /* F */ (value, o) => o.capacity = +value || 0,
            /* G */ (value, o) => o.campusId = +value || 0,
            /* H */ (value, o) => o.campus = value ? common.sanitizeFarsi(value) : common.defaultEmptyCell,
            /* I */ (value, o) => value && o.teachers.push(common.sanitizeFarsi(value)),
            /* J */ (value, o) => o.sessions = this.parseSessions(value),
            /* K */ (value, o) => o.exams = this.parseExams(value),
            // the rest are also discarded
        ];

        // clear the temporary array, might have previous parsed data.
        this.data.length = 0;

        for (
            // indexing starts at 1
            // also first row is the header
            // so index 2 is the actual first row
            let i = 2, itemIdx = 0;
            i <= ws.rowCount;
            ++i, ++itemIdx
        ) {
            const row = ws.getRow(i);
            const values = row.values;

            // check for invalid row
            if (!row.hasValues || !Array.isArray(values) || values.length < mappers.length) {
                console.warn(`[${this.constructor.name}] row ${i} has length of ${values.length} which is less than mappers.length=${mappers.length}`);
                continue;
            }

            const rowId = +values[5]!;

            console.debug(`[${this.constructor.name}] i=${i}, rowId=${rowId}, itemIdx=${itemIdx}`);

            // init the empty class info
            if (this.data[itemIdx] === undefined)
                this.data[itemIdx] = common.newClassInfo();

            // map each column/cell to the corresponding object field
            mappers.forEach(
                (assignerFn, index) => (assignerFn instanceof Function) && assignerFn(
                    values[index + 1],
                    //           ^^^
                    // ExcelJS gives a null value for index 0 of every row.values
                    this.data[itemIdx]
                )
            );

            // check for pre-existing creditMappings and assign the credit :)
            const itemCourseId = this.data[itemIdx].courseId.toString();
            if (itemCourseId in this.creditMappings) {
                console.debug(`[${this.constructor.name}] courseId=${itemCourseId} has previous credit=${this.creditMappings[itemCourseId]}`);
                this.data[itemIdx].credit = this.creditMappings[itemCourseId];
            }
        }
    }

    protected processFieldLessonWorksheet(ws: ExcelJS.Worksheet) {
        console.debug(`[${this.constructor.name}] processFieldLessonWorksheet(...)`);
        for (
            // indexing starts at 1
            // also first row is the header
            // so index 2 is the actual first row
            let i = 2, itemIdx = 0;
            i <= ws.rowCount;
            ++i, ++itemIdx
        ) {
            const row = ws.getRow(i);

            if (!row.hasValues || !Array.isArray(row.values))
                continue;

            const courseStandardId = String(row.values[3]!); // C
            const credits = (+row.values[5]! || 0) + (+row.values[6]! || 0); // E + F

            console.debug(
                `[${this.constructor.name}] courseId=`, courseStandardId,
                'credit=', credits
            );
            this.creditMappings[courseStandardId] = credits;
        }

        // store in local storage if allowed
        if (this.useLocalStorage)
            localStorage.setItem(
                STORAGE_KEY0,
                JSON.stringify(this.creditMappings)
            );
    }

    public setLocalStorageUse(allowed: boolean): void {
        console.debug(`[${this.constructor.name}] setLocalStorageUse(allowed=`, allowed, ')');
        this.useLocalStorage = allowed;
        // use local storage to cache some useful data
        if (allowed) {
            const stored = localStorage.getItem(STORAGE_KEY0)
            if (stored !== null && stored.length) {
                console.debug(`[${this.constructor.name}] reading localStorage...`);
                this.creditMappings = JSON.parse(stored);
            }
        }
    }

    public getDisplayName(): string {
        return 'بوستان';
    }

    public async parseFile(f: File): Promise<ClassInfo[]> {
        const wb = new ExcelJS.Workbook;

        console.debug(`[${this.constructor.name}] parseFile(file=`, f, ')');

        if (f.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            throw new Error('The file format is not supported!');

        try {
            console.debug(`[${this.constructor.name}] reading excel file...`);
            await wb.xlsx.load(
                await f.arrayBuffer(),
                { ignoreNodes: ['dataValidations'] }
            );
        } catch (e) {
            // The underlying library's error messages may not be user-friendly
            // so just sugar coat it :p
            throw new Error(`Malformed excel file: ${e}`, { cause: e });
        }

        console.debug(
            `[${this.constructor.name}] worksheet.actualColumnCount=`,
            wb.worksheets[0].actualColumnCount
        );

        if (wb.worksheets.length === 0)
            throw new Error('Excel workbook is empty!');

        switch (wb.worksheets[0].actualColumnCount) {
            case 12:
                this.processClassInfoWorksheet(wb.worksheets[0]);
                break;
            case 14:
                this.processFieldLessonWorksheet(wb.worksheets[0]);
                break;
            default:
                throw new Error('The worksheet does not have the right column count!');
        }

        // FIXME: right now the data returned is an actual reference to this
        // class's property which makes it writable. cloning is not allowed
        // because there are certain Closure's bound to Session and Exam objects
        // (the .toString and toJSON methods)
        // maybe turning those structured into classes fixes this problem???
        return /*structuredClone?*/(this.data);
    }
}

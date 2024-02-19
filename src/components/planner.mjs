// @ts-check
import { h } from 'preact';

/**
 * @param {Object} props
 * @param {Array<import('../parser/types').ClassInfo>} props.picks
 */
function Planner({ picks }) {
    const name = this.constructor.name;

    return h('span', null, ...picks.map(p => p.courseTitle))
}

export default Planner;

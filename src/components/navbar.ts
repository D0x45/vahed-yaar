import {
    type DatasetLoaderMap,
} from '../types';

import { h } from 'preact';
import { useState } from 'preact/hooks';

// ! TODO: localization and custom css
const _cls = 'flex justify-center mb-4';
const _load_btn_normal = {
    class: 'bg-blue-500 hover:bg-blue-700 text-white px-2 mr-2 rounded',
    disabled: false,
    text: 'بارگذاری'
};
const _load_btn_progress = {
    class: 'bg-gray-400 disabled hover:bg-blue-700 text-white px-2 mr-2 rounded',
    disabled: true,
    text: '...'
};
const _input = [
    'bg-gray-200 border-gray-200 text-gray-700',
    'focus:outline-none focus:bg-white focus:border-purple-500',
    'appearance-none leading-tight',
    'border-2 rounded py-1 px-2',
    'w-full'
].join(' ');

function Navbar(
    this: typeof Navbar,
    { datasetLoaders }: { datasetLoaders: DatasetLoaderMap }
) {
    const name = this.constructor.name;
    const datasetTypes = Object.keys(datasetLoaders);

    const [btnProperties, setBtnProperties] = useState(_load_btn_normal);
    const [type, setType] = useState(datasetTypes[0]);
    const [file, setFile] = useState<File | undefined>(undefined);

    console.debug(`[${name}] btnProperties=`, btnProperties);
    console.debug(`[${name}] type=`, btnProperties);
    console.debug(`[${name}] file=`, btnProperties);

    return h('div', { name, class: _cls },
        h('input', {
            type: 'file',
            class: _input,
            onChange: (e: any) => setFile(e.target?.files[0])
        }),
        h('select', { class: _load_btn_normal.class },
            datasetTypes.map(value => h('option', {
                value, onClick: () => setType(value)
            }, datasetLoaders[value].title))
        ),
        h('button', {
            type: 'button',
            class: btnProperties.class,
            disabled: btnProperties.disabled,
            onClick: () => {
                if (!file || !type) return;
                setBtnProperties(_load_btn_progress);
                datasetLoaders[type].fn(file)
                    .then(() => setBtnProperties(_load_btn_normal));
            }
        }, btnProperties.text)
    );
}

export default Navbar;

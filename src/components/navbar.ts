import {
    type DatasetLoaderMap,
} from '../types';

import { h } from 'preact';
import { useState } from 'preact/hooks';

// ! TODO: localization and custom css
const _cls = 'flex justify-center mb-4';
const _button = {
    class: 'bg-blue-500 hover:bg-blue-700 text-white px-2 mr-2 rounded',
    text: 'بارگذاری'
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

    const [type, setType] = useState(datasetTypes[0]);
    const [file, setFile] = useState<File | undefined>(undefined);

    return h('div', { name, class: _cls },
        h('input', {
            type: 'file',
            class: _input,
            onChange: (e: any) => setFile(e.target?.files[0])
        }),
        h('select', { class: _button.class },
            datasetTypes.map(value => h('option', {
                value, onclick: () => setType(value)
            }, datasetLoaders[value].title))
        ),
        h('button', {
            type: 'button',
            class: _button.class,
            onClick: (e: any) => {
                if (!file || !type) return;
                e.target.setAttribute('disabled', '1');
                e.target.classList.add('disabled', 'bg-gray-400');
                e.target.textContent = '...';
                datasetLoaders[type].fn(file).then(() => {
                    e.target.removeAttribute('disabled');
                    e.target.classList.remove('disabled', 'bg-gray-400');
                    e.target.textContent = _button.text;
                });
            }
        }, _button.text)
    );
}

export default Navbar;

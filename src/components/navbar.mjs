// @ts-check
import { h } from 'preact';
import { useState } from 'preact/hooks';

// ! TODO: localization and custom css
const _cls = 'flex justify-center mb-4';
const _button = {
    class: 'bg-blue-500 hover:bg-blue-700 text-white px-2 mr-2 rounded',
    text: 'بارگذاری'
};
const _input =  [
    'bg-gray-200 border-gray-200 text-gray-700',
    'focus:outline-none focus:bg-white focus:border-purple-500',
    'appearance-none leading-tight',
    'border-2 rounded py-1 px-2',
    'w-full'
].join(' ');
const _accept_err = 'پسوند(های) قابل قبول:';

/**
 * @param {Object} props
 * @param {string[]} props.accept accepted extensions for file input
 * @param {Record<string, {
 *     title: string,
 *     loader: (f: File) => Promise<void>
 * }>} props.handlers handlers registered for the dropdown and their respective loader callbacks
 */
function Navbar({
    accept,
    handlers,
}) {
    const name = this.constructor.name;
    const datasetKinds = Object.keys(handlers);

    /** the dropdown selection value */
    const [type, setType] = useState(datasetKinds[0]);

    /** @type {[ File|undefined, Function ]} */
    const [file, setFile] = useState(undefined);

    const onFileInputChanged = ({ target }) => {
        const path = target.value.split('.');
        const extension = `${path[path.length - 1]}`;
        if (!accept.includes(extension)) {
            target.value = '';
            alert(`${_accept_err} ${accept}`);
            return;
        }
        setFile(target.files[0]);
    };

    return h('div', { name, class: _cls },
        h('input', {
            type: 'file',
            class: _input,
            onChange: onFileInputChanged
        }),
        h('select', { class: _button.class },
            datasetKinds.map(value => h('option', {
                value, onclick: () => setType(value)
            }, handlers[value].title ))
        ),
        h('button', {
            type: 'button',
            class: _button.class,
            onClick: ({ target }) => {
                if (!file || !type) return;
                target.setAttribute('disabled', '1');
                target.classList.add('disabled', 'bg-gray-400');
                target.textContent = '...';
                handlers[type].loader(file).then(() => {
                    target.removeAttribute('disabled');
                    target.classList.remove('disabled', 'bg-gray-400');
                    target.textContent = _button.text;
                });
            }
        }, _button.text)
    );
}

export default Navbar;

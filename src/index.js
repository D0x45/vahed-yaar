// @ts-check
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import './style.css';

function App() {
    const [counter, setCounter] = useState(0);
    return h(
        'div', { name: this.constructor.name },
        h('button', {
            type: 'button',
            class: 'rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
            onClick: () => setCounter(x => ++x)
        }, counter)
    );
}

render(
    h(App, null),
    document.body
);

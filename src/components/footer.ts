import { h } from 'preact';

function Footer() {
    return h(
        'div',
        { 'class': 'flex justify-between mb-4 text-gray-300' },
        // TODO: put git version here
        h('span', null,
            // @ts-ignore: this will be injected with webpack DefinePlugin
            __VERSION__),
        h(
            'a',
            { href: 'https://github.com/d0x45', class: 'underline' },
            'made with frustration by @d0x45'
        ),
    );
}

export default Footer;

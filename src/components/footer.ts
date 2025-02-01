import { h } from 'preact';

function Footer() {
    // @ts-ignore: this will be injected with webpack DefinePlugin
    const ver = __VERSION__;

    return h(
        'div',
        { 'class': 'flex justify-center mb-4 text-gray-300' },
        h(
            'a',
            { href: `https://github.com/d0x45/vahed-yaar/commit/${ver}`, class: 'underline' },
            ver
        ),
    );
}

export default Footer;

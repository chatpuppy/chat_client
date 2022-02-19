module.exports = {
    title: 'chatpuppy docs',
    tagline: 'An interesting open source chat application',
    url: 'https://app.chatpuppy.com',
    baseUrl: '/chatpuppy/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/favicon.png',
    organizationName: 'yinxin630', // Usually your GitHub org/user name.
    projectName: 'chatpuppy', // Usually your repo name.
    themeConfig: {
        navbar: {
            title: 'ChatPuppy',
            logo: {
                alt: 'Logo',
                src: 'img/favicon.png',
            },
            items: [
                {
                    to: 'docs/getting-start',
                    activeBasePath: 'docs',
                    label: 'Docs',
                    position: 'right',
                },
                {
                    href: 'https://github.com/chatpuppy',
                    label: 'GitHub',
                    position: 'right',
                },
                {
                    type: 'localeDropdown',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'Overview',
                            to: '/',
                        },
                        {
                            label: 'Getting Start',
                            to: 'docs/getting-start',
                        },
                        {
                            label: 'Change Log',
                            to: 'docs/changelog',
                        },
                    ],
                },
                {
                    title: 'Community',
                    items: [
                        {
                            label: 'Feedback',
                            href:
                                'https://app.chatpuppy.com/invite/group/5adacdcfa109ce59da3e83d3',
                        },
                        {
                            label: 'Issues',
                            href: 'https://github.com/chatpuppy/chat_client/issues',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'Author',
                            href: 'https://chatpuppy.com',
                        },
                        {
                            label: 'GitHub',
                            href: 'https://github.com/chatpuppy/chat_client',
                        },
                    ],
                },
            ],
            copyright: `Copyright © 2015 - ${new Date().getFullYear()} developed by 碎碎酱`,
        },
        colorMode: {
            disableSwitch: true,
        },
    },
    presets: [
        [
            '@docusaurus/preset-classic',
            {
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    // Please change this to your repo.
                    editUrl: 'https://github.com/chatpuppy/chat_client/edit/master/docs/',
                },
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            },
        ],
    ],
    i18n: {
        defaultLocale: 'en',
        locales: ['en', 'zh-Hans'],
        localeConfigs: {
            en: {
                label: 'English',
            },
            'zh-Hans': {
                label: '简体中文',
            },
        },
    },
};

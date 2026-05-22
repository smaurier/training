import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Training App',
  description: 'Documentation du projet',
  themeConfig: {
    nav: [
      { text: 'Accueil', link: '/' },
    ],
    sidebar: [
      {
        text: 'Projet',
        items: [
          { text: 'Spécifications', link: '/specs' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],
    socialLinks: [],
  },
})

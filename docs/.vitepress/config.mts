import cliSidebar from '../cli/sidebar.mts'
import { groupIconMdPlugin, groupIconVitePlugin, localIconLoader } from 'vitepress-plugin-group-icons'
import lightbox from 'vitepress-plugin-lightbox'
import type MarkdownIt from 'markdown-it'

// Minimal local type aliases to avoid importing markdown-it internals
type Token = {
  type: string
  tag?: string
  attrs?: Array<[string, string]> | null
  children?: Token[]
  [k: string]: any
}

type StateCore = {
  tokens: any
  [k: string]: any
}

export default {
  title: 'Dockform',
  titleTemplate: 'Dockform - :title',
  description: 'IaC for Docker Compose',
  // cleanUrls: true,
  head: [['link', { rel: 'icon', href: '/img/favicon_adaptive.svg', type: 'image/svg+xml' }]],
  markdown: {
    config(md: MarkdownIt) {
      md.use(groupIconMdPlugin)
      // automatically mark images as zoomable by adding data-zoomable attr
      md.core.ruler.push('add_data_zoomable', (state: StateCore) => {
        const tokens = state.tokens as Token[]
        for (const token of tokens) {
          if (token.type === 'inline' && token.children) {
            const children = token.children as Token[]
            for (const child of children) {
              if (child.type === 'image') {
                // prefer attrSet when available
                if (typeof (child as any).attrSet === 'function') {
                  ;(child as any).attrSet('data-zoomable', '')
                  continue
                }
                // fallback to manipulating attrs array
                child.attrs = child.attrs || []
                const has = (child.attrs as Array<[string, string]>).find((a) => a && a[0] === 'data-zoomable')
                if (!has) (child.attrs as Array<[string, string]>).push(['data-zoomable', ''])
              }
            }
          }
        }
      })

      // Lightbox for clickable zoomable images
      md.use(lightbox, {})
    }
  },
  vite: {
    plugins: [
      groupIconVitePlugin({
        customIcon: {
          'dockform.yaml': localIconLoader(import.meta.url, '../public/img/icon_adaptive.svg'),
          'dockform': localIconLoader(import.meta.url, '../public/img/icon_adaptive.svg'),
          'docker': 'vscode-icons:file-type-docker',
        },
      })
    ]
  },
  themeConfig: {
    logo: {
      light: '/img/logo_light.svg',
      dark: '/img/logo_dark.svg',
      alt: 'Dockform'
    },
    search: { provider: 'local' },
    nav: [
      { text: 'v0.6.1', link: 'https://github.com/gcstr/dockform/releases/' }
    ],
    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Dockform?', link: '/introduction/what_is_dockform' },
            { text: 'Getting Started', link: '/introduction/getting_started' }
          ]
        },
        {
          text: 'The Manifest File',
          items: [
            { text: 'Overview',         link: '/manifest/overview' },
            { text: 'Interpolation',    link: '/manifest/interpolation' },
            { 
              text: 'Secrets',
              link: '/manifest/secrets/secrets',
              items: [
                { text: 'Age', link: '/manifest/secrets/age_with_sops' },
                { text: 'GnuPG', link: '/manifest/secrets/gpg_with_sops' },
              ]
            },
            { text: 'Volumes',          link: '/manifest/volumes' },
            { text: 'Networks',         link: '/manifest/networks' },
            { text: 'Filesets',         link: '/manifest/filesets' },
            { text: 'Applications',     link: '/manifest/applications' },
          ]
        },
        {
          text: 'More',
          items: [
            { text: 'Why not X?',   link: '/more/why_not_x' },
            { text: 'Dashboard',   link: '/more/dashboard' },
            { text: 'Best Practices',   link: '/more/best_practices' },
            { text: 'Snapshots and Restore', link: '/more/snapshots_and_restore' },
            { text: 'Debugging',        link: '/more/debugging' }
          ]
        },
        ...cliSidebar
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/gcstr/dockform' }]
  }
}



import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "GoofishCBot",
  description: "闲鱼卡密机器人 - 自动回复、自动发货、订单管理",
  lang: 'zh-CN',
  base: '/GoofishCredentialsBot/',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/getting-started' },
      { text: '功能说明', link: '/guide/features' },
      { text: 'API 文档', link: '/api/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '项目结构', link: '/guide/project-structure' },
            { text: '技术栈', link: '/guide/tech-stack' }
          ]
        },
        {
          text: '功能说明',
          items: [
            { text: '功能概览', link: '/guide/features' },
            { text: '仪表盘', link: '/guide/features/dashboard' },
            { text: '账号管理', link: '/guide/features/accounts' },
            { text: '商品管理', link: '/guide/features/goods' },
            { text: '订单管理', link: '/guide/features/orders' },
            { text: '会话管理', link: '/guide/features/conversations' },
            { text: '自动回复', link: '/guide/features/autoreply' },
            { text: '自动发货', link: '/guide/features/autosell' },
            { text: '工作流', link: '/guide/features/workflow' },
            { text: '系统日志', link: '/guide/features/logs' },
            { text: '系统设置', link: '/guide/features/settings' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 文档',
          items: [
            { text: '概述', link: '/api/' },
            { text: '账号管理', link: '/api/accounts' },
            { text: '会话消息', link: '/api/conversations' },
            { text: '商品管理', link: '/api/goods' },
            { text: '订单管理', link: '/api/orders' },
            { text: '自动回复', link: '/api/autoreply' },
            { text: '自动发货', link: '/api/autosell' },
            { text: '工作流', link: '/api/workflow' },
            { text: '系统日志', link: '/api/logs' },
            { text: '系统状态', link: '/api/status' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: 'GoofishCBot - 闲鱼卡密机器人',
      copyright: 'MIT License'
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    }
  }
})

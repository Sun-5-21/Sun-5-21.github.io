---
layout: post
title: "用 Jekyll + GitHub Pages 搭一个免费博客"
date: 2026-10-12 09:30:00 +0800
categories: 教程
tags: [Jekyll, GitHub Pages, 博客]
---

这个站就是这么搭起来的,把过程记下来,方便以后重建或者推荐给别人。

## 为什么选这套方案

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| **Jekyll + GitHub Pages** | 官方原生支持,推送即构建,零 CI 配置 | 只能用白名单插件 |
| Hexo / Hugo | 主题丰富、构建快 | 需要自己配 GitHub Actions |
| 动态博客(WordPress) | 后台可视化 | 要服务器、要维护、要钱 |

结论很明确:**个人博客这种低更新频率、纯静态的场景,GitHub Pages 原生 Jekyll 是维护成本最低的。**

## 一、创建仓库

仓库名有两种玩法,GitHub 的规则不一样:

- **用户主页站点**:仓库名必须是 `<你的用户名>.github.io`,网址是 `https://<用户名>.github.io`
- **项目站点**:仓库名随便取,网址是 `https://<用户名>.github.io/<仓库名>/`

我用的是第一种,所以仓库叫 `Sun-5-21.github.io`。

这里是第一个大坑:**用户主页站点必须把 `baseurl` 设为空字符串**,否则所有静态资源都会 404。

```yaml
# 用户主页站点
url: "https://sun-5-21.github.io"
baseurl: ""

# 项目站点则要这样写
# url: "https://sun-5-21.github.io"
# baseurl: "/my-blog"
```

## 二、目录结构

Jekyll 有一套约定俗成的目录名,记住这几个就够了:

```text
.
├── _config.yml        # 全局配置
├── Gemfile            # 本地预览的依赖
├── index.md           # 首页
├── about.md           # 关于页
├── archive.html       # 归档页
├── 404.html           # 404 页面
├── assets/
│   └── main.scss      # 自定义样式
└── _posts/            # 文章都放这里
    └── 2026-10-16-hello-world.md
```

以 `_` 开头的目录不会被输出到站点里,`_posts` 是唯一会生成页面的例外。

## 三、文章的命名和头部

文件名必须是 `年-月-日-英文标题.md`,日期错了文章就不会显示:

```text
_posts/2026-10-16-hello-world.md
```

文件开头那段 `---` 包起来的东西叫 front matter,是文章的元信息:

```yaml
---
layout: post
title: "你好,世界"
date: 2026-10-16 10:00:00 +0800
categories: 随笔
tags: [Jekyll, 博客]
---
```

两个容易踩的点:

- `title` 里如果有冒号或中文标点,一定要用引号包起来,否则 YAML 解析会报错。
- **日期不能是未来时间**,否则这篇文章在构建时会被直接跳过,而且不报错,非常难查。

## 四、发布

```bash
git add .
git commit -m "post: 新文章"
git push
```

推上去之后 GitHub 会自动构建,通常一两分钟就能在网址上看到。

构建状态和报错可以在仓库的 **Actions** 标签页里看,失败原因通常写得很清楚。

## 五、本地预览(可选)

装了 Ruby 之后可以本地起服务,改完立刻能看到效果:

```bash
bundle install
bundle exec jekyll serve
# 然后打开 http://127.0.0.1:4000
```

Windows 上如果 `bundle install` 卡在 `nokogiri` 之类的原生扩展上,装一个带 DevKit 的
[RubyInstaller](https://rubyinstaller.org/) 基本都能解决。

## 六、能用的插件

GitHub Pages 只允许白名单里的插件,常用的这些都没问题:

- `jekyll-feed` —— 生成 RSS
- `jekyll-seo-tag` —— SEO 元信息
- `jekyll-sitemap` —— 生成 sitemap.xml
- `jekyll-redirect-from` —— 页面重定向

像 `jekyll-archives`(自动生成分类页)就不在白名单里,想用只能换成 GitHub Actions 构建。
我的做法是**归档页自己用 Liquid 写一个循环**,十几行就够了,没必要为它上 CI。

## 小结

整套东西的核心就三件事:**仓库名决定 baseurl、文件名决定日期、front matter 决定标题**。
把这三个搞清楚,GitHub Pages 基本不会再给你制造惊喜了。

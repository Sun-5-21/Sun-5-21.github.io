# Sun 的博客

基于 **Jekyll + minima 主题** 的个人博客,托管在 **GitHub Pages** 上。
全部内容都是仓库里的 Markdown 文件,写完 `git push` 就会自动发布。

- 站点地址:<https://sun-5-21.github.io>
- 仓库地址:<https://github.com/Sun-5-21/Sun-5-21.github.io>

---

## 目录结构

```text
.
├── _config.yml                  # 全站配置(标题、作者、导航、插件…)
├── Gemfile                      # 本地预览用的依赖
├── index.md                     # 首页(文章列表)
├── about.md                     # 关于页
├── archive.html                 # 归档页(按年份分组)
├── 404.html                     # 404 页面
├── assets/
│   └── main.scss                # 自定义样式
├── _posts/                      # ✅ 所有文章放这里
├── tools/
│   └── check_site.py            # 自检脚本(不会发布到站点)
└── README.md                    # 本文件(不会发布到站点)
```

---

## 写一篇新文章

### 1. 新建文件

在 `_posts/` 下新建文件,**文件名格式固定**:

```text
_posts/年-月-日-英文短标题.md
```

例如:`_posts/2026-10-20-my-first-post.md`

### 2. 填写 front matter

文件开头 `---` 之间的部分叫 front matter,是文章的元信息:

```yaml
---
layout: post
title: "文章标题"
date: 2026-10-20 14:00:00 +0800
categories: 随笔
tags: [标签一, 标签二]
---
```

### 3. 正文

用 Markdown 写就行,Jekyll 会自动套用文章模板、生成目录和 RSS。

### 4. 发布

```bash
git add .
git commit -m "post: 新增一篇文章"
git push
```

推上去之后 GitHub 会自动构建,通常 1~2 分钟生效。
构建进度和报错在仓库的 **Actions** 标签页查看。

---

## ⚠️ 三个最容易踩的坑

| 坑 | 现象 | 解法 |
| --- | --- | --- |
| **日期是未来时间** | 文章凭空消失,且不报错 | front matter 的 `date` 和文件名日期都要早于当前时间 |
| **`title` 含冒号没加引号** | 构建失败,报 YAML 错误 | 标题一律用双引号包起来,例如 `title: "Hello: World"` |
| **正文写了连续两个左花括号** | 内容变成空白或构建报错 | 那是 Liquid 模板语法,要原样展示请用 `{% raw %}` … `{% endraw %}` 包住 |

---

## 本地预览(可选)

需要先安装 [Ruby](https://rubyinstaller.org/)(Windows 选带 DevKit 的版本)。

```bash
bundle install
bundle exec jekyll serve
```

然后打开 <http://127.0.0.1:4000>。

常用参数:

```bash
bundle exec jekyll serve --drafts     # 同时预览 _drafts/ 里的草稿
bundle exec jekyll serve --livereload # 改完自动刷新浏览器
```

> 本机当前**没有安装 Ruby**,所以上面的命令暂时跑不了。
> 只写文章的话不需要它 —— 直接 push,GitHub 会帮你构建。

---

## 推送前自检(推荐)

仓库里带了一个自检脚本,推送前跑一下可以提前抓到 Jekyll 最容易出问题的地方,
**不需要安装 Ruby**,只需要 Python:

```bash
pip install pyyaml
python tools/check_site.py
```

它会检查:

- `_config.yml` 能否解析,`baseurl`、插件白名单、主题皮肤是否正确
- 所有页面的 front matter 是不是合法 YAML
- 文章文件名、`layout`、`title`、日期是否规范,**日期是不是落在了未来**
- 导航栏 `header_pages` 引用的页面是否存在
- 正文里有没有残留会被 Liquid 吃掉的花括号

没有错误时退出码是 `0`,可以放心 `git push`。

---

## 常用自定义

### 改站点标题 / 作者 / 描述

编辑 `_config.yml` 顶部的 `title`、`author`、`description`、`email`。

### 换配色主题

编辑 `_config.yml` 里的 `minima.skin`,可选:

`classic`(默认)、`dark`、`solarized`、`solarized-dark`、`solarized-light`、`auto`

### 改导航栏

`_config.yml` 里的 `header_pages`,填文件名即可,顺序就是显示顺序。

### 改样式

`assets/main.scss` 里 `@import "minima";` **之后**的部分是自定义 CSS,
随便改;想覆盖配色变量则要写在 `@import` **之前**。

### 换图标 / 加社交链接

编辑 `_config.yml` 里的 `minima.social_links`,支持 `github`、`twitter`、`linkedin`、
`stackoverflow`、`email` 等。

---

## 部署设置

仓库的 **Settings → Pages** 需要保持如下配置:

- **Source**: `Deploy from a branch`
- **Branch**: `main` / `(root)`

因为这是 `<用户名>.github.io` 仓库,发布出来就是站点根目录,
所以 `_config.yml` 里的 `baseurl` **必须为空字符串**。

---

## 许可

文章内容版权归作者所有,代码部分可随意取用。

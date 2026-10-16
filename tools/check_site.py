#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""博客自检脚本 —— 在没有 Ruby / Jekyll 的机器上也能提前发现构建问题。

用法(在仓库根目录执行):
    python tools/check_site.py

检查内容:
  1. _config.yml 能否解析,关键项是否正确(baseurl / 插件白名单 / skin)
  2. 所有 .md / .html 的 front matter 是否为合法 YAML
  3. 文章文件名、layout、title、日期是否规范,日期是否落在未来
  4. header_pages 里引用的页面是否存在
  5. 文章正文里是否残留未转义的 Liquid 标记(会导致构建报错或内容空白)

退出码 0 表示没有错误,1 表示存在错误。
"""

import os
import re
import sys
import io
import datetime

try:
    import yaml
except ImportError:
    sys.stderr.write("缺少依赖,请先执行: pip install pyyaml\n")
    sys.exit(2)

# tools/ 的上一级才是仓库根目录
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

errors, warns, info = [], [], []

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S | re.M)
POST_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-(.+)\.(md|markdown|html)$")

# GitHub Pages 允许使用的插件白名单(节选常用部分)
GH_PAGES_PLUGINS = {
    "jekyll-feed", "jekyll-seo-tag", "jekyll-sitemap", "jekyll-redirect-from",
    "jekyll-gist", "jekyll-avatar", "jemoji", "jekyll-mentions",
    "jekyll-include-cache", "jekyll-optional-front-matter",
    "jekyll-relative-links", "jekyll-default-layout",
    "jekyll-titles-from-headings", "jekyll-github-metadata",
    "jekyll-paginate", "jekyll-coffeescript", "jekyll-remote-theme",
    "jekyll-readme-index",
}


def relpath(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


# ---------------------------------------------------------------- 1. 配置
cfg_path = os.path.join(ROOT, "_config.yml")
if not os.path.isfile(cfg_path):
    errors.append("找不到 _config.yml")
    cfg = {}
else:
    with io.open(cfg_path, encoding="utf-8") as f:
        try:
            cfg = yaml.safe_load(f) or {}
        except yaml.YAMLError as exc:
            errors.append("_config.yml YAML 解析失败: %s" % exc)
            cfg = {}
    if cfg:
        info.append("_config.yml 解析成功")

for key in ("title", "url", "baseurl", "theme", "description", "permalink"):
    if key not in cfg:
        errors.append("_config.yml 缺少必需项: %s" % key)

if "baseurl" in cfg and cfg.get("baseurl") != "":
    errors.append("baseurl 应为空字符串(用户主页站点),当前为 %r" % cfg.get("baseurl"))

if cfg.get("email") == "":
    errors.append("email 是空字符串 —— Liquid 中空字符串为真值,页脚会渲染出空的邮件链接;"
                  "要留空请写成 `email:`")

for plugin in cfg.get("plugins") or []:
    if plugin not in GH_PAGES_PLUGINS:
        errors.append("插件 %s 不在 GitHub Pages 白名单内,会导致构建失败" % plugin)

skins = {"classic", "dark", "solarized", "solarized-dark", "solarized-light", "auto"}
skin = (cfg.get("minima") or {}).get("skin")
if skin and skin not in skins:
    errors.append("minima.skin 取值非法: %r(可选 %s)" % (skin, "/".join(sorted(skins))))

# ------------------------------------------------- 2. 遍历页面 + front matter
skip_dirs = {"_site", "node_modules", "tools", "vendor"}
pages, posts = [], []

for dirpath, dirnames, filenames in os.walk(ROOT):
    # 跳过以点开头的目录(.git / .preview / .bundle …)
    dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith(".")]
    for filename in filenames:
        if not filename.endswith((".md", ".markdown", ".html")):
            continue
        full = os.path.join(dirpath, filename)
        rel = relpath(full)
        with io.open(full, encoding="utf-8") as f:
            text = f.read()

        match = FM_RE.match(text)
        if not match:
            if rel != "README.md":
                warns.append("%s 没有 front matter,Jekyll 不会套用布局" % rel)
            continue

        try:
            fm = yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError as exc:
            errors.append("%s 的 front matter 不是合法 YAML: %s" % (rel, exc))
            continue

        if not isinstance(fm, dict):
            errors.append("%s 的 front matter 不是键值对" % rel)
            continue

        pages.append((rel, fm))
        if rel.startswith("_posts/"):
            posts.append((rel, fm))

info.append("解析了 %d 个带 front matter 的文件,其中文章 %d 篇" % (len(pages), len(posts)))

# ---------------------------------------------------------------- 3. 文章
now = datetime.datetime.now()
for rel, fm in posts:
    filename = os.path.basename(rel)
    match = POST_RE.match(filename)
    if not match:
        errors.append("%s 文件名不符合「年-月-日-英文标题.md」格式" % rel)
        continue

    file_date = datetime.date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    if file_date > now.date():
        errors.append("%s 文件名日期是未来时间,文章不会出现在站点上" % rel)

    if "date" not in fm:
        warns.append("%s 缺少 date,将回退使用文件名日期" % rel)
    else:
        value = fm["date"]
        if isinstance(value, datetime.datetime) and value.replace(tzinfo=None) > now:
            errors.append("%s 的 date 是未来时间,文章会被静默跳过" % rel)

    if fm.get("layout") != "post":
        errors.append("%s 的 layout 应为 post,当前为 %r" % (rel, fm.get("layout")))
    if "title" not in fm:
        errors.append("%s 缺少 title" % rel)

    for field in ("categories", "tags"):
        value = fm.get(field)
        if value is not None and not isinstance(value, (str, list)):
            errors.append("%s 的 %s 类型非法: %r" % (rel, field, value))

# ---------------------------------------------------------- 4. 导航栏引用
known = {rel for rel, _ in pages}
for header in cfg.get("header_pages") or []:
    if header not in known:
        errors.append("header_pages 引用的 %s 不存在" % header)

# ------------------------------------------------- 5. 正文里的 Liquid 标记
for rel, _ in posts:
    with io.open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        body = FM_RE.sub("", f.read(), count=1)
    for token in ("{{", "{%"):
        if token in body:
            errors.append("%s 正文出现未转义的 Liquid 标记 %s —— "
                          "要原样展示请用 raw / endraw 包住" % (rel, token))

# ---------------------------------------------------------------- 输出
print("=" * 64)
for line in info:
    print("[信息] " + line)
for line in warns:
    print("[警告] " + line)
for line in errors:
    print("[错误] " + line)
print("=" * 64)
print("自检完成:错误 %d 个,警告 %d 个" % (len(errors), len(warns)))

sys.exit(1 if errors else 0)

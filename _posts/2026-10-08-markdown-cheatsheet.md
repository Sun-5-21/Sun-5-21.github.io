---
layout: post
title: "Markdown 写作速查表"
date: 2026-10-08 20:15:00 +0800
categories: 教程
tags: [Markdown, 写作]
---

写博客天天用 Markdown,把常用语法整理成一页,忘了就回来翻。

## 标题

```markdown
# 一级标题
## 二级标题
### 三级标题
```

正文里从 `##` 开始用就好,`#` 留给文章标题。

## 强调

```markdown
*斜体*  **加粗**  ***粗斜体***  ~~删除线~~
行内代码:`print("hello")`
```

效果:*斜体*、**加粗**、***粗斜体***、~~删除线~~、`print("hello")`。

## 列表

```markdown
- 无序项
- 无序项
  - 缩进两个空格就是子项

1. 有序项
2. 有序项

- [ ] 待办
- [x] 已完成
```

## 链接与图片

```markdown
[链接文字](https://example.com)
[带标题的链接](https://example.com "鼠标悬停显示")
![图片描述](/assets/images/pic.png)
```

图片建议放在 `assets/images/` 下,用 `/assets/images/xxx.png` 这种以斜杠开头的绝对路径引用,
这样不管文章 URL 多深都不会失效。

## 引用

```markdown
> 第一层引用
>
> > 嵌套引用
```

> 第一层引用
>
> > 嵌套引用

## 代码块

用三个反引号包起来,并在开头写上语言名就能高亮:

````text
```python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
```
````

## 表格

```markdown
| 左对齐 | 居中 | 右对齐 |
| :--- | :---: | ---: |
| a | b | c |
```

| 左对齐 | 居中 | 右对齐 |
| :--- | :---: | ---: |
| a | b | c |

## 分隔线

```markdown
---
```

## 站在 Jekyll 这边的两个坑

写 Jekyll 博客时,Markdown 会先过一遍 **Liquid 模板引擎**,所以有两件事要注意:

1. **连续两个左花括号会出事。** Markdown 里写下的模板变量会在排版之前先被 Liquid 解析掉,
   轻则渲染成一片空白,重则直接构建失败,而且报错信息往往指向别处,很难查。
   要原样展示这类语法,得把它包在 Liquid 的 raw 与 endraw 标签之间。
2. **中文标点别混进 YAML。** front matter 里的 `title` 一旦包含冒号就必须加引号。

---

速查表就到这里。真正写起来最常用的其实只有标题、列表、代码块和链接这四样,
其余的用到再查就行。

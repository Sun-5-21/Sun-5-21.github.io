---
layout: home
list_title: 最新文章
---

{% if site.posts.size > 0 %}
这里记录我在 **编程 / 学习 / 生活** 中的一些思考与笔记。

想了解我可以看 [关于我](/about/)。
{% else %}
<div class="sdv-empty">
  <p class="sdv-empty-title">还没有文章</p>
  <p>第一篇文章写完就会出现在这里。</p>
  <p>可以先看看 <a href="/about/">关于我</a>，或者订阅 <a href="/feed.xml">RSS</a>。</p>
</div>
{% endif %}

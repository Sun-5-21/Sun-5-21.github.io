---
layout: home
list_title: 最新文章
---

{% if site.posts.size > 0 %}
你好,欢迎来到我的小农场 👋

这里种着一些关于 **编程 / 学习 / 生活** 的碎碎念。
想了解我这个不太靠谱的场主,可以看 [关于我](/about/)。
{% else %}
<div class="sdv-empty">
  <p class="sdv-empty-title">农场还空着</p>
  <p>地已经翻好了,种子还没买。<br>
  第一篇文章正在 <code>_posts/</code> 里等着发芽。</p>
  <p>在它长出来之前,可以先看看 <a href="/about/">关于我</a>,
  或者订阅 <a href="/feed.xml">RSS</a>。</p>
</div>
{% endif %}

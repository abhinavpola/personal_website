---
layout: base
title: Portfolio
---
<div class="portfolio">
  {% for project in site.data.projects %}
  <div class="card">
    <h3>{{ project.title }}</h3>
    <p>{{ project.description }}</p>
    <a href="{{ project.url }}" target="_blank">View Project</a>
  </div>
  {% endfor %}
</div>

## Latest Blog Posts

<ul>
  {% for post in site.posts limit:5 %}
  <li>
    <a href="{{ post.url }}">{{ post.title }}</a> 
    <small>{{ post.date | date: "%b %-d, %Y" }}</small>
  </li>
  {% endfor %}
</ul>

<a href="{{ '/blog/' }}">View All Posts</a>

<style>
.portfolio {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.card {
  border: 1px solid #ddd;
  padding: 20px;
  width: 30%;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
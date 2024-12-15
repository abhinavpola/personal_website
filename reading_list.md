---
layout: base
title: Reading List
---
<div class="portfolio">
  {% for book in site.data.books %}
  <div class="card">
    <h3>{{ book.title }}</h3>
    <p>{{ book.description }}</p>
    <a href="{{ book.url }}" target="_blank">Check out on Amazon</a>
  </div>
  {% endfor %}
</div>

<style>
.portfolio {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
}
.card {
  border: 1px solid #ddd;
  padding: 20px;
  width: 30%;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
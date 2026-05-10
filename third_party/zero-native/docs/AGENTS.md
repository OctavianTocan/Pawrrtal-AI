# Docs Site Conventions

## MDX Tables

Always use HTML `<table>` syntax in MDX pages, never markdown pipe tables. This ensures consistent styling and avoids MDX parsing edge cases.

```html
<table>
  <thead>
    <tr>
      <th>Column</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>field</code></td>
      <td>What it does</td>
    </tr>
  </tbody>
</table>
```

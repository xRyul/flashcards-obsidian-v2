# User Guide

## Card Creation Examples

### Basic Card
```markdown
What is the capital of France? #card
Paris
```

### Cloze Card
```markdown
The {{c1::mitochondria}} is the powerhouse of the cell. #card
```

### Inline Card
```markdown
Capital of Germany :: Berlin
```

### Reversed Card (creates cards in both directions)
```markdown
Berlin ::: Capital of Germany
```

### With Images
```markdown
What does a neuron look like? #card
![[neuron.png]]
```

### With Code
````markdown
How to define a function in Python? #card
```python
def hello_world():
    print("Hello, World!")
```
````

### With Math
```markdown
What is the formula for the area of a circle? #card
$A = \pi r^2$
$$
\binom{n}{k} = \frac{n!}{k!(n-k)!}
$$
```

### Specify Deck with YAML Frontmatter
```markdown
---
cards-deck: Biology::Cell Biology
---

What is the mitochondria? #card
The powerhouse of the cell
```

## Documentation

- [Installation Guide](./installation.md) - How to install and set up the plugin
- [Creating Cards](./creating-cards.md) - Learn the different ways to create flashcards
- [Configuration Guide](./configuration.md) - Configure the plugin to fit your workflow
- [Examples and Templates](./examples.md) - More examples and templates for different subjects
- [Troubleshooting](./troubleshooting.md) - Solutions to common issues

## Common Commands

- Generate flashcards for the current file: Click the flashcard icon in the ribbon
- Delete cards from Anki only: Select card IDs in the editor, use command palette
- Delete all cards in current file from Anki: Use command palette


## Need Help?

If you can't find what you're looking for in this documentation, try:

1. Checking the [Troubleshooting](./troubleshooting.md) guide
2. Visiting the [GitHub repository](https://github.com/reuseman/flashcards-obsidian) for the latest updates
3. Asking in the Obsidian community forums

## Quick Reference

### Card Types

| Card Type | Syntax | Description |
|-----------|--------|-------------|
| Basic | `Question? #card` | Simple question and answer |
| Inline | `Question :: Answer` | Compact inline format |
| Reversed | `Term ::: Definition` | Creates cards in both directions |
| Cloze | `The {{c1::term}} is ...` | Cloze deletion (fill in the blank) |
| Spaced | `Review X #spaced` | Simple reminder cards |

### Card Features

| Feature | Description |
|---------|-------------|
| Heading Breadcrumbs | Adds hierarchical context from headings |
| Media Support | Include images and audio in cards |
| Code Highlighting | Proper syntax highlighting for code blocks |
| Math Notation | Support for LaTeX math expressions |
| Tags | Add Anki tags for organization |

### Common Commands

- Generate flashcards for the current file (Ribbon icon or Command palette)
- Delete selected card(s) from Anki only (Command palette)
- Delete all cards in current file from Anki only (Command palette) 
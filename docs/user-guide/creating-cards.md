# Creating Flashcards

This guide shows all the ways to create flashcards using the plugin.

## Card Formats

### Basic Question/Answer Cards

```markdown
What is the capital of France? #card
Paris
```

The question comes before the #card tag, and the answer follows on the next line(s).

### Cloze Deletion Cards

```markdown
The {c1:mitochondria} is the {c2:powerhouse} of the cell.
```

Enclose text to be hidden with `{c1:text}` where the number indicates grouping. No #card tag is needed for cloze cards.

### Inline Cards

```markdown
Capital of France :: Paris
```

Question and answer on the same line, separated by `::`.

### Multi-line Inline Cards

```markdown
What are the three branches of the US government? ::
- Executive
- Legislative 
- Judicial
```

### Reversed Cards

```markdown
Berlin ::: Capital of Germany
```

Creates two cards: "Berlin → Capital of Germany" and "Capital of Germany → Berlin".

### Reversed Card (with Multi-line)

```markdown
Photosynthesis ::: Process where plants:
- Convert light energy to chemical energy
- Produce oxygen
- Create glucose from CO2 and water
```

## Context-Aware Cards

Cards automatically inherit context from headings:

```markdown
# French Vocabulary

## Animals

Chat :: Cat
Chien :: Dog
```

Creates cards with "French Vocabulary > Animals > Chat" as the question context.

## Media in Cards

### Images

```markdown
What does a neuron look like? #card
![[neuron.png]]
```

### Audio

```markdown
How does a clarinet sound? #card
![[clarinet_sample.mp3]]
```

## Formatting

### Bold and Italic

```markdown
Which HTML tag creates **bold** text? #card
The `<strong>` tag
```

### Code Blocks

```markdown
How to print "Hello World" in Python? #card
```python
print("Hello World")
```

### Math Formulas

```markdown
What is the quadratic formula? #card
$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
```

## Setting Card Properties

### Deck Name in YAML Frontmatter

```markdown
---
cards-deck: Biology
---

What is DNA? #card
Deoxyribonucleic acid, a molecule that carries genetic information
```

### Inline Deck Specification

```markdown
What is RNA? #card #deck:Biology
Ribonucleic acid, a molecule essential for protein synthesis
```

### Card Tags

```markdown
What is a mitochondrion? #card #tag:organelle #tag:cell-biology
The powerhouse of the cell
```

## Card Types

The plugin supports several card types:

1. **Basic Cards**: Question and answer cards
2. **Cloze Deletion Cards**: Sentences with hidden portions
3. **Reversed Cards**: Cards that create a backward association (answer → question)
4. **Spaced Cards**: Single prompt cards for spaced repetition

## Card Creation Syntax

### Basic Cards with #card Tag

The simplest way to create a card is to use the `#card` tag:

```markdown
What is the capital of France? #card
Paris
```

In this format:
- The line with the `#card` tag is the question
- The lines below (until a blank line or another card) form the answer

You can also use this format in bullet points or numbered lists:

```markdown
- What is the capital of Italy? #card
  - Rome
```

### Inline Cards with Separators

For shorter cards, you can use inline syntax with separators:

```markdown
Capital of Germany :: Berlin
```

In this format:
- `::` is the default separator between question and answer
- You can configure a different separator in the plugin settings

#### Reversed Cards

You can create reversed cards (which also quiz you on the reverse association) using `:::` instead of `::`:

```markdown
Berlin ::: Capital of Germany
```

This creates two cards in Anki:
1. Q: Berlin, A: Capital of Germany
2. Q: Capital of Germany, A: Berlin

### Cloze Deletion Cards

You can create cloze deletion cards using `{c1:text}` syntax:

```markdown
The {c1:mitochondria} is the powerhouse of the cell.
```

This creates a card with "The [...] is the powerhouse of the cell" as the prompt and "mitochondria" as the answer.

Multiple cloze deletions can be created in one card:

```markdown
{c1:Paris} is the capital of {c2:France}.
```

This creates two separate cards, each hiding one part of the sentence. Note that cloze cards do not require the #card tag.

### Spaced Cards

You can create simple prompt cards using `#spaced`:

```markdown
Remember to review chapter 5 #spaced
```

These cards don't have a separate answer field - they're designed to prompt you about something.

## Adding Context with Headings

When "Heading breadcrumbs" (formerly called "Context-aware mode") is enabled in settings, the plugin automatically adds the headings above a card as context:

```markdown
# Biology
## Cell Biology
### Organelles

What is the powerhouse of the cell? #card
Mitochondria
```

This generates a card where the question includes the hierarchical context: "Biology > Cell Biology > Organelles > What is the powerhouse of the cell?"

## Including Media

### Images

You can include images in your cards using standard Markdown syntax:

```markdown
What does the mitochondrion look like? #card
![Mitochondrion](mitochondrion.png)
```

Or using Obsidian's internal linking:

```markdown
What does the mitochondrion look like? #card
![[mitochondrion.png]]
```

The plugin automatically transfers the images to Anki when syncing.

### Audio

You can include audio clips in your cards:

```markdown
How does a cat sound? #card
![[cat_sound.mp3]]
```

The audio file will be included in the card and playable in Anki.

## Code Blocks

You can include code with syntax highlighting:

```markdown
How do you define a function in Python? #card
```python
def function_name(parameters):
    # function body
    return result
```
```

When "Code highlight support" is enabled in settings, the code will be properly highlighted in Anki.

## Math Notation

You can include LaTeX math notation:

```markdown
What is the formula for the area of a circle? #card
$A = \pi r^2$
```

## Tags

You can add Anki tags to your cards:

```markdown
What is photosynthesis? #card #biology #important
The process by which plants convert light energy into chemical energy.
```

The tags `#biology` and `#important` will be added to the Anki card, while `#card` is used to identify the card itself.

## Specifying Deck Names

### YAML Frontmatter

You can specify the deck name for all cards in a file using YAML frontmatter:

```markdown
---
cards-deck: Biology::Cell Biology
---

What is the powerhouse of the cell? #card
Mitochondria
```

### Folder-Based Deck Names

If you enable "Use folder as deck name" in the settings, cards will be organized into decks based on the folder structure:

```
/Biology/Cell Biology/notes.md → Deck name: Biology::Cell Biology
```

## Synchronizing Cards with Anki

After creating your cards, you can sync them with Anki by:

1. Clicking the flashcard icon in the ribbon (left sidebar)
2. Using the command palette (`Ctrl+P` or `Cmd+P`) and searching for "Generate flashcards for the current file"

The plugin will:
- Create new cards in Anki
- Update existing cards if the content has changed
- Add HTML comments with Anki IDs to your notes for card tracking
- Show notifications about the syncing process
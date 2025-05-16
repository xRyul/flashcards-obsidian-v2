# Examples and Templates

This document provides practical examples of different card types and usage patterns to help you get the most out of the Flashcards for Obsidian plugin.

## Basic Question and Answer Cards

### Simple Question/Answer

```markdown
What is the capital of France? #card
Paris
```

### Question with Multiple-Line Answer

```markdown
List the primary colors. #card
- Red
- Blue
- Yellow
```

### Question with Rich Content

```markdown
Describe the structure of a neuron. #card
A neuron consists of:
1. **Cell body (soma)** - contains the nucleus and organelles
2. **Dendrites** - branched extensions that receive signals
3. **Axon** - long projection that conducts electrical impulses
4. **Axon terminals** - end points that release neurotransmitters

![[neuron_diagram.png]]
```

## Inline Cards

### Basic Inline Card

```markdown
Capital of Germany :: Berlin
```

### Inline Card with Reverse

```markdown
Mitochondria ::: Powerhouse of the cell
```

This creates two cards:
1. Front: "Mitochondria", Back: "Powerhouse of the cell"
2. Front: "Powerhouse of the cell", Back: "Mitochondria"

### Multiple Inline Cards in a List

```markdown
- Hydrogen :: Lightest element
- Oxygen :: Element needed for combustion
- Carbon :: Building block of organic compounds
```

## Cloze Deletion Cards

### Simple Cloze

```markdown
The {{c1::mitochondria}} is the powerhouse of the cell. #card
```

### Multiple Cloze Deletions

```markdown
{{c1::Paris}} is the capital of {{c2::France}}. #card
```

This creates two separate cards:
1. "_____ is the capital of France."
2. "Paris is the capital of _____."

### Cloze with Hints

```markdown
The {{c1::heart::organ that pumps blood}} is located in the {{c2::chest::upper body}} cavity. #card
```

## Spaced Cards

### Simple Reminder

```markdown
Review notes on cellular respiration #spaced
```

### Scheduled Review Task

```markdown
Complete practice problems for calculus chapter 5 #spaced
```

## Cards with Context (Show heading path)

```markdown
# Biology
## Cell Biology
### Organelles

What is the function of the Golgi apparatus? #card
The Golgi apparatus packages proteins into vesicles for transport to their destination.
```

This creates a card with:
- Front: "Biology > Cell Biology > Organelles > What is the function of the Golgi apparatus?"
- Back: "The Golgi apparatus packages proteins into vesicles for transport to their destination."

## Cards with Media

### Image Card

```markdown
What does the human heart look like? #card
![[heart_anatomy.jpg]]
```

### Audio Card

```markdown
How does a clarinet sound? #card
![[clarinet_sample.mp3]]
```

### Card with Both Image and Audio

```markdown
What does this bird look like and how does it sound? #card
![[nightingale.jpg]]
![[nightingale_song.mp3]]
```

## Cards with Code

### Code Block

````markdown
How do you define a function in Python? #card
```python
def function_name(parameters):
    # function body
    return result
```
````

### Inline Code

```markdown
What command shows a directory listing in Linux? #card
Use the `ls` command to list files and directories.
```

## Cards with Math Notation

### Inline Math

```markdown
What is the formula for the area of a circle? #card
The area is $A = \pi r^2$, where $r$ is the radius.
```

### Block Math

```markdown
State the quadratic formula. #card
For an equation $ax^2 + bx + c = 0$, the solutions are:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

## Cards with Tags

### Simple Tagging

```markdown
What is photosynthesis? #card #biology #important
The process by which plants convert light energy into chemical energy.
```

### Organizing by Topics

```markdown
Define the term "metaphor". #card #literature #rhetoric #devices
A figure of speech that makes an implicit comparison between two unrelated things.
```

## Practical Examples by Subject

### Language Learning

```markdown
---
cards-deck: Spanish::Vocabulary
---

# Basic Phrases

How do you say "hello" in Spanish? #card
Hola

How do you say "goodbye" in Spanish? #card
Adiós

Complete the sentence: Yo {{c1::hablo}} español. #card

"The book" in Spanish :: El libro
"The house" in Spanish :: La casa
```

### Mathematics

```markdown
---
cards-deck: Math::Calculus
---

# Derivatives

What is the derivative of $e^x$? #card
$\frac{d}{dx}e^x = e^x$

What is the power rule for derivatives? #card
$$\frac{d}{dx}x^n = nx^{n-1}$$

The derivative of {{c1::sin(x)}} is {{c2::cos(x)}}. #card
```

### Programming

````markdown
---
cards-deck: Programming::JavaScript
---

How do you declare a variable in JavaScript? #card
```javascript
// Using let (recommended for variables that will change)
let variableName = value;
// Using const (for constants that won't change)
const constantName = value;
// Using var (older style, function-scoped)
var oldStyleVariable = value;
```

What are JavaScript arrow functions? #card
Arrow functions are a concise syntax for writing function expressions:
```javascript
// Traditional function
function add(a, b) {
  return a + b;
}
// Arrow function
const add = (a, b) => a + b;
```
````

### Medicine

```markdown
---
cards-deck: Medicine::Anatomy
---

# Cardiovascular System

What are the four chambers of the heart? #card
1. Right atrium
2. Right ventricle
3. Left atrium
4. Left ventricle

![[heart_chambers.png]]

Trace the path of blood through the heart. #card
1. Blood enters the **right atrium** from the superior and inferior vena cava
2. Passes through the **tricuspid valve** into the **right ventricle**
3. Pumped through the **pulmonary valve** into the **pulmonary arteries** to the lungs
4. Returns via the **pulmonary veins** to the **left atrium**
5. Passes through the **mitral valve** into the **left ventricle**
6. Exits through the **aortic valve** into the **aorta** to the body
```

## Template Organization Examples

### File Per Topic

Organize your cards by creating separate files for each topic:

```
/Medical School/
  /Anatomy/
    cardiovascular-system.md
    respiratory-system.md
    nervous-system.md
  /Pathology/
    infectious-diseases.md
    autoimmune-disorders.md
```

With folder-based deck naming enabled, cards from "cardiovascular-system.md" will go to the deck "Medical School::Anatomy".

### Card Templates

Create templates for specific types of cards:

```markdown
---
cards-deck: {{deck}}
---

# {{topic}}

## Definitions

What is {{term}}? #card
{{definition}}

## Concepts

Explain the process of {{process}}. #card
{{explanation}}

## Applications

How is {{concept}} applied in {{context}}? #card
{{application}}
```

### Daily Notes with Spaced Cards

Use spaced cards in your daily notes for review reminders:

```markdown
# Daily Note 2023-08-20

## Tasks
- [ ] Complete project proposal
- [ ] Read chapter 7

## Review
Review notes on neural networks #spaced
Review Spanish vocabulary from yesterday #spaced
```

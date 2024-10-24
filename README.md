
# Flashcards-v2

Sync Obsidian notes to Anki.

This is fork of original "[Flashcards](https://github.com/reuseman/flashcards-obsidian)" plugin made by @reuseman which adds suport for Obsidian Frontmatter from v1.4

## Features

🗃️ Simple flashcards with **#card**: ability to add outlines and multilines. 
🎴 Reversed flashcards with **#card-reverse** or **#card/reverse**  
📅 Spaced-only cards with **#card-spaced** or **#card/spaced**  
✍️ Inline style with **Question::Answer**  
✍️ Inline style reversed with **Question:::Answer**  
📃 Cloze with **==Highlight==** or **{Curly brackets}** or  **{2:Cloze}**   
🧠 **Context-aware** mode  
🏷️ Global and local **tags**  

🔢 Support for **LaTeX**  
🖼️ Support for **images**  
🎤 Support for **audios**   
🔗 Support for **Obsidian URI**  
⚓ Support for **reference to note**  
📟 Support for **code syntax highlight**


## How it works?

The following is a demo where the three main operations are shown:

1. **Insertion** of cards;
2. **Update** of cards;
3. **Deletion** of cards.

![Demo image](docs/demo.gif)

## How to use it?

1. Define a hashtag - default is #card
2. Front: To define the front of the card simply add #card at the end
 of the line. 
3. Back: Back will be automatically created until a linebreak

```markdown
# This could be a title

## This is the front #card    
This is the back of the card.

This line will not be part of it, because there is an empty line above.

### This is a normal and reversed card #card-reverse
Which means that two cards will be generated on Anki.

### Also revers #card/reverse
But this time it uses Obsidian hierarchical tags.

### This could be another question #card
But this time without the heading.

## This is another way to define the front
#card 
This style is usefull to avoid the hashtags when referencing in Obsidian

```

### Inline style with ::
```markdown
# This could be a title

All of these works:
My question::My answer
My question:: My answer
My question ::My Answer
My question :: My answer

You can even use it in lists:
- My question:: My answer
```

#### Reverse
To create a reversed card with the inline style just use `:::`.
```markdown
All of these works:
My question:::My answer
My question::: My answer
My question :::My Answer
My question ::: My answer
```

### Cloze
```
This is a way to define a ==cloze== by using the Obsidian highlight syntax in order to avoid making notes dirty.
The alternative is this type of {cloze} that is totally equal to {1:cloze}. With the number you can specify the order {2:later cloze}.
```

### Spaced with #card-spaced hashtag
```markdown
This could be a beautifull quote that you want to see once in a while #card-spaced
```

Optionally, you can consider the `#card/spaced` alternative to use obsidian hierarchical tags.

## Generate cards on Anki
1. In Obsidian, open the file where you have the flashcards
2. Then to insert/update/delete just run inside Obsidian the command `Ctrl+p` and execute the command `Flashcards: generate for the current file`

### Insert
Write the cards and just run the command above. The insertion operation will add cards on Anki. While, in Obsidian it will add an ID to keep track of them.

### Update
Just edit the card in Obsidian, and run the command above.   
**NOTE: Make certain that when you want to update the BROWSE window of Anki is closed.** 
Unfortunately, this is a bug that is not my under control, but it's a problem tied up with the Anki APIs I am using.

### Delete
Delete the content of the card in Obsidian, but without deleting the ID. The plugin will take care of it. So for example
```markdown
## This is the front of the card to delete #card    
This is the back of the card to delete.
^1607361487244
```
This is what you should leave:
```markdown
^1607361487244
```

## Features

### Context-aware mode
To make sense of notes, they should talk about a specific topic, so if you have two headings of level 1 (# heading), probably you should have two notes that talks about those topics. Moreover, the note itself is written with a tree-structure and then connected in a graph way. Based on this hypothesis, the context-aware mode creates the context in the **front** of the card. Where the context the outline of the headings in a tree structure. The demo shows is in action. This helps you out:
- **during review**, because the front will be **unique** and this helps the memory in reaching for the correct answer. If the front is repeated for multiple cards, it's impossible to remember what's in the back, it's pure randomness.
- **during writing**, because you can write following the same structure for different topics, and cards will always be **unique**. So you do not have to think too much about the writing itself.

**Example:**
```markdown
# Computer Science

## Languages #card
Stuff

### OOP #card
Stuff

#### C++ #card
Stuff

#### Java #card
Answer

### Functional
Stuff
```

**Generated card for the Java heading**

- With context-aware mode on 🟢
```
Front: Computer Science > Languages > OOP > Java
Back: Answer
```

- With context-aware mode off 🔴
```
Front: Java
Back: Answer
```

### Deck
To define in which deck in Anki the cards should go, write the name of the deck in the [front matter](https://publish.obsidian.md/help/Advanced+topics/YAML+front+matter). You can even specify sub decks by using two colons, `My Deck Name::Sub deck`. If you want to change the deck after the cards have been generated, just change the deck name.

```markdown
---
cards-deck: My Deck Name
---

## This is the front #card    
This is the back of the card.
```
#### Folder-based deck name
This should be enabled in the settings. `Default: On`. It enables to automatically create cards into a deck that follows the hierarchical paths of where the note is.
For example, if you have a file in the path `food/italian/cavatelli.md`, then the cards will be generated in a deck named `food::italian`.

### Tags
To define the tags that should be used in Anki, there are two approaches.
- Global tags: takes all the tags specified after any line that starts with `tags:`. To hide them in the preview, just put them in the [front matter](https://publish.obsidian.md/help/Advanced+topics/YAML+front+matter) of Obsidian.
- Local tags: takes the tag after the #card tag.

```markdown
---
tags: global-tag1, global-tag2
---

## This is the front #card #my-local-tag
This is the back of the card.
```
Global tags can even be defined in this manner: 
```markdown
tags: global-tag1, #global-tag2, [[global-tag3]]
```

or without the comma:
```markdown
tags: global-tag1 #global-tag2 [[global-tag3]]
```

### Images
To add images, just [embed](https://publish.obsidian.md/help/How+to/Embed+files) them normally.

### Code highlight support
This should be enabled in the settings. `Default: Off`

### Source support
This should be enabled in the settings. `Default: Off`    
Note that whenever enabled, the previous cards created without the source support cannot be updated, unless you switch back. My suggestion is to stick with one mode.

### LaTeX support
Just write your latex code by using the Obsidian syntax:
```md
This is an example
$3+4$
$$50+2$$
```

## Troubleshooting
If you have some problem in the configuration step with Anki, open Anki annd `Tools -> Add-ons -> AnkiConnect -> Config`, paste the following:

    {
        "apiKey": null,
        "apiLogPath": null,
        "webBindAddress": "127.0.0.1",
        "webBindPort": 8765,
        "webCorsOrigin": "http://localhost",
        "webCorsOriginList": [
            "http://localhost",
            "app://obsidian.md"
        ]
    }

## How to install

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin -> Open Obsidian -> CMD+P -> "BRAT: Add a beta plugin for testing" -> Paste thhe URL of this fork `https://github.com/xRyul/flashcards-obsidian-v2` -> OK
2. Open Anki -> Tools > Add-ons -> Get Add-ons... -> Install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) -> Paste the code **2055492159** > Ok
3. Open the settings of the plugin, and while Anki is opened press "**Grant Permission**"

## Thanks

- @reuseman for the initial plugins
- @chaecramb for the fix

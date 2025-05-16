// /services/parser.ts
import { ISettings } from "src/conf/settings";
import * as showdown from "showdown";
import { Regex } from "src/conf/regex";
import { Flashcard } from "../entities/flashcard";
import { Inlinecard } from "src/entities/inlinecard";
import { Spacedcard } from "src/entities/spacedcard";
import { Clozecard } from "src/entities/clozecard";
import { escapeMarkdown } from "src/utils";
import { Card } from "src/entities/card";
import { htmlToMarkdown } from 'obsidian';
import { Heading, SpacedCardFields, ClozeCardFields, BasicCardFields } from "../types/parser";

export class Parser {
  private regex: Regex;
  private settings: ISettings;
  private htmlConverter;

  constructor(regex: Regex, settings: ISettings) {
    this.regex = regex;
    this.settings = settings;
    this.htmlConverter = new showdown.Converter();
    this.htmlConverter.setOption("simplifiedAutoLink", true);
    this.htmlConverter.setOption("tables", true);
    this.htmlConverter.setOption("tasks", true);
    this.htmlConverter.setOption("strikethrough", true);
    this.htmlConverter.setOption("ghCodeBlocks", true);
    this.htmlConverter.setOption("requireSpaceBeforeHeadingText", true);
    this.htmlConverter.setOption("simpleLineBreaks", true);
    // Explicitly enable bold and italic formatting
    this.htmlConverter.setOption("literalMidWordUnderscores", false);
    this.htmlConverter.setOption("literalMidWordAsterisks", false);
    this.htmlConverter.setOption("openLinksInNewWindow", false);
    this.htmlConverter.setOption("parseImgDimensions", true);
    this.htmlConverter.setOption("smartIndentationFix", true);
    // Enable full GitHub Flavored Markdown compatibility
    this.htmlConverter.setFlavor('github');
  }

  public generateFlashcards(
    file: string,
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ): Card[] {
    // Extract and remove frontmatter from processing
    let frontmatter = '';
    let contentWithoutFrontmatter = file;
    
    // Extract frontmatter if it exists
    if (file.startsWith('---')) {
      const secondDashesPos = file.indexOf('\n---', 4);
      if (secondDashesPos !== -1) {
        frontmatter = file.substring(0, secondDashesPos + 4); // Include closing delimiter
        contentWithoutFrontmatter = file.substring(secondDashesPos + 4);
      }
    }
    
    // Preprocess: Remove all HTML comments except <!-- ankiID: ... -->
    contentWithoutFrontmatter = contentWithoutFrontmatter.replace(/<!--(?!\s*ankiID: \d+\s*-->)([\s\S]*?)-->/g, (match) => {
      // Only keep lines that are exact ankiID comments
      const ankiIdPattern = /^<!--\s*ankiID: \d+\s*-->$/m;
      return match.split('\n').filter(line => ankiIdPattern.test(line)).join('\n');
    });
    
    // Reattach frontmatter for proper offset calculations
    file = frontmatter + contentWithoutFrontmatter;
    
    const contextAware = this.settings.contextAwareMode;
    let cards: Card[] = [];
    let headings: Heading[] = [];

    if (contextAware) {
      // https://regex101.com/r/agSp9X/4
      headings = [...file.matchAll(this.regex.headingsRegex)] as unknown as Heading[];
    }

    note = this.substituteObsidianLinks(`[[${note}]]`, vault);
    cards = cards.concat(
      this.generateCardsWithTag(file, headings, deck, vault, note, globalTags)
    );
    cards = cards.concat(
      this.generateInlineCards(file, headings, deck, vault, note, globalTags)
    );
    cards = cards.concat(
      this.generateSpacedCards(file, headings, deck, vault, note, globalTags)
    );
    cards = cards.concat(
      this.generateClozeCards(file, headings, deck, vault, note, globalTags)
    );

    // Filter out cards that are fully inside a code block, a math block or a math inline block
    const codeBlocks = [...file.matchAll(this.regex.obsidianCodeBlock)];
    const mathBlocks = [...file.matchAll(this.regex.mathBlock)];
    const mathInline = [...file.matchAll(this.regex.mathInline)];
    const blocksToFilter = [...codeBlocks, ...mathBlocks, ...mathInline];
    const rangesToDiscard = blocksToFilter.map(x => ([x.index, x.index + x[0].length]))
    cards = cards.filter(card => {
      if (!card) return false; // Add null check
      const cardRange = [card.initialOffset, card.endOffset];
      const isInRangeToDiscard = rangesToDiscard.some(range => {
        return (
          cardRange[0] >= range[0] && cardRange[1] <= range[1]
        );
      });
      return !isInRangeToDiscard;
    });

    cards.sort((a, b) => a.initialOffset - b.endOffset);

    const defaultAnkiTag = this.settings.defaultAnkiTag;
    if (defaultAnkiTag) {
      for (const card of cards) {
        card.tags.push(defaultAnkiTag);
      }
    }

    return cards;
  }

  /**
   * Gives back the ancestor headings of a line.
   * @param headings The list of all the headings available in a file.
   * @param line The line whose ancestors need to be calculated.
   * @param headingLevel The level of the first ancestor heading, i.e. the number of #.
   */
  private getContext(
    headings: Heading[],
    index: number,
    headingLevel: number
  ): string[] {
    const context: string[] = [];
    let currentIndex: number = index;
    let goalLevel = 6;

    let i = headings.length - 1;
    // Get the level of the first heading before the index (i.e. above the current line)
    if (headingLevel !== -1) {
      // This is the case of a #flashcard in a heading
      goalLevel = headingLevel - 1;
    } else {
      // Find first heading and its level
      // This is the case of a #flashcard in a paragraph
      for (i; i >= 0; i--) {
        if (headings[i].index < currentIndex) {
          currentIndex = headings[i].index;
          goalLevel = headings[i][1].length - 1;

          context.unshift(headings[i][2].trim());
          break;
        }
      }
    }

    // Search for the other headings
    for (i; i >= 0; i--) {
      const currentLevel = headings[i][1].length;
      if (currentLevel == goalLevel && headings[i].index < currentIndex) {
        currentIndex = headings[i].index;
        goalLevel = currentLevel - 1;

        context.unshift(headings[i][2].trim());
      }
    }

    return context;
  }

  private generateSpacedCards(
    file: string,
    headings: Heading[],
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ): Spacedcard[] {
    const contextAware = this.settings.contextAwareMode;
    const cards: Spacedcard[] = [];
    const matches = [...file.matchAll(this.regex.cardsSpacedStyle)];
    const lines = file.split('\n');
    const ankiIdRegex = /^<!-- ankiID: (\d+) -->$/;
    
    // Check if a line is a heading (starts with #)
    const isHeading = (line: string): boolean => {
        return /^#{1,6}\s+/.test(line.trim());
    };
    
    // Helper to find the line number for a given character index
    const findLineNumber = (index: number): number => {
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1 for newline
            if (index < charCount) {
                return i;
            }
        }
        return lines.length - 1; // Return last line index if not found earlier
    };

    for (const match of matches) {
      const reversed = false;
      let headingLevel = -1;
      if (match[1]) {
        headingLevel =
          match[1].trim().length !== 0 ? match[1].trim().length : -1;
      }
      // Match.index - 1 because otherwise in the context there will be even match[1], i.e. the question itself
      const context = contextAware
        ? this.getContext(headings, match.index - 1, headingLevel)
        : "";

      const originalPrompt = match[2].trim();
      let prompt = contextAware
        ? [...context, match[2].trim()].join(
          `${this.settings.contextSeparator}`
        )
        : match[2].trim();
      let medias: string[] = this.getImageLinks(prompt);
      medias = medias.concat(this.getAudioLinks(prompt));
      prompt = this.parseLine(prompt, vault);

      const initialOffset = match.index;
      const matchEndOffset = match.index + match[0].length;
      const currentLineIndex = findLineNumber(initialOffset);
      
      // Check if the line following this match is a heading
      let endOffset = matchEndOffset;
      let id: number = -1;
      let inserted: boolean = false;
      
      // Process subsequent lines to find ID or a heading boundary
      if (currentLineIndex < lines.length - 1) {
          const nextLineIndex = currentLineIndex + 1;
          const nextLine = lines[nextLineIndex];
          const nextLineTrimmed = nextLine.trim();
          
          // Check if the next line is an ankiID that's not after a heading
          const potentialIdMatch = nextLineTrimmed.match(ankiIdRegex);
          if (potentialIdMatch && !isHeading(nextLine)) {
              id = Number(potentialIdMatch[1]);
              inserted = true;
              endOffset = matchEndOffset + nextLine.length + 1; // +1 for newline
          }
      }
      
      const tags: string[] = this.parseTags(match[4], globalTags);
      
      // If we don't have an ID from a following line, check the original match
      if (id === -1 && match[5]) {
          id = Number(match[5]);
          inserted = true;
      }
      
      const fields: SpacedCardFields = { Prompt: prompt };
      if (this.settings.sourceSupport) {
        fields["Source"] = note;
      }
      const containsCode = this.containsCode([prompt]);

      const card = new Spacedcard(
        id,
        deck,
        originalPrompt,
        fields,
        reversed,
        initialOffset,
        endOffset,
        tags,
        inserted,
        medias,
        containsCode
      );
      cards.push(card);
    }

    return cards;
  }

  private generateClozeCards(
    file: string,
    headings: Heading[],
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ): Clozecard[] {
    const contextAware = this.settings.contextAwareMode;
    const cards: Clozecard[] = [];
    const matches = [...file.matchAll(this.regex.cardsClozeWholeLine)];
    const lines = file.split('\n');
    const ankiIdRegex = /^<!-- ankiID: (\d+) -->$/;

    const mathBlocks = [...file.matchAll(this.regex.mathBlock)];
    const mathInline = [...file.matchAll(this.regex.mathInline)];
    const blocksToFilter = [...mathBlocks, ...mathInline];
    const rangesToDiscard = blocksToFilter.map(x => ([x.index, x.index + x[0].length]))
    
    // Check if a line is a heading (starts with #)
    const isHeading = (line: string): boolean => {
        return /^#{1,6}\s+/.test(line.trim());
    };
    
    // Helper to find the line number for a given character index
    const findLineNumber = (index: number): number => {
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1 for newline
            if (index < charCount) {
                return i;
            }
        }
        return lines.length - 1; // Return last line index if not found earlier
    };

    for (const match of matches) {
      const reversed = false;
      let headingLevel = -1;
      if (match[1]) {
        headingLevel =
          match[1].trim().length !== 0 ? match[1].trim().length : -1;
      }
      // Match.index - 1 because otherwise in the context there will be even match[1], i.e. the question itself
      const context = contextAware
        ? this.getContext(headings, match.index - 1, headingLevel)
        : "";

      // If all the curly clozes are inside a math block, then do not create the card
      const curlyClozes = match[2].matchAll(this.regex.singleClozeCurly);
      const matchIndex = match.index;
      // Identify curly clozes, drop all the ones that are in math blocks i.e. ($\frac{1}{12}$) and substitute the others with Anki syntax
      let clozeText = match[2].replace(this.regex.singleClozeCurly, (match, g1, g2, g3, offset) => {
        const globalOffset = matchIndex + offset;
        const isInMathBlock = rangesToDiscard.some(x => (globalOffset >= x[0] && globalOffset + match[0].length <= x[1]));
        if (isInMathBlock) {
          return match;
        } else {
          if (g2) {
            return `{{c${g2}::${g3}}}`;
          } else {
            return `{{c1::${g3}}}`;
          }
        }
      });

      // Replace the highlight clozes in the line with Anki syntax
      clozeText = clozeText.replace(this.regex.singleClozeHighlight, "{{c1::$2}}");

      if (clozeText === match[2]) {
        // If the clozeText is the same as the match it means that the curly clozes were all in math blocks
        continue;
      }

      const originalLine = match[2].trim();
      // Add context
      clozeText = contextAware
        ? [...context, clozeText.trim()].join(
          `${this.settings.contextSeparator}`
        )
        : clozeText.trim();
      let medias: string[] = this.getImageLinks(clozeText);
      medias = medias.concat(this.getAudioLinks(clozeText));
      clozeText = this.parseLine(clozeText, vault);

      const initialOffset = match.index;
      const matchEndOffset = match.index + match[0].length;
      const currentLineIndex = findLineNumber(initialOffset);
      
      // Check if the line following this match is a heading
      let endOffset = matchEndOffset;
      let id: number = -1;
      let inserted: boolean = false;
      
      // Process subsequent lines to find ID or a heading boundary
      if (currentLineIndex < lines.length - 1) {
          const nextLineIndex = currentLineIndex + 1;
          const nextLine = lines[nextLineIndex];
          const nextLineTrimmed = nextLine.trim();
          
          // Check if the next line is an ankiID that's not after a heading
          const potentialIdMatch = nextLineTrimmed.match(ankiIdRegex);
          if (potentialIdMatch && !isHeading(nextLine)) {
              id = Number(potentialIdMatch[1]);
              inserted = true;
              endOffset = matchEndOffset + nextLine.length + 1; // +1 for newline
          }
      }
      
      const tags: string[] = this.parseTags(match[4], globalTags);
      
      // If we don't have an ID from a following line, check the original match
      if (id === -1 && match[5]) {
          id = Number(match[5]);
          inserted = true;
      }
      
      const fields: ClozeCardFields = { Text: clozeText, Extra: "" };
      if (this.settings.sourceSupport) {
        fields["Source"] = note;
      }
      const containsCode = this.containsCode([clozeText]);

      const card = new Clozecard(
        id,
        deck,
        originalLine,
        fields,
        reversed,
        initialOffset,
        endOffset,
        tags,
        inserted,
        medias,
        containsCode
      );
      cards.push(card);
    }

    return cards;
  }

  private generateInlineCards(
    file: string,
    headings: Heading[],
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ): Inlinecard[] {
    const contextAware = this.settings.contextAwareMode;
    const cards: Inlinecard[] = [];
    // Use the existing regex, the multi-line logic will handle finding the ID correctly.
    const inlineCardRegex = this.regex.cardsInlineStyle; // e.g., /^(.*?) ?(::|:::)(.*?) ?(?:<!-- ankiID: (\d+) -->)?$/gm
    const lines = file.split('\n');
    const ankiIdRegex = /^<!-- ankiID: (\d+) -->$/;
    // Regexes to detect the start of any card type (used to terminate answer collection)
    const cardStartRegexes = [
        this.regex.flashscardsWithTag,      // Matches start of #card line
        this.regex.cardsInlineStyle,      // Matches start of :: card line
        this.regex.cardsClozeWholeLine,   // Matches start of cloze line
        this.regex.cardsSpacedStyle       // Matches start of #card-spaced line
    ];

    // Helper to find the line number for a given character index
    const findLineNumber = (index: number): number => {
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1 for newline
            if (index < charCount) {
                return i;
            }
        }
        return lines.length - 1; // Return last line index if not found earlier
    };

    // Check if the match is within frontmatter
    const isFrontmatter = (index: number): boolean => {
        // If file doesn't have frontmatter, return false
        if (!file.startsWith('---')) return false;
        
        // Find the closing frontmatter delimiter
        const secondDashesPos = file.indexOf('\n---', 4);
        if (secondDashesPos === -1) return false; // No closing frontmatter
        
        // Add the length of the closing delimiter to get the end of frontmatter
        const frontmatterEndPos = secondDashesPos + 4; // Length of \n---
        
        // Check if the index falls within the frontmatter (including the delimiters)
        return index >= 0 && index <= frontmatterEndPos;
    };

    // Check if a line contains a block ID (^blockid)
    const hasBlockId = (line: string): boolean => {
        return /\^[\w\d-]+$/.test(line.trim());
    };

    // Check if a line is a heading (starts with #)
    const isHeading = (line: string): boolean => {
        return /^#{1,6}\s+/.test(line.trim());
    };

    const matches = [...file.matchAll(inlineCardRegex)];

    matches.forEach((match, matchIndex) => {
      // Skip if within frontmatter
      if (isFrontmatter(match.index)) {
        return;
      }
      
      // Check for metadata lines like cards-deck: or tags:
      // Use group 1 (potential heading/prefix) or group 2 (potential content) for the check
      const potentialMetadata = (match[1]?.trim() || "") + (match[2]?.trim() || "");
      if (potentialMetadata.toLowerCase().startsWith("cards-deck:") ||
          potentialMetadata.toLowerCase().startsWith("tags:") ||
          // Additional frontmatter-like keys to exclude
          /^[a-zA-Z0-9_-]+:/.test(potentialMetadata)) { // Match any YAML frontmatter-style key
        return; // Skip metadata lines that might resemble inline cards
      }

      const initialOffset = match.index;
      const matchedLineContent = match[0]; // The entire first line matched
      const matchEndOffsetInitial = initialOffset + matchedLineContent.length;

      // Group 3 determines reversed
      const reversed: boolean = match[3] === this.settings.inlineSeparatorReverse;
      let headingLevel = -1;
      // Group 1 contains optional heading markers, useful for context but not the question itself
      if (match[1] && match[1].trim().length > 0) {
          const headingMatch = match[1].match(/^(#+)\s*/);
          if (headingMatch) {
            headingLevel = headingMatch[1].length;
          }
      }
      const context = contextAware
        ? this.getContext(headings, initialOffset > 0 ? initialOffset -1 : 0, headingLevel)
        : "";

      // Group 2 is the question part
      let originalQuestion = match[2] ? match[2].trim() : '';
      // Group 4 is the first line of the answer
      let answerFirstLine = match[4] ? match[4].trim() : '';

      // Check if the answer line contains a block ID and skip if it does
      if (hasBlockId(answerFirstLine)) {
        // Don't process this as a card if it's just a block ID reference
        return;
      }

      // --> FIX: Remove leading Markdown list markers from the correctly identified question <--
      const listMarkerMatch = originalQuestion.match(/^([-*+]\s+)/);
      if (listMarkerMatch) {
          originalQuestion = originalQuestion.substring(listMarkerMatch[0].length);
      }
      // --> END FIX <--

      // Start with global tags
      const tags: string[] = [...globalTags];
      // Add local tags if present after the answer on the first line (Need regex update?)
      // Example: Question::Answer #tag1 #tag2
      // Current regex likely includes tags in group 3. We should parse them out.
      // TODO: Refine tag parsing for inline cards if they can appear on the first line.

      let question = contextAware
        ? [...context, originalQuestion].join(this.settings.contextSeparator)
        : originalQuestion;

      // --- Programmatically find additional Answer lines and ID ---
      let answerLines: string[] = [answerFirstLine];
      let id: number = -1;
      let inserted: boolean = false;
      let currentLineIndex = findLineNumber(initialOffset);
      let endOffset = matchEndOffsetInitial; // Initialize with end of the first line

      // Calculate the start offset of the line *following* the initial match
      let nextLineStartOffset = 0;
      for(let j=0; j <= currentLineIndex; j++) {
          nextLineStartOffset += lines[j].length + 1; // +1 for newline
      }
      let currentLineStartOffset = nextLineStartOffset;

      if (currentLineIndex < lines.length - 1) { // Only loop if there are subsequent lines
          for (let i = currentLineIndex + 1; i < lines.length; i++) {
              const currentLine = lines[i];
              const currentLineTrimmed = currentLine.trim();

              // Skip block ID lines (^someid) as answer content
              if (hasBlockId(currentLineTrimmed)) {
                  // End the card collection before the block ID
                  break;
              }

              // Check if the current line is a heading
              const currentLineIsHeading = isHeading(currentLineTrimmed);

              const potentialIdMatch = currentLineTrimmed.match(ankiIdRegex);

              // Check if the current line starts *any* kind of card definition
              let isNextCardStart = false;
              if (currentLineTrimmed !== '') {
                isNextCardStart = cardStartRegexes.some(regex => {
                    // --- Updated Logic --- 
                    // Reset lastIndex for global regexes before exec
                    regex.lastIndex = 0; 
                    // Execute the regex starting from the current line's offset
                    const potentialCardMatch = regex.exec(file.substring(currentLineStartOffset));
                    // Check if a match occurred AND it starts exactly at the beginning (index 0)
                    return potentialCardMatch !== null && potentialCardMatch.index === 0;
                    // --- End Updated Logic ---
                });
              }

              if (potentialIdMatch) {
                  // Only consider this ID as part of the card if it doesn't follow a heading
                  if (!currentLineIsHeading) {
                      // Found an ID block. Assume it terminates the card content.
                      id = Number(potentialIdMatch[1]);
                      inserted = true;
                      endOffset = currentLineStartOffset + currentLine.length; // Include ID line offset
                  }
                  break; // Stop collecting answer
              } else if (currentLineIsHeading || isNextCardStart || currentLineTrimmed === '') {
                   // Found a heading, the start of the next card, or an empty line, stop collecting answer.
                  break;
              } else if (i > 0 && answerLines.length > 0 && answerLines[answerLines.length - 1].trim().endsWith('$')) {
                  // If the previous line ends with a dollar sign (end of math), and this is not the first line,
                  // stop collecting if the current line looks like new content (not a continuation of math)
                  if (!currentLine.trim().startsWith('$') && !currentLineTrimmed.includes('::')) {
                      break;
                  }
              } else {
                  // This line is part of the answer
                  answerLines.push(currentLine); // Keep original spacing/indentation
                  endOffset = currentLineStartOffset + currentLine.length; // Extend end offset to include this line
              }
              // Update offset for the start of the *next* line for the next iteration
              currentLineStartOffset += currentLine.length + 1;
          }
      }

      // Join lines, keeping original newlines, then trim start/end whitespace
      let answer = answerLines.join('\n').trim();
      // --- End Answer/ID Finding ---

      // Process question/answer links, media, markdown, etc.
      let medias: string[] = this.getImageLinks(question);
      medias = medias.concat(this.getImageLinks(answer));
      medias = medias.concat(this.getAudioLinks(answer));

      // Handle embeds before final parsing
       try {
           const embedMap = this.getEmbedMap();
           // Apply embed substitution to the multi-line answer string
           answer = this.getEmbedWrapContent(embedMap, answer);
        } catch (e) {
            // Ignore errors in test environment if document isn't fully mocked
            if (process.env.NODE_ENV !== 'test') {
                console.error("Error processing embeds: ", e)
            }
        }

      // Remove Debug Logs
      // console.log("Inline Card - Before parseLine - Question:", JSON.stringify(question));
      // console.log("Inline Card - Before parseLine - Answer:", JSON.stringify(answer));
      question = this.parseLine(question, vault);
      answer = this.parseLine(answer, vault);
      // console.log("Inline Card - After parseLine - Question:", JSON.stringify(question));
      // console.log("Inline Card - After parseLine - Answer:", JSON.stringify(answer));

      // Ensure we captured a question and answer after processing
      if (!question || !answer) {
          console.warn("Skipping inline card due to missing question or answer:", matchedLineContent);
          return; // Skip this iteration
      }

      const fields: BasicCardFields = { Front: question, Back: answer };
      if (this.settings.sourceSupport) {
        fields["Source"] = note; // Use normal quotes
      }
      const containsCode = this.containsCode([question, answer]);

      const card = new Inlinecard(
        id,
        deck,
        originalQuestion, // Keep original question for reference
        fields,
        reversed,
        initialOffset,
        endOffset, // Use the calculated end offset including subsequent lines/ID
        tags, // Use collected tags (currently only global)
        inserted,
        medias,
        containsCode
      );
      cards.push(card);
    }); // End of matches.forEach

    return cards;
  }

  // Refactored generateCardsWithTag
  private generateCardsWithTag(
    file: string,
    headings: Heading[],
    deck: string,
    vault: string,
    note: string,
    globalTags: string[] = []
  ): Flashcard[] {
    const contextAware = this.settings.contextAwareMode;
    const cards: Flashcard[] = [];
    // Use the simplified regex that matches only the start line
    const matches = [...file.matchAll(this.regex.flashscardsWithTag)];
    const lines = file.split('\n');
    const ankiIdRegex = /^<!-- ankiID: (\d+) -->$/;

    // Helper to find the line number for a given character index
    const findLineNumber = (index: number): number => {
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1 for newline
            if (index < charCount) {
                return i;
            }
        }
        return -1; // Should not happen if index is valid
    };

    matches.forEach((match, matchIndex) => {
        const initialOffset = match.index;
        const matchedLine = match[0];
        const matchEndOffset = initialOffset + matchedLine.length;

        // Determine if reversed based on #card-reverse or #card/reverse tag
        const reversed: boolean =
            match[3].trim().toLowerCase() ===
            `#${this.settings.flashcardsTag}-reverse` ||
            match[3].trim().toLowerCase() ===
            `#${this.settings.flashcardsTag}/reverse`;

        // Determine heading level (group 1)
        const headingLevel = match[1].trim().length !== 0 ? match[1].length : -1;

        // Get context if needed
        const context = contextAware
            ? this.getContext(headings, initialOffset - 1, headingLevel) // Use index-1 for context
            : "";

        // Extract front content (group 2)
        const originalQuestion = match[2].trim();
        let question = contextAware
            ? [...context, originalQuestion].join(this.settings.contextSeparator)
            : originalQuestion;

        // Extract tags following #card (group 4)
        const tags: string[] = this.parseTags(match[4], globalTags);

        // --- Programmatically find Answer and ID ---
        let answerLines: string[] = [];
        let id: number = -1;
        let inserted: boolean = false;
        let currentLineIndex = findLineNumber(initialOffset);
        let endOffset = matchEndOffset; // Start end offset at end of matched line
        let currentSearchOffset = matchEndOffset + 1; // Start search *after* the matched line
        
        // Check if the card is in a callout block by looking at the start of the matched line
        const isCallout = matchedLine.trim().startsWith('>') && matchedLine.includes('[!');

        if (currentLineIndex !== -1) {
            let isInsideCallout = isCallout;
            let calloutIndentation = '';
            
            // If this is a callout, capture its indentation pattern
            if (isCallout) {
                const match = matchedLine.match(/^(\s*>[\s>]*)/);
                if (match) {
                    calloutIndentation = match[1];
                }
            }
            
            for (let i = currentLineIndex + 1; i < lines.length; i++) {
                const currentLine = lines[i];
                const currentLineTrimmed = currentLine.trim();
                const currentLineStartOffset = file.indexOf(currentLine, currentSearchOffset - currentLine.length -1);
                const potentialIdMatch = currentLineTrimmed.match(ankiIdRegex);
                
                // Check if the current line is a heading (starts with #)
                const isHeading = /^#{1,6}\s+/.test(currentLineTrimmed);
                
                // If we're inside a callout, check if the current line is still part of it
                if (isInsideCallout) {
                    // If line doesn't start with '>' pattern, we're leaving the callout
                    if (!currentLine.startsWith(calloutIndentation) && currentLine.trim() !== '') {
                        isInsideCallout = false;
                    }
                }

                // Check if the current line is the start of the *next* #card match
                const isNextCardStart = matches.some((nextMatch, nextMatchIdx) =>
                    nextMatchIdx > matchIndex && nextMatch.index === currentLineStartOffset
                );

                if (potentialIdMatch) {
                    // Only consider this ID as part of the card if it doesn't follow a heading
                    if (!isHeading) {
                        // Found an ID block immediately following the answer.
                        id = Number(potentialIdMatch[1]);
                        inserted = true;
                        endOffset = currentLineStartOffset + currentLine.length; // Include ID line
                    }
                    break; // Stop collecting answer
                } else if (isHeading || isNextCardStart || (currentLine.trim() === '' && !isInsideCallout)) {
                     // Found a heading, the start of the next card, or an empty line (not in callout), stop collecting answer.
                    // End offset remains the end of the *previous* line.
                    break;
                } else {
                    // This line is part of the answer
                    answerLines.push(currentLine);
                    endOffset = currentLineStartOffset + currentLine.length; // Extend end offset
                    currentSearchOffset = endOffset + 1;
                }
            }
        }

        let answer = answerLines.join('\n').trim();
        // --- End Answer/ID Finding ---

        // Process question/answer for links, media, markdown, etc.
        let medias: string[] = this.getImageLinks(question);
        medias = medias.concat(this.getImageLinks(answer));
        medias = medias.concat(this.getAudioLinks(answer));

        // Handle embeds (ensure getEmbedMap doesn't break tests)
        try {
           const embedMap = this.getEmbedMap();
           answer = this.getEmbedWrapContent(embedMap, answer);
        } catch (e) {
            // Ignore errors from getEmbedMap in test environment if document isn't fully mocked
            if (process.env.NODE_ENV !== 'test') {
                console.error("Error processing embeds: ", e)
            }
        }

        // For callouts, ensure we preserve the callout syntax properly
        if (isCallout) {
            // Make sure not to modify the original callout syntax during parsing
            question = this.parseLine(question, vault, true);
            answer = this.parseLine(answer, vault, true);
        } else {
            question = this.parseLine(question, vault);
            answer = this.parseLine(answer, vault);
        }

        // Create the card object
        const fields: BasicCardFields = { Front: question, Back: answer };
        if (this.settings.sourceSupport) {
            fields["Source"] = note;
        }
        const containsCode = this.containsCode([question, answer]);

        const card = new Flashcard(
            id,         // Found ID or -1
            deck,
            originalQuestion,
            fields,
            reversed,
            initialOffset, // Start of the first line (#card line)
            endOffset,     // End of the last answer line OR the ID line
            tags,
            inserted,    // True if ID was found
            medias,
            containsCode
        );
        cards.push(card);
    });

    return cards;
  }

  public containsCode(str: string[]): boolean {
    for (const s of str) {
      if (s.match(this.regex.codeBlock)) {
        return true;
      }
    }
    return false;
  }

  public getCardsToDelete(file: string): number[] {
    // Find block IDs with no content above it
    // This likely needs updating if it relies on the old regex/logic
    // Assuming it's handled by the newer delete commands now.
    return [...file.matchAll(this.regex.cardsToDelete)].map((match) => {
      return Number(match[1]);
    });
  }

  private parseLine(str: string, vaultName: string, isCallout: boolean = false) {
    // Step 1: Substitute images and audio links first
    let processedStr = this.substituteImageLinks(this.substituteAudioLinks(str));

    // Step 2: Substitute obsidian links and math
    processedStr = this.mathToAnki(
        this.substituteObsidianLinks(processedStr, vaultName)
    );

    // For callouts, we need to preserve the structure
    if (isCallout) {
      // For callouts, we need to clean up the callout formatting but preserve the content structure
      // First, replace the callout indicators with proper HTML
      
      // Process each line of the callout
      const lines = processedStr.split('\n');
      let processedLines = [];
      
      for (let line of lines) {
        // Remove the > callout indicators but preserve indentation
        let calloutMatch = line.match(/^(\s*)>+\s*(.*)$/);
        if (calloutMatch) {
          // Extract content from the line, preserving any remaining markdown
          const [_, indentation, content] = calloutMatch;
          
          // Check if this is the callout header line
          const titleMatch = content.match(/^\[!(\w+)\]\s*(?:-|\+)?\s*(.*)$/);
          if (titleMatch) {
            // This is a callout header line, extract the type and content
            const [__, calloutType, calloutContent] = titleMatch;
            processedLines.push(`<div class="callout ${calloutType.toLowerCase()}"><strong>${calloutContent || calloutType}</strong></div>`);
          } else if (content.trim()) {
            // Regular content line - first convert Markdown formatting
            // Handle bold and italic formatting
            let formattedContent = content
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold with **
              .replace(/__(.*?)__/g, '<strong>$1</strong>')     // Bold with __
              .replace(/\*(.*?)\*/g, '<em>$1</em>')             // Italic with *
              .replace(/_(.*?)_/g, '<em>$1</em>');              // Italic with _
              
            // Then handle lists
            if (formattedContent.match(/^[-*+]\s+/)) {
              // This is a list item
              formattedContent = `<ul><li>${formattedContent.replace(/^[-*+]\s+/, '')}</li></ul>`;
            } else if (formattedContent.match(/^\d+\.\s+/)) {
              // This is a numbered list item
              formattedContent = `<ol><li>${formattedContent.replace(/^\d+\.\s+/, '')}</li></ol>`;
            } else {
              // Regular line
              formattedContent = `<p>${formattedContent}</p>`;
            }
            
            processedLines.push(formattedContent);
          } else {
            // Empty line
            processedLines.push('<br>');
          }
        } else {
          // Not a callout line, preserve as-is
          processedLines.push(line);
        }
      }
      
      return processedLines.join('\n');
    }

    // Preserve list formatting by adding explicit newlines between items
    // This helps showdown converter properly recognize the items
    processedStr = processedStr.replace(/^(\s*[-*+]|\s*\d+\.)\s+/gm, function(match) {
      // Ensure there's a newline before each list item that isn't at the beginning
      if (processedStr.indexOf(match) > 0) {
        return '\n' + match;
      }
      return match;
    });

    // Step 3: Convert remaining Markdown to HTML using showdown
    let html = this.htmlConverter.makeHtml(processedStr);

    // Step 4: Clean up any duplicate image tags that might still be present
    try {
      // Skip DOM manipulation in test environment or if document is not available
      if (process.env.NODE_ENV === 'test' || typeof document === 'undefined') {
        throw new Error('DOM not available in test environment');
      }
      
      // Use DOMParser to parse HTML string into a document
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
      
      // Use type assertion to treat the container as an HTMLElement
      const container = doc.body.firstChild as HTMLElement;
      
      if (!container) {
        throw new Error('Parsing failed');
      }
      
      // Find and remove any duplicate internal-embed divs that follow image tags
      const embeds = Array.from(container.querySelectorAll('div.internal-embed'));
      embeds.forEach(embed => {
        // Check if preceded by an img tag
        const prevElement = embed.previousElementSibling;
        if (prevElement && prevElement.tagName === 'IMG') {
          // Check if image src matches the embed data-src
          const imgSrc = prevElement.getAttribute('src');
          const embedSrc = embed.getAttribute('data-src');
          
          if (imgSrc && embedSrc && imgSrc.includes(embedSrc)) {
            // This is a duplicate, remove the div.internal-embed
            embed.parentNode?.removeChild(embed);
          }
        }
      });
      
      // Get the cleaned HTML back
      html = container.innerHTML;
      
    } catch (e) {
      // In test environment or if parsing fails, continue with original HTML
      console.debug('DOM manipulation skipped or failed:', e);
    }

    return html;
  }

  private getImageLinks(str: string) {
    const wikiMatches = str.matchAll(this.regex.wikiImageLinks);
    const markdownMatches = str.matchAll(this.regex.markdownImageLinks);
    const links: string[] = [];

    for (const wikiMatch of wikiMatches) {
      links.push(wikiMatch[1]);
    }

    for (const markdownMatch of markdownMatches) {
      links.push(decodeURIComponent(markdownMatch[1]));
    }

    return links;
  }

  private getAudioLinks(str: string) {
    const wikiMatches = str.matchAll(this.regex.wikiAudioLinks);
    const links: string[] = [];

    for (const wikiMatch of wikiMatches) {
      links.push(wikiMatch[1]);
    }

    return links;
  }

  private substituteObsidianLinks(str: string, vaultName: string) {
    const linkRegex = /\[\[(.+?)(?:\|(.+?))?\]\]/gim;
    vaultName = encodeURIComponent(vaultName);

    return str.replace(linkRegex, (match, filename, rename) => {
      const href = `obsidian://open?vault=${vaultName}&file=${encodeURIComponent(
        filename
      )}.md`;
      const fileRename = rename ? rename : filename;
      
      try {
        // Skip DOM manipulation in test environment or if document is not available
        if (process.env.NODE_ENV === 'test' || typeof document === 'undefined') {
          return `<a href="${href}">${fileRename}</a>`;
        }
        
        // Create the anchor element
        const anchorEl = document.createElement('a');
        anchorEl.href = href;
        anchorEl.textContent = fileRename;
        
        // Use XMLSerializer instead of outerHTML
        const serializer = new XMLSerializer();
        return serializer.serializeToString(anchorEl);
      } catch (e) {
        // Fallback for test environment
        return `<a href="${href}">${fileRename}</a>`;
      }
    });
  }

  private substituteImageLinks(str: string): string {
    // Wiki links
    str = str.replace(this.regex.wikiImageLinks, (match, filename, width, height) => {
        try {
          // Skip DOM manipulation in test environment or if document is not available
          if (process.env.NODE_ENV === 'test' || typeof document === 'undefined') {
            let attrs = `src='${filename}'`;
            if (width) attrs += ` width='${width}'`;
            if (height) attrs += ` height='${height}'`;
            return `<img ${attrs}>`;
          }
          
          // Create the attributes string directly to avoid issues with namespace
          let attrs = `src="${filename}"`;
          if (width) attrs += ` width="${width}"`;
          if (height) attrs += ` height="${height}"`;
          
          // Return a properly formatted HTML img tag without using DOM APIs
          // This avoids the xmlns attribute that causes duplicate image issues
          return `<img ${attrs}>`;
        } catch (e) {
          // Fallback for test environment
          let attrs = `src='${filename}'`;
          if (width) attrs += ` width='${width}'`;
          if (height) attrs += ` height='${height}'`;
          return `<img ${attrs}>`;
        }
    });

    // Markdown links
    str = str.replace(this.regex.markdownImageLinks, (match, filepath, width, height) => {
        try {
          // Skip DOM manipulation in test environment or if document is not available
          if (process.env.NODE_ENV === 'test' || typeof document === 'undefined') {
            let attrs = `src='${decodeURIComponent(filepath)}'`;
            if (width) attrs += ` width='${width}'`;
            if (height) attrs += ` height='${height}'`;
            return `<img ${attrs}>`;
          }
          
          // Create the attributes string directly to avoid issues with namespace
          let attrs = `src="${decodeURIComponent(filepath)}"`;
          if (width) attrs += ` width="${width}"`;
          if (height) attrs += ` height="${height}"`;
          
          // Return a properly formatted HTML img tag without using DOM APIs
          // This avoids the xmlns attribute that causes duplicate image issues
          return `<img ${attrs}>`;
        } catch (e) {
          // Fallback for test environment
          let attrs = `src='${decodeURIComponent(filepath)}'`;
          if (width) attrs += ` width='${width}'`;
          if (height) attrs += ` height='${height}'`;
          return `<img ${attrs}>`;
        }
    });

    return str;
  }

  private substituteAudioLinks(str: string): string {
    return str.replace(this.regex.wikiAudioLinks, "[sound:$1]");
  }

  private mathToAnki(str: string) {
    // Replace block math with Anki-specific MathJax tags
    str = str.replace(this.regex.mathBlock, function (match, p1, p2) {
      // Only escape angle brackets for HTML safety, leave LaTeX intact
      const safeLatex = p2
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Ensure LaTeX commands use single backslashes (not doubled)
        .replace(/\\\\([a-zA-Z]+)/g, '\\$1');
      
      // Use <anki-mathjax> tags instead of MathJax delimiters
      return "<anki-mathjax>" + safeLatex + "</anki-mathjax>";
    });

    // Replace inline math with Anki-specific MathJax tags
    str = str.replace(this.regex.mathInline, function (match, p1, p2) {
      // Only escape angle brackets for HTML safety, leave LaTeX intact
      const safeLatex = p2
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Ensure LaTeX commands use single backslashes (not doubled)
        .replace(/\\\\([a-zA-Z]+)/g, '\\$1');
      
      // Use <anki-mathjax> tags instead of MathJax delimiters
      return "<anki-mathjax>" + safeLatex + "</anki-mathjax>";
    });

    return str;
  }

  private parseTags(str: string, globalTags: string[]): string[] {
    const tags: string[] = [...globalTags];

    if (str) {
      for (const tag of str.split("#")) {
        let newTag = tag.trim();
        if (newTag) {
          // Replace obsidian hierarchy tags delimeter \ with anki delimeter ::
          newTag = newTag.replace(this.regex.tagHierarchy, "::");
          tags.push(newTag);
        }
      }
    }

    return tags;
  }

  public getAnkiIDsBlocks(file: string): RegExpMatchArray[] {
    // This regex specifically finds the HTML comment lines
    return Array.from(file.matchAll(/^<!-- ankiID: (\d+) -->$/gm));
  }

  // This function relies on the DOM, which isn't available in Node test env.
  // Keep it wrapped in try/catch for tests.
  private getEmbedMap(): Map<string, string> {
    const embedMap = new Map<string, string>();
    try {
        if (process.env.NODE_ENV === 'test' || typeof document === 'undefined') {
            // Return an empty map in test environment
            return embedMap;
        }
        
        const embedList = Array.from(document.documentElement.getElementsByClassName('internal-embed'));
        embedList.forEach((el) => {
            const embedKey = el.getAttribute("src");
            if (embedKey) {
                // Use Obsidian's helper methods or DOM API to safely extract content
                // without relying directly on innerHTML
                let embedMarkdown = "";
                
                // If the element has child nodes, process them safely
                if (el.hasChildNodes()) {
                    // Create a serializer to convert DOM to string without innerHTML
                    const serializer = new XMLSerializer();
                    // Serialize the content
                    const contentStr = Array.from(el.childNodes)
                        .map(node => serializer.serializeToString(node))
                        .join('');
                    
                    // Use Obsidian's htmlToMarkdown function which handles
                    // the conversion from DOM to Markdown safely
                    embedMarkdown = htmlToMarkdown(contentStr);
                }
                
                embedMap.set(embedKey, embedMarkdown);
            }
        });
    } catch (e) {
        if (process.env.NODE_ENV !== 'test') {
            console.error("Error accessing document in getEmbedMap: ", e);
        }
        // Return empty map if document is not available
    }
    return embedMap;
  }

  // This function relies on the DOM via getEmbedMap
  private getEmbedWrapContent(embedMap: Map<any, any>, embedContent: string): string {
    // If embedMap is empty (e.g., in tests), return content unchanged
    if (embedMap.size === 0) {
        return embedContent;
    }
    let processedContent = embedContent;
    // Use regex exec loop correctly
    let result;
    while ((result = this.regex.embedBlock.exec(embedContent)) !== null) {
      const embedKey = result[1];
      const mappedContent = embedMap.get(embedKey);
      if (mappedContent) {
          // Simple concatenation might not be ideal; depends on desired output.
          // Replacing the placeholder might be better if placeholders were used.
          // For now, just append.
          processedContent = processedContent.concat('\n', mappedContent); // Add newline separator
      }
    }
    // Reset regex lastIndex after loop if necessary for other uses
    this.regex.embedBlock.lastIndex = 0;
    return processedContent;
  }
}

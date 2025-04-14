import { addIcon, Notice, Plugin, TFile, Editor } from 'obsidian';
import { ISettings } from 'src/conf/settings';
import { SettingsTab } from 'src/gui/settings-tab';
import { CardsService } from 'src/services/cards';
import { Anki } from 'src/services/anki';
import { noticeTimeout, flashcardsIcon } from 'src/conf/constants';

export default class ObsidianFlashcard extends Plugin {
	private settings: ISettings
	private cardsService: CardsService

	async onload() {
		addIcon("flashcards", flashcardsIcon)

		// TODO test when file did not insert flashcards, but one of them is in Anki already
		const anki = new Anki()
		this.settings = await this.loadData() || this.getDefaultSettings()
		this.cardsService = new CardsService(this.app, this.settings)

		const statusBar = this.addStatusBarItem()

		this.addCommand({
			id: 'generate-flashcard-current-file',
			name: 'Generate for the current file',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile()
				if (activeFile) {
					if (!checking) {
						this.generateCards(activeFile)
					}
					return true;
				}
				return false;
			}
		});

		this.addCommand({
			id: 'delete-flashcard-anki-only',
			name: 'Delete selected card(s) from Anki only',
			editorCallback: async (editor: Editor, view) => {
				if (!editor.somethingSelected()) {
					new Notice("Please select the text containing the Anki card ID(s) you want to delete.");
					return;
				}

				const selection = editor.getSelection();
				const ankiIdsToDelete: number[] = [];

				const idRegex = /(?:^%%anki ID: (\d+)%%$|^\^(\d+)$)/gm;
				let match;

				while ((match = idRegex.exec(selection)) !== null) {
					const idString = match[1] || match[2];
					if (idString) {
						ankiIdsToDelete.push(parseInt(idString, 10));
					}
				}

				if (ankiIdsToDelete.length === 0) {
					new Notice("No Anki card IDs found in the current selection.", noticeTimeout);
					return;
				}

				try {
					new Notice(`Attempting to delete ${ankiIdsToDelete.length} Anki card(s): [${ankiIdsToDelete.join(', ')}]...`);
					const deletedFromAnki = await this.cardsService.deleteCardsFromAnkiOnly(ankiIdsToDelete);

					if (deletedFromAnki) {
						const cleanedSelection = selection.replace(idRegex, '').replace(/\\n\\s*\\n/g, '\\n');
						editor.replaceSelection(cleanedSelection);
						new Notice(`Removed ${ankiIdsToDelete.length} Anki ID block(s) from the selection.`);
					}

				} catch (error) {
					console.error("Error during Anki-only multi-deletion:", error);
					new Notice("Failed to execute Anki-only multi-deletion.", noticeTimeout);
				}
			}
		});

		this.addCommand({
			id: 'delete-all-cards-in-file-anki-only',
			name: 'Delete all cards in current file from Anki only',
			editorCallback: async (editor: Editor, view) => {
				const file = view.file;
				if (!file) {
					new Notice("No active file.");
					return;
				}

				const fileContent = await this.app.vault.read(file);
				const ankiIdsToDelete: number[] = [];
				const idRegex = /(?:^%%anki ID: (\d+)%%$|^\^(\d+)$)/gm; // Global flag needed
				let match;

				// Find all IDs within the entire file content
				while ((match = idRegex.exec(fileContent)) !== null) {
					const idString = match[1] || match[2];
					if (idString) {
						ankiIdsToDelete.push(parseInt(idString, 10));
					}
				}

				if (ankiIdsToDelete.length === 0) {
					new Notice("No Anki card IDs found in the current file.", noticeTimeout);
					return;
				}

				try {
					new Notice(`Attempting to delete ${ankiIdsToDelete.length} Anki card(s) associated with this file: [${ankiIdsToDelete.join(', ')}]...`);
					const deletedFromAnki = await this.cardsService.deleteCardsFromAnkiOnly(ankiIdsToDelete);

					if (deletedFromAnki) {
						// --- Obsidian Cleanup (Revised) --- 
						// Split into lines, filter out ID lines, rejoin
						const lines = fileContent.split('\n');
						const cleanedLines = lines.filter(line => !idRegex.test(line.trim())); // Test trimmed line
						// Reset regex lastIndex before testing each line
						// lines.forEach(line => { idRegex.lastIndex = 0; }); 
						// const cleanedLines = lines.filter(line => { 
						// 	idRegex.lastIndex = 0; // Reset index for global regex test
						// 	return !idRegex.test(line.trim()); 
						// });
						const cleanedContent = cleanedLines.join('\n');
						
						// Replace the entire editor content
						editor.setValue(cleanedContent);
						new Notice(`Removed ${ankiIdsToDelete.length} Anki ID block(s) from the file.`);
						// --- End Obsidian Cleanup ---
					}
				} catch (error) {
					console.error("Error during Anki-only file deletion:", error);
					new Notice("Failed to execute Anki-only file deletion.", noticeTimeout);
				}
			}
		});

		this.addRibbonIcon('flashcards', 'Generate flashcards', () => {
			const activeFile = this.app.workspace.getActiveFile()
			if (activeFile) {
				this.generateCards(activeFile)
			} else {
				new Notice("Open a file before")
			}
		});

		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerInterval(window.setInterval(() =>
			anki.ping().then(() => statusBar.setText('Anki ⚡️')).catch(() => statusBar.setText('')), 15 * 1000
		));
	}

	async onunload() {
		await this.saveData(this.settings);
	}

	private getDefaultSettings(): ISettings {
		return { contextAwareMode: true, sourceSupport: false, codeHighlightSupport: false, inlineID: false, contextSeparator: " > ", deck: "Default", folderBasedDeck: true, flashcardsTag: "card", inlineSeparator: "::", inlineSeparatorReverse: ":::", defaultAnkiTag: "obsidian", ankiConnectPermission: false }
	}

	private generateCards(activeFile: TFile) {
		this.cardsService.execute(activeFile).then(res => {
			for (const r of res) {
				new Notice(r, noticeTimeout)
			}
			console.log(res)
		}).catch(err => {
			Error(err)
		})
	}
}
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WordsData {
  categories: Record<string, string[]>;
}

export class WordBank {
  private wordsData: WordsData = {
    categories: {
      animals: ["cat", "dog", "elephant", "giraffe", "penguin", "lion", "tiger"],
      food: ["pizza", "burger", "sushi", "taco", "pancake", "donut", "ice cream"],
      objects: ["guitar", "backpack", "clock", "camera", "chair", "telescope"],
      actions: ["swimming", "dancing", "cooking", "reading", "flying"],
      places: ["castle", "island", "forest", "volcano", "beach", "hospital"],
    },
  };

  constructor() {
    try {
      // Look for words.json in shared package
      const possiblePaths = [
        path.resolve(__dirname, "../../../shared/src/words.json"),
        path.resolve(__dirname, "../../shared/src/words.json"),
        path.resolve(process.cwd(), "shared/src/words.json"),
        path.resolve(process.cwd(), "../shared/src/words.json"),
      ];

      let loaded = false;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          this.wordsData = JSON.parse(fs.readFileSync(p, "utf-8"));
          loaded = true;
          break;
        }
      }

      if (!loaded) {
        this.wordsData = {
          categories: {
            animals: ["cat", "dog", "elephant", "giraffe", "penguin", "lion", "tiger"],
            food: ["pizza", "burger", "sushi", "taco", "pancake", "donut", "ice cream"],
            objects: ["guitar", "backpack", "clock", "camera", "chair", "telescope"],
            actions: ["swimming", "dancing", "cooking", "reading", "flying"],
            places: ["castle", "island", "forest", "volcano", "beach", "hospital"],
          },
        };
      }
    } catch {
      this.wordsData = {
        categories: {
          general: ["cat", "pizza", "guitar", "dancing", "castle", "elephant"],
        },
      };
    }
  }

  public getCategories(): string[] {
    return Object.keys(this.wordsData.categories);
  }

  public getRandomWords(
    selectedCategories: string[],
    customWords: string[] = [],
    count: number = 3
  ): [string, string, string] {
    const pool: string[] = [];

    // Add selected categories
    const categoriesToUse =
      selectedCategories.length > 0 ? selectedCategories : this.getCategories();

    for (const cat of categoriesToUse) {
      if (this.wordsData.categories[cat]) {
        pool.push(...this.wordsData.categories[cat]);
      }
    }

    // Add custom words
    for (const custom of customWords) {
      const clean = custom.trim().toLowerCase();
      if (clean.length > 0) {
        pool.push(clean);
      }
    }

    // Fallback if pool is too small
    if (pool.length < count) {
      for (const cat of Object.keys(this.wordsData.categories)) {
        pool.push(...this.wordsData.categories[cat]);
      }
    }

    const uniquePool = Array.from(new Set(pool));
    const selected: string[] = [];

    for (let i = 0; i < count; i++) {
      if (uniquePool.length === 0) {
        selected.push(`Doodle-${i + 1}`);
        continue;
      }
      const randomIndex = Math.floor(Math.random() * uniquePool.length);
      selected.push(uniquePool.splice(randomIndex, 1)[0]);
    }

    return [selected[0], selected[1], selected[2]];
  }
}

export const wordBank = new WordBank();

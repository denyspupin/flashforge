import { and, eq, inArray, like, sql } from "drizzle-orm"
import { db } from "../lib/db/client.ts"
import {
  achievements,
  cards,
  deckTopics,
  decks,
  languages,
  notifications,
  studySessions,
  topics,
  userAchievements,
  users,
} from "../lib/db/schema.ts"
import { DEFAULT_LANGUAGES, DEFAULT_TOPICS } from "../lib/constants.ts"

type LangCode = (typeof DEFAULT_LANGUAGES)[number]["code"]
type TopicSlug = (typeof DEFAULT_TOPICS)[number]["slug"]

type MockUserKey =
  | "you"
  | "maria"
  | "hans"
  | "sophie"
  | "yuki"
  | "carlos"
  | "alex"
  | "emma"

const MOCK_CLERK_PREFIX = "mock_seed_"
const MOCK_DECK_SLUG_PREFIX = "seed-"
const SEED_MARKER_KEY = "_seed"

const MOCK_USERS: Array<{
  key: MockUserKey
  name: string
  nativeLang: LangCode
  xp: number
  streak: number
  role: "user" | "curator" | "admin"
  daysAgoStreakUpdate: number
}> = [
  {
    key: "you",
    name: "You",
    nativeLang: "en",
    xp: 1200,
    streak: 5,
    role: "curator",
    daysAgoStreakUpdate: 0,
  },
  {
    key: "maria",
    name: "Maria González",
    nativeLang: "es",
    xp: 3400,
    streak: 12,
    role: "curator",
    daysAgoStreakUpdate: 0,
  },
  {
    key: "hans",
    name: "Hans Müller",
    nativeLang: "de",
    xp: 2800,
    streak: 8,
    role: "curator",
    daysAgoStreakUpdate: 0,
  },
  {
    key: "sophie",
    name: "Sophie Laurent",
    nativeLang: "fr",
    xp: 1900,
    streak: 4,
    role: "curator",
    daysAgoStreakUpdate: 1,
  },
  {
    key: "yuki",
    name: "Yuki Tanaka",
    nativeLang: "ja",
    xp: 1500,
    streak: 2,
    role: "user",
    daysAgoStreakUpdate: 0,
  },
  {
    key: "carlos",
    name: "Carlos Silva",
    nativeLang: "pt",
    xp: 950,
    streak: 6,
    role: "user",
    daysAgoStreakUpdate: 0,
  },
  {
    key: "alex",
    name: "Alex Petrov",
    nativeLang: "ru",
    xp: 700,
    streak: 0,
    role: "user",
    daysAgoStreakUpdate: 14,
  },
  {
    key: "emma",
    name: "Emma Thompson",
    nativeLang: "en",
    xp: 250,
    streak: 1,
    role: "user",
    daysAgoStreakUpdate: 0,
  },
]

const MOCK_ACHIEVEMENTS = [
  {
    name: "First Steps",
    description: "Complete your very first deck.",
    xpValue: 50,
    conditionType: "deck_complete_count",
    conditionValue: { count: 1 },
  },
  {
    name: "Perfect Score",
    description: "Finish a deck with 100% correct answers.",
    xpValue: 100,
    conditionType: "deck_perfect",
    conditionValue: { count: 1 },
  },
  {
    name: "Week Warrior",
    description: "Maintain a 7-day study streak.",
    xpValue: 200,
    conditionType: "streak_days",
    conditionValue: { days: 7 },
  },
  {
    name: "Polyglot",
    description: "Study decks across 3 different language pairs.",
    xpValue: 150,
    conditionType: "language_pair_count",
    conditionValue: { count: 3 },
  },
  {
    name: "Deck Master",
    description: "Complete 10 different decks.",
    xpValue: 500,
    conditionType: "deck_complete_count",
    conditionValue: { count: 10 },
  },
  {
    name: "Card Collector",
    description: "Review 100 cards across all study sessions.",
    xpValue: 100,
    conditionType: "cards_reviewed",
    conditionValue: { count: 100 },
  },
  {
    name: "Topic Explorer",
    description: "Study decks from 5 different topics.",
    xpValue: 150,
    conditionType: "topic_count",
    conditionValue: { count: 5 },
  },
  {
    name: "Fork Star",
    description: "Have one of your decks forked 3 times.",
    xpValue: 250,
    conditionType: "deck_fork_count",
    conditionValue: { count: 3 },
  },
] as const

type AchievementName = (typeof MOCK_ACHIEVEMENTS)[number]["name"]

type CardPair = readonly [string, string]

type DeckSeed = {
  slugSuffix: string
  title: string
  description: string
  visibility: "public" | "private"
  isCurated: boolean
  creator: MockUserKey
  sourceLang: LangCode
  targetLang: LangCode
  topics: TopicSlug[]
  forkedFrom?: string
  cards: CardPair[]
}

const DECKS: DeckSeed[] = [
  {
    slugSuffix: "restaurant-essentials-de",
    title: "Restaurant Essentials",
    description:
      "Order food, drinks, and pay the bill with confidence in German.",
    visibility: "public",
    isCurated: true,
    creator: "hans",
    sourceLang: "en",
    targetLang: "de",
    topics: ["food"],
    cards: [
      ["hello", "hallo"],
      ["bread", "Brot"],
      ["water", "Wasser"],
      ["menu", "Speisekarte"],
      ["bill", "Rechnung"],
      ["waiter", "Kellner"],
      ["table", "Tisch"],
      ["wine", "Wein"],
      ["beer", "Bier"],
      ["coffee", "Kaffee"],
      ["salt", "Salz"],
      ["pepper", "Pfeffer"],
      ["please", "bitte"],
      ["thank you", "danke"],
      ["delicious", "lecker"],
    ],
  },
  {
    slugSuffix: "animals-at-the-zoo-es",
    title: "Animals at the Zoo",
    description: "Learn the names of common animals in Spanish.",
    visibility: "public",
    isCurated: true,
    creator: "maria",
    sourceLang: "en",
    targetLang: "es",
    topics: ["animals"],
    cards: [
      ["dog", "perro"],
      ["cat", "gato"],
      ["bird", "pájaro"],
      ["lion", "león"],
      ["tiger", "tigre"],
      ["elephant", "elefante"],
      ["monkey", "mono"],
      ["bear", "oso"],
      ["snake", "serpiente"],
      ["fish", "pez"],
      ["horse", "caballo"],
      ["cow", "vaca"],
      ["rabbit", "conejo"],
      ["eagle", "águila"],
    ],
  },
  {
    slugSuffix: "around-the-house-fr",
    title: "Around the House",
    description: "Household vocabulary you'll use every single day in French.",
    visibility: "public",
    isCurated: true,
    creator: "sophie",
    sourceLang: "en",
    targetLang: "fr",
    topics: ["household"],
    cards: [
      ["kitchen", "cuisine"],
      ["bedroom", "chambre"],
      ["bathroom", "salle de bain"],
      ["door", "porte"],
      ["window", "fenêtre"],
      ["table", "table"],
      ["chair", "chaise"],
      ["bed", "lit"],
      ["lamp", "lampe"],
      ["mirror", "miroir"],
      ["sofa", "canapé"],
      ["floor", "sol"],
      ["ceiling", "plafond"],
      ["wall", "mur"],
    ],
  },
  {
    slugSuffix: "travel-phrases-it",
    title: "Travel Phrases",
    description: "Essential Italian phrases for your next trip to Italy.",
    visibility: "public",
    isCurated: true,
    creator: "you",
    sourceLang: "en",
    targetLang: "it",
    topics: ["travel"],
    cards: [
      ["hello", "ciao"],
      ["goodbye", "arrivederci"],
      ["please", "per favore"],
      ["thank you", "grazie"],
      ["yes", "sì"],
      ["no", "no"],
      ["excuse me", "mi scusi"],
      ["where is", "dov'è"],
      ["how much", "quanto costa"],
      ["train station", "stazione"],
      ["airport", "aeroporto"],
      ["hotel", "albergo"],
      ["bathroom", "bagno"],
      ["help", "aiuto"],
      ["I don't understand", "non capisco"],
    ],
  },
  {
    slugSuffix: "fruits-and-vegetables-es",
    title: "Fruits & Vegetables",
    description: "Stock your kitchen vocabulary in Spanish.",
    visibility: "public",
    isCurated: true,
    creator: "maria",
    sourceLang: "en",
    targetLang: "es",
    topics: ["food", "shopping"],
    cards: [
      ["apple", "manzana"],
      ["banana", "plátano"],
      ["orange", "naranja"],
      ["grape", "uva"],
      ["strawberry", "fresa"],
      ["lemon", "limón"],
      ["tomato", "tomate"],
      ["potato", "patata"],
      ["carrot", "zanahoria"],
      ["onion", "cebolla"],
      ["garlic", "ajo"],
      ["lettuce", "lechuga"],
      ["pepper", "pimiento"],
      ["cucumber", "pepino"],
      ["pumpkin", "calabaza"],
    ],
  },
  {
    slugSuffix: "at-the-doctor-de",
    title: "At the Doctor",
    description: "Body parts and symptoms for your German doctor's visit.",
    visibility: "public",
    isCurated: true,
    creator: "hans",
    sourceLang: "en",
    targetLang: "de",
    topics: ["doctor-visit"],
    cards: [
      ["doctor", "Arzt"],
      ["pain", "Schmerz"],
      ["headache", "Kopfschmerzen"],
      ["fever", "Fieber"],
      ["cough", "Husten"],
      ["medicine", "Medikament"],
      ["pharmacy", "Apotheke"],
      ["hospital", "Krankenhaus"],
      ["appointment", "Termin"],
      ["healthy", "gesund"],
      ["sick", "krank"],
      ["heart", "Herz"],
      ["arm", "Arm"],
      ["leg", "Bein"],
    ],
  },
  {
    slugSuffix: "office-meeting-fr",
    title: "Office Meeting",
    description: "Get through your next French work meeting with ease.",
    visibility: "public",
    isCurated: true,
    creator: "sophie",
    sourceLang: "en",
    targetLang: "fr",
    topics: ["work-meeting"],
    cards: [
      ["meeting", "réunion"],
      ["agenda", "ordre du jour"],
      ["project", "projet"],
      ["deadline", "échéance"],
      ["team", "équipe"],
      ["manager", "responsable"],
      ["report", "rapport"],
      ["budget", "budget"],
      ["client", "client"],
      ["presentation", "présentation"],
      ["email", "courriel"],
      ["question", "question"],
    ],
  },
  {
    slugSuffix: "daily-greetings-de",
    title: "Daily Greetings",
    description: "Polite hellos, goodbyes, and small talk in German.",
    visibility: "public",
    isCurated: true,
    creator: "hans",
    sourceLang: "en",
    targetLang: "de",
    topics: ["travel"],
    cards: [
      ["good morning", "guten Morgen"],
      ["good evening", "guten Abend"],
      ["good night", "gute Nacht"],
      ["how are you", "wie geht's"],
      ["I'm fine", "mir geht's gut"],
      ["see you later", "bis später"],
      ["welcome", "willkommen"],
      ["nice to meet you", "freut mich"],
      ["excuse me", "Entschuldigung"],
      ["sorry", "Verzeihung"],
    ],
  },
  {
    slugSuffix: "shopping-for-clothes-it",
    title: "Shopping for Clothes",
    description: "Find your size and style in Italian boutiques.",
    visibility: "public",
    isCurated: true,
    creator: "you",
    sourceLang: "en",
    targetLang: "it",
    topics: ["shopping"],
    cards: [
      ["shirt", "camicia"],
      ["pants", "pantaloni"],
      ["dress", "vestito"],
      ["shoes", "scarpe"],
      ["jacket", "giacca"],
      ["hat", "cappello"],
      ["scarf", "sciarpa"],
      ["size", "taglia"],
      ["color", "colore"],
      ["price", "prezzo"],
      ["sale", "saldi"],
      ["fitting room", "camerino"],
      ["receipt", "scontrino"],
    ],
  },
  {
    slugSuffix: "kitchen-and-cooking-es",
    title: "Kitchen & Cooking",
    description: "Tools, ingredients, and verbs for cooking in Spanish.",
    visibility: "public",
    isCurated: true,
    creator: "maria",
    sourceLang: "en",
    targetLang: "es",
    topics: ["food", "household"],
    cards: [
      ["knife", "cuchillo"],
      ["fork", "tenedor"],
      ["spoon", "cuchara"],
      ["plate", "plato"],
      ["glass", "vaso"],
      ["pan", "sartén"],
      ["pot", "olla"],
      ["oven", "horno"],
      ["refrigerator", "nevera"],
      ["sugar", "azúcar"],
      ["flour", "harina"],
      ["egg", "huevo"],
      ["milk", "leche"],
      ["butter", "mantequilla"],
    ],
  },
  {
    slugSuffix: "pet-vocabulary-pt",
    title: "Pet Vocabulary",
    description: "Talk about your beloved pets in Portuguese.",
    visibility: "public",
    isCurated: false,
    creator: "carlos",
    sourceLang: "en",
    targetLang: "pt",
    topics: ["animals"],
    cards: [
      ["dog", "cão"],
      ["cat", "gato"],
      ["puppy", "cachorro"],
      ["kitten", "gatinho"],
      ["hamster", "hamster"],
      ["rabbit", "coelho"],
      ["turtle", "tartaruga"],
      ["parrot", "papagaio"],
      ["fish", "peixe"],
      ["leash", "coleira"],
      ["food bowl", "tigela"],
      ["vet", "veterinário"],
    ],
  },
  {
    slugSuffix: "japanese-basics-ja",
    title: "Japanese Basics",
    description: "First words and phrases for any Japanese learner.",
    visibility: "public",
    isCurated: false,
    creator: "yuki",
    sourceLang: "en",
    targetLang: "ja",
    topics: ["travel"],
    cards: [
      ["hello", "こんにちは"],
      ["goodbye", "さようなら"],
      ["thank you", "ありがとう"],
      ["yes", "はい"],
      ["no", "いいえ"],
      ["please", "お願いします"],
      ["sorry", "ごめんなさい"],
      ["water", "水"],
      ["tea", "お茶"],
      ["food", "食べ物"],
      ["good", "いい"],
      ["bad", "悪い"],
    ],
  },
  {
    slugSuffix: "russian-for-tourists-ru",
    title: "Russian for Tourists",
    description: "Survive your trip to Russia with essential phrases.",
    visibility: "public",
    isCurated: false,
    creator: "alex",
    sourceLang: "en",
    targetLang: "ru",
    topics: ["travel"],
    cards: [
      ["hello", "привет"],
      ["goodbye", "до свидания"],
      ["thank you", "спасибо"],
      ["please", "пожалуйста"],
      ["yes", "да"],
      ["no", "нет"],
      ["water", "вода"],
      ["bread", "хлеб"],
      ["where", "где"],
      ["help", "помогите"],
    ],
  },
  {
    slugSuffix: "common-foods-pt",
    title: "Common Foods",
    description: "Everyday Portuguese foods you'll see on any menu.",
    visibility: "public",
    isCurated: false,
    creator: "carlos",
    sourceLang: "en",
    targetLang: "pt",
    topics: ["food"],
    cards: [
      ["rice", "arroz"],
      ["beans", "feijão"],
      ["chicken", "frango"],
      ["fish", "peixe"],
      ["beef", "carne"],
      ["salad", "salada"],
      ["soup", "sopa"],
      ["cheese", "queijo"],
      ["bread", "pão"],
      ["coffee", "café"],
      ["juice", "suco"],
      ["dessert", "sobremesa"],
    ],
  },
  {
    slugSuffix: "german-numbers-and-colors-de",
    title: "German Numbers & Colors",
    description: "Count to ten and name every color in the rainbow.",
    visibility: "public",
    isCurated: false,
    creator: "emma",
    sourceLang: "en",
    targetLang: "de",
    topics: ["household"],
    cards: [
      ["one", "eins"],
      ["two", "zwei"],
      ["three", "drei"],
      ["four", "vier"],
      ["five", "fünf"],
      ["red", "rot"],
      ["blue", "blau"],
      ["green", "grün"],
      ["yellow", "gelb"],
      ["black", "schwarz"],
      ["white", "weiß"],
      ["orange", "orange"],
    ],
  },
  {
    slugSuffix: "animals-at-the-zoo-es-emma-fork",
    title: "Animals at the Zoo (My Copy)",
    description: "My personal copy to study and customize.",
    visibility: "public",
    isCurated: false,
    creator: "emma",
    sourceLang: "en",
    targetLang: "es",
    topics: ["animals"],
    forkedFrom: "animals-at-the-zoo-es",
    cards: [
      ["dog", "perro"],
      ["cat", "gato"],
      ["bird", "pájaro"],
      ["lion", "león"],
      ["tiger", "tigre"],
      ["elephant", "elefante"],
      ["monkey", "mono"],
      ["bear", "oso"],
      ["snake", "serpiente"],
      ["fish", "pez"],
      ["horse", "caballo"],
      ["cow", "vaca"],
      ["rabbit", "conejo"],
      ["eagle", "águila"],
    ],
  },
  {
    slugSuffix: "around-the-house-fr-yuki-fork",
    title: "Around the House (My Practice)",
    description: "Yuki's practice version of Sophie's household deck.",
    visibility: "public",
    isCurated: false,
    creator: "yuki",
    sourceLang: "en",
    targetLang: "fr",
    topics: ["household"],
    forkedFrom: "around-the-house-fr",
    cards: [
      ["kitchen", "cuisine"],
      ["bedroom", "chambre"],
      ["bathroom", "salle de bain"],
      ["door", "porte"],
      ["window", "fenêtre"],
      ["table", "table"],
      ["chair", "chaise"],
      ["bed", "lit"],
      ["lamp", "lampe"],
      ["mirror", "miroir"],
    ],
  },
  {
    slugSuffix: "personal-german-notes",
    title: "Personal German Notes",
    description: "My private set of food-related German words I'm studying.",
    visibility: "private",
    isCurated: false,
    creator: "you",
    sourceLang: "en",
    targetLang: "de",
    topics: ["food"],
    forkedFrom: "restaurant-essentials-de",
    cards: [
      ["hello", "hallo"],
      ["bread", "Brot"],
      ["water", "Wasser"],
      ["menu", "Speisekarte"],
      ["bill", "Rechnung"],
      ["waiter", "Kellner"],
      ["table", "Tisch"],
      ["wine", "Wein"],
      ["beer", "Bier"],
      ["coffee", "Kaffee"],
      ["salt", "Salz"],
      ["pepper", "Pfeffer"],
      ["please", "bitte"],
      ["thank you", "danke"],
      ["delicious", "lecker"],
    ],
  },
  {
    slugSuffix: "italian-recipes-vocab",
    title: "Italian Recipes Vocab",
    description: "Words I keep running into while reading Italian recipes.",
    visibility: "private",
    isCurated: false,
    creator: "you",
    sourceLang: "en",
    targetLang: "it",
    topics: ["food"],
    cards: [
      ["pasta", "pasta"],
      ["sauce", "sugo"],
      ["cheese", "formaggio"],
      ["onion", "cipolla"],
      ["garlic", "aglio"],
      ["tomato", "pomodoro"],
      ["basil", "basilico"],
      ["olive oil", "olio d'oliva"],
      ["flour", "farina"],
      ["mushroom", "fungo"],
    ],
  },
  {
    slugSuffix: "quick-spanish",
    title: "Quick Spanish",
    description: "Phrases for a quick grocery run in Spain.",
    visibility: "private",
    isCurated: false,
    creator: "you",
    sourceLang: "en",
    targetLang: "es",
    topics: ["shopping"],
    cards: [
      ["how much", "cuánto cuesta"],
      ["receipt", "recibo"],
      ["bag", "bolsa"],
      ["cash", "efectivo"],
      ["card", "tarjeta"],
      ["change", "cambio"],
      ["open", "abierto"],
      ["closed", "cerrado"],
    ],
  },
  {
    slugSuffix: "my-russian-study",
    title: "My Russian Study",
    description: "Emma's private Russian travel notes.",
    visibility: "private",
    isCurated: false,
    creator: "emma",
    sourceLang: "en",
    targetLang: "ru",
    topics: ["travel"],
    cards: [
      ["hello", "привет"],
      ["thank you", "спасибо"],
      ["please", "пожалуйста"],
      ["yes", "да"],
      ["no", "нет"],
      ["help", "помогите"],
    ],
  },
  {
    slugSuffix: "french-notes",
    title: "French Notes",
    description: "Alex's private French household vocab list.",
    visibility: "private",
    isCurated: false,
    creator: "alex",
    sourceLang: "en",
    targetLang: "fr",
    topics: ["household"],
    cards: [
      ["window", "fenêtre"],
      ["door", "porte"],
      ["bed", "lit"],
      ["lamp", "lampe"],
      ["chair", "chaise"],
      ["table", "table"],
    ],
  },
]

type StudySessionSeed = {
  user: MockUserKey
  deckSlug: string
  status: "active" | "completed" | "abandoned"
  cardsReviewed: number
  cardsCorrect: number
  failedCount: number
  startedDaysAgo: number
  completedDaysAgo?: number
}

const STUDY_SESSIONS: StudySessionSeed[] = [
  {
    user: "you",
    deckSlug: "restaurant-essentials-de",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 15,
    failedCount: 0,
    startedDaysAgo: 4,
    completedDaysAgo: 4,
  },
  {
    user: "you",
    deckSlug: "animals-at-the-zoo-es",
    status: "completed",
    cardsReviewed: 14,
    cardsCorrect: 12,
    failedCount: 2,
    startedDaysAgo: 3,
    completedDaysAgo: 3,
  },
  {
    user: "you",
    deckSlug: "fruits-and-vegetables-es",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 14,
    failedCount: 1,
    startedDaysAgo: 2,
    completedDaysAgo: 2,
  },
  {
    user: "you",
    deckSlug: "personal-german-notes",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 13,
    failedCount: 2,
    startedDaysAgo: 1,
    completedDaysAgo: 1,
  },
  {
    user: "you",
    deckSlug: "shopping-for-clothes-it",
    status: "completed",
    cardsReviewed: 13,
    cardsCorrect: 11,
    failedCount: 2,
    startedDaysAgo: 1,
    completedDaysAgo: 1,
  },
  {
    user: "you",
    deckSlug: "travel-phrases-it",
    status: "active",
    cardsReviewed: 5,
    cardsCorrect: 4,
    failedCount: 1,
    startedDaysAgo: 0,
  },
  {
    user: "you",
    deckSlug: "pet-vocabulary-pt",
    status: "abandoned",
    cardsReviewed: 3,
    cardsCorrect: 1,
    failedCount: 2,
    startedDaysAgo: 5,
  },
  {
    user: "you",
    deckSlug: "office-meeting-fr",
    status: "completed",
    cardsReviewed: 12,
    cardsCorrect: 10,
    failedCount: 2,
    startedDaysAgo: 6,
    completedDaysAgo: 6,
  },
  {
    user: "maria",
    deckSlug: "fruits-and-vegetables-es",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 15,
    failedCount: 0,
    startedDaysAgo: 2,
    completedDaysAgo: 2,
  },
  {
    user: "maria",
    deckSlug: "restaurant-essentials-de",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 13,
    failedCount: 2,
    startedDaysAgo: 7,
    completedDaysAgo: 7,
  },
  {
    user: "maria",
    deckSlug: "travel-phrases-it",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 14,
    failedCount: 1,
    startedDaysAgo: 1,
    completedDaysAgo: 1,
  },
  {
    user: "hans",
    deckSlug: "animals-at-the-zoo-es",
    status: "completed",
    cardsReviewed: 14,
    cardsCorrect: 14,
    failedCount: 0,
    startedDaysAgo: 3,
    completedDaysAgo: 3,
  },
  {
    user: "hans",
    deckSlug: "travel-phrases-it",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 13,
    failedCount: 2,
    startedDaysAgo: 2,
    completedDaysAgo: 2,
  },
  {
    user: "sophie",
    deckSlug: "restaurant-essentials-de",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 14,
    failedCount: 1,
    startedDaysAgo: 5,
    completedDaysAgo: 5,
  },
  {
    user: "sophie",
    deckSlug: "fruits-and-vegetables-es",
    status: "completed",
    cardsReviewed: 15,
    cardsCorrect: 12,
    failedCount: 3,
    startedDaysAgo: 2,
    completedDaysAgo: 2,
  },
  {
    user: "yuki",
    deckSlug: "around-the-house-fr-yuki-fork",
    status: "active",
    cardsReviewed: 4,
    cardsCorrect: 3,
    failedCount: 1,
    startedDaysAgo: 0,
  },
  {
    user: "yuki",
    deckSlug: "japanese-basics-ja",
    status: "completed",
    cardsReviewed: 12,
    cardsCorrect: 12,
    failedCount: 0,
    startedDaysAgo: 4,
    completedDaysAgo: 4,
  },
  {
    user: "carlos",
    deckSlug: "common-foods-pt",
    status: "completed",
    cardsReviewed: 12,
    cardsCorrect: 11,
    failedCount: 1,
    startedDaysAgo: 1,
    completedDaysAgo: 1,
  },
  {
    user: "carlos",
    deckSlug: "pet-vocabulary-pt",
    status: "completed",
    cardsReviewed: 12,
    cardsCorrect: 12,
    failedCount: 0,
    startedDaysAgo: 3,
    completedDaysAgo: 3,
  },
  {
    user: "emma",
    deckSlug: "animals-at-the-zoo-es-emma-fork",
    status: "completed",
    cardsReviewed: 14,
    cardsCorrect: 9,
    failedCount: 5,
    startedDaysAgo: 1,
    completedDaysAgo: 1,
  },
  {
    user: "emma",
    deckSlug: "german-numbers-and-colors-de",
    status: "completed",
    cardsReviewed: 12,
    cardsCorrect: 8,
    failedCount: 4,
    startedDaysAgo: 2,
    completedDaysAgo: 2,
  },
  {
    user: "emma",
    deckSlug: "my-russian-study",
    status: "active",
    cardsReviewed: 2,
    cardsCorrect: 2,
    failedCount: 0,
    startedDaysAgo: 0,
  },
  {
    user: "alex",
    deckSlug: "russian-for-tourists-ru",
    status: "completed",
    cardsReviewed: 10,
    cardsCorrect: 8,
    failedCount: 2,
    startedDaysAgo: 15,
    completedDaysAgo: 15,
  },
]

const USER_ACHIEVEMENTS: Record<MockUserKey, AchievementName[]> = {
  you: ["First Steps", "Perfect Score", "Card Collector", "Topic Explorer"],
  maria: [
    "First Steps",
    "Perfect Score",
    "Week Warrior",
    "Deck Master",
    "Polyglot",
    "Card Collector",
    "Fork Star",
  ],
  hans: [
    "First Steps",
    "Perfect Score",
    "Week Warrior",
    "Deck Master",
    "Card Collector",
    "Fork Star",
  ],
  sophie: ["First Steps", "Perfect Score", "Polyglot", "Card Collector"],
  yuki: ["First Steps", "Card Collector"],
  carlos: ["First Steps", "Week Warrior"],
  alex: [],
  emma: ["First Steps"],
}

type NotificationSeed = {
  recipient: MockUserKey
  type: "fork_received" | "achievement_unlocked"
  data: Record<string, unknown>
  read: boolean
  daysAgo: number
}

const NOTIFICATIONS: NotificationSeed[] = [
  {
    recipient: "you",
    type: "fork_received",
    data: {
      deckTitle: "Travel Phrases",
      forkerName: "Emma Thompson",
    },
    read: false,
    daysAgo: 1,
  },
  {
    recipient: "you",
    type: "fork_received",
    data: {
      deckTitle: "Shopping for Clothes",
      forkerName: "Carlos Silva",
    },
    read: true,
    daysAgo: 4,
  },
  {
    recipient: "you",
    type: "achievement_unlocked",
    data: {
      achievementName: "Perfect Score",
      xpValue: 100,
    },
    read: false,
    daysAgo: 4,
  },
  {
    recipient: "you",
    type: "achievement_unlocked",
    data: {
      achievementName: "Card Collector",
      xpValue: 100,
    },
    read: true,
    daysAgo: 8,
  },
  {
    recipient: "maria",
    type: "achievement_unlocked",
    data: {
      achievementName: "Deck Master",
      xpValue: 500,
    },
    read: true,
    daysAgo: 3,
  },
  {
    recipient: "hans",
    type: "fork_received",
    data: {
      deckTitle: "Restaurant Essentials",
      forkerName: "You",
    },
    read: false,
    daysAgo: 1,
  },
  {
    recipient: "sophie",
    type: "fork_received",
    data: {
      deckTitle: "Around the House",
      forkerName: "Yuki Tanaka",
    },
    read: false,
    daysAgo: 2,
  },
]

function daysAgo(days: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
}

async function ensureReferenceData() {
  await db
    .insert(languages)
    .values([...DEFAULT_LANGUAGES])
    .onConflictDoNothing({ target: languages.code })

  await db
    .insert(topics)
    .values([...DEFAULT_TOPICS])
    .onConflictDoNothing({ target: topics.slug })
}

async function clearMockData(envClerkId: string | null) {
  const mockAchievementNames = MOCK_ACHIEVEMENTS.map((a) => a.name)

  await db
    .delete(notifications)
    .where(sql`${notifications.data}->>${SEED_MARKER_KEY} = 'true'`)

  await db
    .delete(achievements)
    .where(inArray(achievements.name, mockAchievementNames))

  await db
    .delete(decks)
    .where(like(decks.slug, `${MOCK_DECK_SLUG_PREFIX}%`))

  await db
    .delete(users)
    .where(like(users.clerkId, `${MOCK_CLERK_PREFIX}%`))

  if (envClerkId) {
    const [envUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, envClerkId))

    if (envUser) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.userId, envUser.id),
            sql`${notifications.data}->>${SEED_MARKER_KEY} = 'true'`
          )
        )
    }
  }
}

async function seedAchievements() {
  const inserted = await db
    .insert(achievements)
    .values(
      MOCK_ACHIEVEMENTS.map((a) => ({
        name: a.name,
        description: a.description,
        xpValue: a.xpValue,
        conditionType: a.conditionType,
        conditionValue: a.conditionValue,
      }))
    )
    .returning({ id: achievements.id, name: achievements.name })

  const map = new Map<AchievementName, string>()
  for (const row of inserted) {
    map.set(row.name as AchievementName, row.id)
  }
  return map
}

async function seedUsers(envClerkId: string | null) {
  const langRows = await db.select().from(languages)
  const langByCode = new Map(langRows.map((l) => [l.code, l.id]))

  const userIds = new Map<MockUserKey, string>()

  for (const u of MOCK_USERS) {
    const clerkId =
      u.key === "you" && envClerkId ? envClerkId : `${MOCK_CLERK_PREFIX}${u.key}`

    const baseValues = {
      clerkId,
      name: u.key === "you" && envClerkId ? "You" : u.name,
      avatarUrl: avatarUrl(u.name),
      nativeLanguageId: langByCode.get(u.nativeLang) ?? null,
      xp: u.xp,
      streak: u.streak,
      streakUpdatedAt: daysAgo(u.daysAgoStreakUpdate),
      role: u.role,
    }

    const [row] = await db
      .insert(users)
      .values(baseValues)
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          name: baseValues.name,
          avatarUrl: baseValues.avatarUrl,
          nativeLanguageId: baseValues.nativeLanguageId,
          xp: baseValues.xp,
          streak: baseValues.streak,
          streakUpdatedAt: baseValues.streakUpdatedAt,
          role: baseValues.role,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id })

    userIds.set(u.key, row.id)
  }

  return userIds
}

async function seedDecksAndCards(userIds: Map<MockUserKey, string>) {
  const langRows = await db.select().from(languages)
  const langByCode = new Map(langRows.map((l) => [l.code, l.id]))

  const topicRows = await db.select().from(topics)
  const topicBySlug = new Map(topicRows.map((t) => [t.slug, t.id]))

  const deckIdBySlug = new Map<string, string>()

  for (const deck of DECKS) {
    const slug = `${MOCK_DECK_SLUG_PREFIX}${deck.slugSuffix}`
    const creatorId = userIds.get(deck.creator)
    const sourceLanguageId = langByCode.get(deck.sourceLang)
    const targetLanguageId = langByCode.get(deck.targetLang)

    if (!creatorId || !sourceLanguageId || !targetLanguageId) {
      throw new Error(`Missing reference for deck ${deck.slugSuffix}`)
    }

    const forkedFromDeckId = deck.forkedFrom
      ? deckIdBySlug.get(`${MOCK_DECK_SLUG_PREFIX}${deck.forkedFrom}`)
      : null

    const [row] = await db
      .insert(decks)
      .values({
        title: deck.title,
        slug,
        description: deck.description,
        visibility: deck.visibility,
        sourceLanguageId,
        targetLanguageId,
        creatorId,
        isCurated: deck.isCurated,
        forkedFromDeckId: forkedFromDeckId ?? null,
      })
      .returning({ id: decks.id })

    deckIdBySlug.set(slug, row.id)

    if (deck.topics.length > 0) {
      const links = deck.topics
        .map((slugT) => topicBySlug.get(slugT))
        .filter((id): id is string => Boolean(id))
        .map((topicId) => ({ deckId: row.id, topicId }))
      if (links.length > 0) {
        await db.insert(deckTopics).values(links)
      }
    }

    if (deck.cards.length > 0) {
      await db.insert(cards).values(
        deck.cards.map(([front, back]) => ({
          deckId: row.id,
          front,
          back,
          timesReviewed: Math.floor(Math.random() * 8),
          timesCorrect: Math.floor(Math.random() * 6),
          lastReviewedAt: Math.random() > 0.5 ? daysAgo(Math.floor(Math.random() * 7)) : null,
        }))
      )
    }
  }

  return deckIdBySlug
}

async function seedStudySessionsData(
  userIds: Map<MockUserKey, string>,
  deckIdBySlug: Map<string, string>
) {
  const rows = STUDY_SESSIONS.map((s) => {
    const userId = userIds.get(s.user)
    const deckId = deckIdBySlug.get(`${MOCK_DECK_SLUG_PREFIX}${s.deckSlug}`)
    if (!userId || !deckId) {
      throw new Error(`Missing reference for session on ${s.deckSlug}`)
    }

    const startedAt = daysAgo(s.startedDaysAgo)
    const completedAt =
      s.status === "completed" && s.completedDaysAgo !== undefined
        ? daysAgo(s.completedDaysAgo)
        : null

    return {
      userId,
      deckId,
      status: s.status,
      startedAt,
      completedAt,
      cardsReviewed: s.cardsReviewed,
      cardsCorrect: s.cardsCorrect,
      failedCardIds: Array.from(
        { length: s.failedCount },
        (_, i) => `placeholder-${i}`
      ),
    }
  })

  if (rows.length > 0) {
    await db.insert(studySessions).values(rows)
  }
}

async function seedUserAchievementsData(
  userIds: Map<MockUserKey, string>,
  achievementIds: Map<AchievementName, string>
) {
  const rows: Array<{
    userId: string
    achievementId: string
    awardedAt: Date
  }> = []

  for (const [userKey, names] of Object.entries(USER_ACHIEVEMENTS) as Array<
    [MockUserKey, AchievementName[]]
  >) {
    const userId = userIds.get(userKey)
    if (!userId) continue
    names.forEach((name, idx) => {
      const achievementId = achievementIds.get(name)
      if (!achievementId) return
      rows.push({
        userId,
        achievementId,
        awardedAt: daysAgo(idx + 1),
      })
    })
  }

  if (rows.length > 0) {
    await db.insert(userAchievements).values(rows)
  }
}

async function seedNotificationsData(userIds: Map<MockUserKey, string>) {
  const rows = NOTIFICATIONS.map((n) => {
    const userId = userIds.get(n.recipient)
    if (!userId) {
      throw new Error(`Missing user for notification ${n.recipient}`)
    }
    return {
      userId,
      type: n.type,
      data: { ...n.data, [SEED_MARKER_KEY]: true },
      read: n.read,
      createdAt: daysAgo(n.daysAgo),
      updatedAt: daysAgo(n.daysAgo),
    }
  })

  if (rows.length > 0) {
    await db.insert(notifications).values(rows)
  }
}

async function main() {
  const reset = process.argv.includes("--reset")
  const envClerkId = process.env.SEED_CLERK_USER_ID?.trim() || null

  console.log("FlashForge mock seed")
  console.log(`  reset:           ${reset}`)
  console.log(
    `  SEED_CLERK_USER_ID: ${envClerkId ? envClerkId : "(not set — using fake clerk_id for 'you')"}`
  )
  console.log()

  console.log("Ensuring reference data (languages, topics)...")
  await ensureReferenceData()

  if (reset) {
    console.log("Clearing previous mock data...")
    await clearMockData(envClerkId)
  } else {
    const [existing] = await db
      .select({ id: decks.id })
      .from(decks)
      .where(like(decks.slug, `${MOCK_DECK_SLUG_PREFIX}%`))
      .limit(1)

    if (existing) {
      console.error(
        "Mock data already exists. Re-run with `pnpm db:seed:mock:reset` to wipe and reseed."
      )
      process.exit(1)
    }
  }

  console.log("Seeding achievements...")
  const achievementIds = await seedAchievements()

  console.log("Seeding users...")
  const userIds = await seedUsers(envClerkId)

  console.log("Seeding decks and cards...")
  const deckIdBySlug = await seedDecksAndCards(userIds)

  console.log("Seeding study sessions...")
  await seedStudySessionsData(userIds, deckIdBySlug)

  console.log("Seeding user achievements...")
  await seedUserAchievementsData(userIds, achievementIds)

  console.log("Seeding notifications...")
  await seedNotificationsData(userIds)

  console.log()
  console.log("Mock seed complete:")
  console.log(`  users:         ${userIds.size}`)
  console.log(`  decks:         ${deckIdBySlug.size}`)
  console.log(`  achievements:  ${achievementIds.size}`)
  console.log(`  sessions:      ${STUDY_SESSIONS.length}`)
  console.log(`  notifications: ${NOTIFICATIONS.length}`)
  if (envClerkId) {
    console.log()
    console.log(
      `Logged-in user (clerk_id=${envClerkId}) is linked as 'You' with decks, XP, sessions, and notifications.`
    )
  } else {
    console.log()
    console.log(
      "Tip: set SEED_CLERK_USER_ID=<your-clerk-user-id> before running to link 'You' to your real account."
    )
  }
  process.exit(0)
}

main().catch((err) => {
  console.error("Mock seed failed:", err)
  process.exit(1)
})

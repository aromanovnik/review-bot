# 🤖 Review Bot

Automated assistant for pull request reviews.  
Fetches diffs from GitHub, analyzes them with a local **Ollama** model, and checks against a defined checklist.

---

## 🚀 Installation

```bash
git clone https://github.com/yourname/review-bot.git
cd review-bot
npm install
```

> ⚠️ Make sure [Ollama](https://ollama.ai) is installed and running locally.  
> The default model is `llama3`. You can change it using an environment variable:
>
> ```bash
> export OLLAMA_MODEL=llama3.1
> ```

---

## ▶️ Usage

Analyze a specific PR:

```bash
npm run review -- https://github.com/owner/repo/pull/NUMBER
```

---

## 📋 Default Checklist

1. Semantic HTML is used
2. TypeScript types are correct (no `any`)

---

## 📝 Output Format

Example output:

```
10 + <header>
**Excellent**: Great use of the `<header>` semantic tag — improves accessibility and page structure.

25 + const value: any = getData();
**Must Fix**: Using `any` breaks strict typing. Replace it with a proper interface or type.

40 + box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
**Nice to Improve**: Consider moving colors into CSS variables for better maintainability.
```

---

## 📦 Build

```bash
npm run build
```

Compiled files will appear in `dist/`.

---

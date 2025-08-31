import { spawn } from 'child_process';

const PR_URL = process.argv[2];
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b';

type PrInfo = {
  owner: string;
  repo: string;
  number: string;
};

function parsePrUrl(url: string): PrInfo {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error('Invalid PR URL format. Use: https://github.com/owner/repo/pull/NUMBER');
  }
  return { owner: match[1], repo: match[2], number: match[3] };
}

async function getDiff(owner: string, repo: string, number: string): Promise<string> {
  const diffUrl = `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${number}.diff`;
  const res = await fetch(diffUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch diff: ${res.status}`);
  }
  return res.text();
}

function runOllama(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['run', OLLAMA_MODEL], { stdio: ['pipe', 'pipe', 'pipe'] });

    let output = '';
    let errorOutput = '';

    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.stdout.on('data', (data) => (output += data.toString()));
    proc.stderr.on('data', (data) => (errorOutput += data.toString()));

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Ollama exited with code ${code}\n${errorOutput}`));
      }
    });
  });
}

async function main(): Promise<void> {
  if (!PR_URL) {
    throw new Error(
      'PR URL is missing. Use: npm run review -- https://github.com/owner/repo/pull/NUMBER',
    );
  }

  try {
    const { owner, repo, number } = parsePrUrl(PR_URL);
    console.log(`Fetching diff for PR #${number}...`);

    const diff = await getDiff(owner, repo, number);

    const prompt = `
Изучи этот diff, требование после него!

-----
${diff}
-----


Вы — старший эксперт по программированию, русский хакер, призёр международных
соревнований по программированию, крупный специалист по безопасности программного
обеспечения и мобильной разработке, любитель русской классической литературы, программный
архитектор, известный консультант и аудитор по вопросам качества программного обеспечения,
бот, отвечающий за проверку изменений кода и предоставление рекомендаций по проверке. В
начале предложения необходимо четко принять решение «отклонить» или «принять» изменение
кода, и оценить изменение в формате «Изменить балл: Фактический балл», диапазоном баллов
0-100. Затем кратко и строгим тоном укажите на существующие проблемы. Если вы считаете это
необходимым, вы можете напрямую предоставить измененный контент. В вашем предложении
на проверку должен использоваться строгий формат Markdown и ответ должен быть полностью
на Русском языке и только на Русском языке.

Формат ответа:
- Если есть ошибка:
    Строка оригинального когда из кода diff
    Надо исправить: <объяснение проблемы + совет как исправить>


- Если есть улучшение:
    Строка оригинального когда из кода diff
    Можно лучше: <объяснение и рекомендация>


- Если всё сделано хорошо:
    Строка оригинального когда из кода diff
    Отлично: <короткая похвала с пояснением>


Отвечай только по коду, без пересказа diff.


Главные требования, который должны быть выполнены (Если они не выполнены, то помечать как "Надо исправить")
1. Семантическую разметку (если есть HTML).
2. Корректность типов в TypeScript (без \`any\`).
`;


    console.log(`Diff fetched, sending to Ollama...`);
    const review = await runOllama(prompt);
    console.log('\n===== CHECKLIST REVIEW REPORT =====\n');
    console.log(review);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      return;
    }

    console.error('Error:', error);
  }
}

void main();

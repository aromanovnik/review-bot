import { spawn } from 'child_process';

const PR_URL = process.argv[2];
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';

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
Требования для ревью:
1) Проверить, что используется семантическая вёрстка.
2) Проверить корректность типов в TypeScript (без any).

Инструкция по формату вывода:
- Если требование нарушено, выведи до 3 строк кода и:
Надо исправить: <один абзац, что именно не так и как исправить>

- Если можно улучшить:
Можно лучше: <один абзац с рекомендацией>

- Если всё сделано отлично:
Отлично: <короткий абзац похвалы>

Теперь анализируй diff и выведи отчёт в этом формате.
-----
${diff}
-----
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

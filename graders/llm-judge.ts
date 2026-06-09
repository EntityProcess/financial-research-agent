#!/usr/bin/env bun
import { readFileSync } from 'node:fs';

type Message = {
  readonly role?: string;
  readonly content?: unknown;
};

type JudgeAssertion = {
  readonly text: string;
  readonly passed: boolean;
  readonly evidence?: string;
};

type JudgeResult = {
  readonly score: number;
  readonly assertions?: readonly JudgeAssertion[];
  readonly details?: Record<string, unknown>;
};

type GraderConfig = {
  readonly prompt?: unknown;
  readonly input_object?: unknown;
  readonly config?: {
    readonly prompt?: unknown;
    readonly input_object?: unknown;
  } | null;
};

function readStdin(): string {
  return readFileSync(0, 'utf8');
}

function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function lastText(messages: readonly Message[] | null | undefined, role?: string): string {
  if (!messages) return '';
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (role && message.role !== role) continue;
    const text = textFromContent(message.content).trim();
    if (text) return text;
  }
  return '';
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function renderPrompt(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

function parseJudgeJson(rawText: string): JudgeResult {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Judge did not return JSON: ${rawText.slice(0, 500)}`);
  }

  const parsed = JSON.parse(match[0]) as Partial<JudgeResult>;
  const score = typeof parsed.score === 'number' ? parsed.score : undefined;
  if (score === undefined) {
    throw new Error(`Judge JSON did not include numeric score: ${rawText.slice(0, 500)}`);
  }

  const assertions = Array.isArray(parsed.assertions)
    ? parsed.assertions.flatMap((assertion): JudgeAssertion[] => {
        if (!assertion || typeof assertion !== 'object') return [];
        const raw = assertion as Record<string, unknown>;
        if (typeof raw.text !== 'string' || typeof raw.passed !== 'boolean') return [];
        return [
          {
            text: raw.text,
            passed: raw.passed,
            ...(typeof raw.evidence === 'string' ? { evidence: raw.evidence } : {}),
          },
        ];
      })
    : [];

  return {
    score,
    assertions,
    ...(parsed.details && typeof parsed.details === 'object' && !Array.isArray(parsed.details)
      ? { details: parsed.details as Record<string, unknown> }
      : {}),
  };
}

async function invokeJudge(prompt: string): Promise<string> {
  const proxyUrl = process.env.AGENTV_TARGET_PROXY_URL;
  const proxyToken = process.env.AGENTV_TARGET_PROXY_TOKEN;
  if (!proxyUrl || !proxyToken) {
    throw new Error('AgentV target proxy is not configured; set target.max_calls on this code-grader');
  }

  const response = await fetch(`${proxyUrl}/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${proxyToken}`,
    },
    body: JSON.stringify({
      question: prompt,
      systemPrompt:
        'You are a strict evaluation judge. Follow the user prompt exactly and return valid JSON only.',
    }),
  });

  if (!response.ok) {
    throw new Error(`Target proxy returned HTTP ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as { rawText?: string };
  return body.rawText ?? '';
}

async function main() {
  const payload = JSON.parse(readStdin()) as {
    readonly input?: readonly Message[];
    readonly expected_output?: readonly Message[];
    readonly output?: readonly Message[] | null;
    readonly config?: GraderConfig | null;
  };

  const promptTemplate = payload.config?.prompt ?? payload.config?.config?.prompt;
  if (typeof promptTemplate !== 'string' || !promptTemplate.trim()) {
    throw new Error('Missing config.prompt for LLM judge grader');
  }

  const actualAnswer = lastText(payload.output, 'assistant') || lastText(payload.output);
  const expectedAnswer =
    lastText(payload.expected_output, 'assistant') || lastText(payload.expected_output);
  const question = lastText(payload.input, 'user') || lastText(payload.input);
  const customInputObject = payload.config?.input_object ?? payload.config?.config?.input_object;
  const inputObject =
    customInputObject && typeof customInputObject === 'object'
      ? { ...(customInputObject as Record<string, unknown>), actual_answer: actualAnswer }
      : { question, expected_answer: expectedAnswer, actual_answer: actualAnswer };

  const prompt = renderPrompt(promptTemplate, {
    question,
    expected_answer: expectedAnswer,
    actual_answer: actualAnswer,
    input_object_json: stableJson(inputObject),
  });

  const rawJudge = await invokeJudge(prompt);
  const result = parseJudgeJson(rawJudge);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.log(
    JSON.stringify({
      score: 0,
      assertions: [
        {
          text: 'LLM judge grader failed',
          passed: false,
          evidence: error instanceof Error ? error.message : String(error),
        },
      ],
    }),
  );
});

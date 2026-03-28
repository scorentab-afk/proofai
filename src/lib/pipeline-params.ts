import type { NavigateFunction } from 'react-router-dom';

export const PIPELINE_KEYS = [
  'promptId',
  'executionId',
  'analysisId',
  'signatureId',
  'cognitiveHash',
  'bundleId',
] as const;

export type PipelineData = Partial<Record<(typeof PIPELINE_KEYS)[number], string>>;

export function readPipelineParams(searchParams: URLSearchParams): PipelineData {
  const data: PipelineData = {};
  for (const key of PIPELINE_KEYS) {
    const val = searchParams.get(key);
    if (val) data[key] = val;
  }
  return data;
}

export function isAutoRun(searchParams: URLSearchParams): boolean {
  return searchParams.get('autoRun') === 'true';
}

export function navigatePipeline(
  navigate: NavigateFunction,
  path: string,
  data: PipelineData,
  state?: Record<string, unknown>,
  delay = 1500,
) {
  const params = new URLSearchParams();
  params.set('autoRun', 'true');
  for (const [key, val] of Object.entries(data)) {
    if (val) params.set(key, val);
  }
  const url = `${path}?${params.toString()}`;
  setTimeout(() => navigate(url, { state }), delay);
}

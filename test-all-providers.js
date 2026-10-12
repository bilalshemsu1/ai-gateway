/**
 * Test Suite - Free LLM API Providers (Deep Search Test)
 *
 * Tests all free AI providers found during the deep search.
 *
 * Usage:
 *   node test-all-providers.js
 *
 * Requires API keys in .env.
 */

import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_TIMEOUT = 30000;

const DEFAULT_PROMPT = 'Hello, this is a test prompt. Please respond briefly.';

// Provider definitions - all free OpenAI-compatible APIs found in deep search
const PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    description: 'Fast inference on LPU hardware (existing provider)',
    isExisting: true,
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_NIM_API_KEY',
    models: ['kimi-k3', 'glm-5.3', 'gpt-oss-20b', 'deepseek-v4.1-flash'],
    description: 'Free open models via NVIDIA Developer Program',
    isExisting: false,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: ['gpt-oss-20b:free', 'llama-3.3-70b-versatile', 'deepseek-r1:free'],
    description: '20+ free models via single key, no credit card',
    isExisting: false,
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1',
    apiKeyEnv: 'CLOUDFLARE_API_TOKEN',
    models: ['@cf/meta/llama-3.2-3b-instruct', '@cf/qwen/qwen3-8b'],
    description: '36 free models, 10K neurons/day, edge network',
    isExisting: false,
  },
  zai: {
    id: 'zai',
    name: 'Z.AI Open Platform',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    apiKeyEnv: 'ZAI_API_KEY',
    models: ['GLM-4-0528', 'GLM-4-3x256k', 'glm-4.5-air'],
    description: 'GLM series, 128K+ context, selected models free',
    isExisting: false,
  },
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.com/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
    models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen3-8B', 'glm-4-9b'],
    description: '1000 RPM free tier, DeepSeek & Qwen models',
    isExisting: false,
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova Cloud',
    baseUrl: 'https://api.sambanova.ai/v1',
    apiKeyEnv: 'SAMBANOVA_API_KEY',
    models: ['Meta-Llama-3.3-70B-Instruct', 'Qwen3-32B'],
    description: '20 RPM, 20 RPD free tier',
    isExisting: false,
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    apiKeyEnv: 'COHERE_API_KEY',
    models: ['command-r7b-128k', 'command-r-plus-04-2025'],
    description: 'Compatibility endpoint, 20 RPM free tier',
    isExisting: false,
  },
  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face Inference Providers',
    baseUrl: 'https://router.huggingface.co/v1',
    apiKeyEnv: 'HF_TOKEN',
    models: ['Ternary-Bonsai-27B-gguf', 'meta-llama/Llama-3.2-3B-Instruct'],
    description: 'Small models, monthly credit free tier',
    isExisting: false,
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    models: ['mistral-small-2501', 'open-mistral-nemo'],
    description: 'Free tier with monthly credits, 5 requests/min',
    isExisting: false,
  },
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function httpRequest(url, method = 'GET', data = null, headers = {}) {
  const response = await axios({
    url,
    method,
    data,
    headers,
    timeout: API_TIMEOUT,
    validateStatus: status => status < 500,
  });
  return response;
}

function formatResult(providerId, result) {
  const p = PROVIDERS[providerId];
  const statusStr = result.status ? 'AVAILABLE' : 'UNAVAILABLE';
  const msg = [
    '  ' + (p ? p.name : providerId),
    '  Status: ' + statusStr,
    '  Model: ' + (result.model || 'none'),
    '  Latency: ' + (result.latencyMs ? result.latencyMs + 'ms' : 'N/A'),
    '  Output: ' + (result.output ? result.output.slice(0, 100) + (result.output.length > 100 ? '...' : '') : 'N/A'),
    '  HTTP: ' + (result.statusCode || 'N/A'),
    '  Rate: ' + (result.rateLimit || 'N/A'),
  ];
  return msg.join('\n');
}
async function testProvider(providerId, options) {
  const p = PROVIDERS[providerId];
  const result = {
    providerId: providerId,
    name: p.name,
    status: false,
    statusCode: null,
    latencyMs: null,
    model: null,
    output: null,
    rateLimit: null,
    error: null,
    warnings: [],
  };

  const apiKey = process.env[p.apiKeyEnv];

  if (!apiKey) {
    result.error = 'Missing env var ' + p.apiKeyEnv;
    result.warnings.push('Skipped - no API key');
    return result;
  }

  const testModel = options.model || p.models[0];
  const prompt = options.prompt || DEFAULT_PROMPT;
  const promptMessage = { role: 'user', content: prompt };

  // Step 1: Check availability via models endpoint
  try {
    const modelsUrl = new URL(p.baseUrl + '/models');
    const modelsResponse = await httpRequest(modelsUrl.toString(), 'GET', null, { Authorization: 'Bearer ' + apiKey });
    result.statusCode = modelsResponse.status;
    const modelList = modelsResponse.data ? modelsResponse.data.data : [];
    const availableModels = modelList.filter(function(m) { return p.models.indexOf(m.id || m) >= 0; });
    result.modelsAvailable = modelList.map(function(m) { return m.id || m; }).join(', ');
    if (availableModels.length > 0) { result.model = testModel; }
  } catch (error) {
    result.warnings.push('Models endpoint failed: ' + error.message);
  }

  // Step 2: Test chat completion
  try {
    const chatUrl = new URL(p.baseUrl + '/chat/completions');
    const requestBody = {
      model: testModel,
      messages: [promptMessage],
      max_tokens: 128,
      temperature: 0.7,
    };
    const startTime = Date.now();
    const chatResponse = await httpRequest(chatUrl.toString(), 'POST', requestBody, { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' });
    const endTime = Date.now();
    result.statusCode = chatResponse.status;
    result.latencyMs = endTime - startTime;
    result.output = chatResponse.data && chatResponse.data.choices ? chatResponse.data.choices[0].message.content : null;
    result.model = chatResponse.data && chatResponse.data.model ? chatResponse.data.model : testModel;
    result.status = true;
    if (chatResponse.headers && chatResponse.headers['x-ratelimit-remaining']) {
      result.rateLimit = 'Remaining: ' + chatResponse.headers['x-ratelimit-remaining'] + '/' + (chatResponse.headers['x-ratelimit-limit'] || 'N/A');
    }
  } catch (error) {
    result.error = error.message;
    if (error.response) {
      result.statusCode = error.response.status;
      if (error.response.data && error.response.data.error) {
        result.error += ' - ' + (error.response.data.error.message || JSON.stringify(error.response.data.error).slice(0, 200));
      }
    }
    result.warnings.push('Chat test failed: ' + error.message);
  }

  return result;
}

function parseArgs() {
  const args = {
    providers: Object.keys(PROVIDERS),
    model: null,
    prompt: null,
    count: 1,
    parallel: false,
    showHelp: false,
  };
  const argsArray = process.argv.slice(2);
  for (let i = 0; i < argsArray.length; i++) {
    const arg = argsArray[i];
    switch (arg) {
      case '--providers':
        args.providers = argsArray[++i] ? argsArray[i].split(',') : Object.keys(PROVIDERS);
        break;
      case '--model':
        args.model = argsArray[++i];
        break;
      case '--prompt':
        args.prompt = argsArray[++i];
        break;
      case '--count':
        args.count = parseInt(argsArray[++i], 10) || 1;
        break;
      case '--help':
      case '-h':
        args.showHelp = true;
        break;
    }
  }
  return args;
}

function printUsage() {
  console.log('');
  console.log('Test Suite - Free LLM API Providers (Deep Search Test)');
  console.log('=====================================================');
  console.log('');
  console.log('Usage: node test-all-providers.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --providers <ids>   Comma-separated provider IDs to test (default: all)');
  console.log('  --model <name>      Model name to test');
  console.log('  --prompt <text>     Custom prompt');
  console.log('  --count <n>         Number of test calls per provider (default: 1)');
  console.log('  --help, -h          Show this help');
  console.log('');
  console.log('Providers:');
  Object.keys(PROVIDERS).forEach(function(id) {
    console.log('  ' + id.padEnd(15) + ' ' + PROVIDERS[id].name.padEnd(25) + ' ' + PROVIDERS[id].description);
  });
}

async function runTests(args) {
  if (args.showHelp) {
    printUsage();
    return;
  }

  const providerIds = args.providers.filter(function(id) { return PROVIDERS[id]; });
  if (providerIds.length === 0) {
    console.error('No valid providers specified.');
    process.exit(1);
  }

  console.log('');
  console.log('=====================================================');
  console.log('  Free LLM API Providers Test Suite');
  console.log('  Date: ' + new Date().toISOString());
  console.log('=====================================================');
  console.log('  Providers: ' + providerIds.map(function(id) { return PROVIDERS[id].name; }).join(', '));
  console.log('  Model: ' + (args.model || '(default)'));
  console.log('  Prompt: ' + (args.prompt || DEFAULT_PROMPT));
  console.log('  Requests per provider: ' + args.count);
  console.log('=====================================================');
  console.log('');

  const results = [];
  const now = Date.now();

  for (const providerId of providerIds) {
    const p = PROVIDERS[providerId];
    console.log('');
    console.log('[' + providerId.toUpperCase() + '] Testing ' + p.name + '...');

    const providerResults = [];
    for (let i = 0; i < args.count; i++) {
      const result = await testProvider(providerId, { model: args.model, prompt: args.prompt });
      result.testIndex = i + 1;
      providerResults.push(result);

      const status = result.status ? 'PASS' : 'FAIL';
      const modelInfo = result.model ? ' [model: ' + result.model + ']' : '';
      console.log('  Attempt ' + (i + 1) + ': ' + status + ' ' + (result.statusCode || 'N/A') + 'ms' + modelInfo);
      if (result.error) {
        console.log('    Error: ' + result.error.slice(0, 150));
      }
    }

    const latest = providerResults[providerResults.length - 1];
    results.push({
      providerId: providerId,
      name: p.name,
      status: latest.status,
      statusCode: latest.statusCode,
      latencyMs: latest.latencyMs,
      model: latest.model,
      output: latest.output ? latest.output.slice(0, 100) : null,
      rateLimit: latest.rateLimit,
      error: latest.error,
      warnings: latest.warnings,
      allResults: providerResults,
    });

    console.log(formatResult(providerId, latest));
    if (latest.warnings.length > 0) {
      console.log('  Warnings: ' + latest.warnings.join('; '));
    }
  }

  const totalTime = Date.now() - now;
  console.log('');
  console.log('=====================================================');
  console.log('  SUMMARY');
  console.log('=====================================================');
  console.log('  Total providers tested: ' + results.length);
  console.log('  Available: ' + results.filter(function(r) { return r.status; }).length);
  console.log('  Unavailable: ' + results.filter(function(r) { return !r.status; }).length);
  console.log('  Total time: ' + totalTime + 'ms');

  const available = results.filter(function(r) { return r.status; });
  for (const r of available) {
    console.log('  Available: ' + r.name + ' (' + r.model + ', ' + r.latencyMs + 'ms)');
  }

  const unavailable = results.filter(function(r) { return !r.status; });
  for (const r of unavailable) {
    console.log('  Unavailable: ' + r.name + ' - ' + (r.error || 'unknown error'));
  }

  const outputFile = path.join(process.cwd(), 'test-results.json');
  try {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log('');
    console.log('  Results saved to: ' + outputFile);
  } catch (e) {
    console.log('  Could not save results: ' + e.message);
  }

  console.log('');
  console.log('=====================================================');
  console.log('');
  return results;
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

const args = parseArgs();
runTests(args).catch(function(error) {
  console.error('Fatal error: ' + error.message);
  process.exit(1);
});


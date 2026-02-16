/**
 * Mock API Server for E2E Tests
 * 
 * Simulates various LLM provider APIs for testing.
 * Supports both regular completions and streaming responses.
 */

import http from 'http';

const PORT = 3457; // Different port to avoid conflicts

// Mock fixtures for different providers
export const mockFixtures = {
  // OpenAI-style provider responses
  openai: {
    'gpt-4o': {
      id: 'chatcmpl-gpt4o-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4o',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello from GPT-4o!' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
    },
    'gpt-4o-mini': {
      id: 'chatcmpl-gpt4o-mini-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4o-mini',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello from GPT-4o Mini!' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    },
    'grok-3': {
      id: 'chatcmpl-grok-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'grok-3',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Response from Grok-3!' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 7, total_tokens: 17 },
    },
    'deepseek-v3': {
      id: 'chatcmpl-deepseek-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'deepseek-v3',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Response from DeepSeek V3!' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 9, total_tokens: 19 },
    },
  },
  // Anthropic-style provider responses
  anthropic: {
    'claude-sonnet-4': {
      id: 'msg_claude_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello from Claude Sonnet 4!' }],
      model: 'claude-sonnet-4-20250514',
      usage: { input_tokens: 10, output_tokens: 8 },
    },
    'claude-haiku-4': {
      id: 'msg_haiku_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello from Claude Haiku 4!' }],
      model: 'claude-haiku-4-20250514',
      usage: { input_tokens: 10, output_tokens: 5 },
    },
  },
  // Google-style provider responses
  google: {
    'gemini-2.5-flash': {
      candidates: [{
        content: { parts: [{ text: 'Hello from Gemini 2.5 Flash!' }] },
        finishReason: 'STOP',
      }],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 8,
        totalTokenCount: 18,
      },
    },
    'gemini-2.5-pro': {
      candidates: [{
        content: { parts: [{ text: 'Hello from Gemini 2.5 Pro!' }] },
        finishReason: 'STOP',
      }],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 12,
        totalTokenCount: 22,
      },
    },
  },
  // OpenCode-style provider responses (free models)
  opencode: {
    'big-pickle': {
      id: 'chatcmpl-opencode-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'big-pickle',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello from OpenCode big-pickle!' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
    },
  },
};

// Streaming chunks for different providers
const streamingChunks = {
  openai: [
    { id: 'chatcmpl-test', choices: [{ index: 0, delta: { role: 'assistant', content: 'Hello' }, finish_reason: null }] },
    { id: 'chatcmpl-test', choices: [{ index: 0, delta: { content: ' from' }, finish_reason: null }] },
    { id: 'chatcmpl-test', choices: [{ index: 0, delta: { content: ' GPT' }, finish_reason: null }] },
    { id: 'chatcmpl-test', choices: [{ index: 0, delta: { content: '-4o' }, finish_reason: null }] },
    { id: 'chatcmpl-test', choices: [{ index: 0, delta: { content: '!' }, finish_reason: 'stop' }] },
  ],
  anthropic: [
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' from' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' Claude!' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_stop', index: 0, usage: { output_tokens: 8 } },
  ],
  google: [
    { candidates: [{ content: { parts: [{ text: 'Hello' }] } }] },
    { candidates: [{ content: { parts: [{ text: ' from' }] } }] },
    { candidates: [{ content: { parts: [{ text: ' Gemini' }] } }] },
    { candidates: [{ content: { parts: [{ text: ' Flash!' }], inlineData: null }, finishReason: 'STOP', usageMetadata: { candidatesTokenCount: 8 } }] },
  ],
};

// Track server state
let requestLog: { path: string; method: string; body?: string }[] = [];

function createMockServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    
    // Log request
    let body = '';
    if (['POST', 'PUT'].includes(req.method || '')) {
      for await (const chunk of req) {
        body += chunk;
      }
    }
    requestLog.push({ path: url.pathname, method: req.method || 'GET', body });
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Handle health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', requestLog: requestLog.length }));
      return;
    }

    // Handle reset log
    if (url.pathname === '/reset-log') {
      requestLog = [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'reset' }));
      return;
    }

    // Handle OpenAI-style chat completions (non-streaming)
    if (url.pathname === '/v1/chat/completions') {
      const isStreaming = url.searchParams.get('stream') === 'true' || (body && JSON.parse(body).stream);
      
      if (isStreaming) {
        // Handle streaming response
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        
        const data = JSON.parse(body);
        const model = data.model || 'gpt-4o';
        
        // Determine which streaming chunks to use
        let chunks = streamingChunks.openai;
        if (model.includes('claude')) chunks = streamingChunks.anthropic;
        else if (model.includes('gemini')) chunks = streamingChunks.google;
        
        // Send chunks with delays
        let i = 0;
        const sendChunk = () => {
          if (i < chunks.length) {
            res.write(`data: ${JSON.stringify(chunks[i])}\n\n`);
            i++;
            setTimeout(sendChunk, 10);
          } else {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        };
        sendChunk();
        return;
      }
      
      // Non-streaming response
      try {
        const data = JSON.parse(body);
        const model = data.model || 'gpt-4o';
        
        // Find matching mock response
        let response = mockFixtures.openai[model as keyof typeof mockFixtures.openai];
        if (!response) {
          // Try other providers
          response = mockFixtures.openai['gpt-4o'];
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
      return;
    }

    // Handle Anthropic messages
    if (url.pathname === '/v1/messages') {
      const isStreaming = url.searchParams.get('stream') === 'true' || (body && JSON.parse(body).stream);
      
      if (isStreaming) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        
        let i = 0;
        const sendChunk = () => {
          if (i < streamingChunks.anthropic.length) {
            res.write(`data: ${JSON.stringify(streamingChunks.anthropic[i])}\n\n`);
            i++;
            setTimeout(sendChunk, 10);
          } else {
            res.end();
          }
        };
        sendChunk();
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockFixtures.anthropic['claude-sonnet-4']));
      return;
    }

    // Handle Google Gemini
    if (url.pathname.includes('/models/') && url.pathname.includes(':generateContent')) {
      const isStreaming = url.searchParams.get('alt') === 'sse' || (body && JSON.parse(body).stream);
      
      if (isStreaming) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        
        let i = 0;
        const sendChunk = () => {
          if (i < streamingChunks.google.length) {
            res.write(`data: ${JSON.stringify(streamingChunks.google[i])}\n\n`);
            i++;
            setTimeout(sendChunk, 10);
          } else {
            res.end();
          }
        };
        sendChunk();
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockFixtures.google['gemini-2.5-flash']));
      return;
    }

    // Handle OpenCode completions
    if (url.pathname === '/chat/completions') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockFixtures.opencode['big-pickle']));
      return;
    }

    // Default: return generic success
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });

  return server;
}

let serverInstance: http.Server | null = null;

export function startMockServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (serverInstance) {
      resolve(PORT);
      return;
    }
    
    serverInstance = createMockServer();
    serverInstance.listen(PORT, () => {
      console.log(`Mock server running on port ${PORT}`);
      resolve(PORT);
    });
    
    serverInstance.on('error', (err) => {
      reject(err);
    });
  });
}

export function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        serverInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getRequestLog() {
  return requestLog;
}

export function resetRequestLog() {
  requestLog = [];
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMockServer().then(() => {
    console.log('Press Ctrl+C to stop');
  });
}

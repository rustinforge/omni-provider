/**
 * Mock API Server for E2E Tests
 * 
 * Simulates various LLM provider APIs for testing.
 */

import http from 'http';

const PORT = 3456;

const mockResponses: Record<string, object> = {
  'gpt-4o': {
    id: 'chatcmpl-test',
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
  'claude-sonnet-4': {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'Hello from Claude!' }],
    model: 'claude-sonnet-4-20250514',
    usage: { input_tokens: 10, output_tokens: 8 },
  },
  'gemini-2.5-flash': {
    candidates: [{
      content: { parts: [{ text: 'Hello from Gemini!' }] },
      finishReason: 'STOP',
    }],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 8,
      totalTokenCount: 18,
    },
  },
};

function createMockServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Handle chat completions
    if (url.pathname === '/v1/chat/completions') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      
      try {
        const data = JSON.parse(body);
        const model = data.model || 'gpt-4o';
        
        // Return mock response based on model
        const response = mockResponses[model] || mockResponses['gpt-4o'];
        
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
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResponses['claude-sonnet-4']));
      return;
    }

    // Handle Google Gemini
    if (url.pathname.includes('/models/')) {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResponses['gemini-2.5-flash']));
      return;
    }

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200);
      res.end('OK');
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return server;
}

export function startMockServer(): Promise<number> {
  return new Promise((resolve) => {
    const server = createMockServer();
    server.listen(PORT, () => {
      console.log(`Mock server running on port ${PORT}`);
      resolve(PORT);
    });
  });
}

export function stopMockServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMockServer().then(() => {
    console.log('Press Ctrl+C to stop');
  });
}

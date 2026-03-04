'use client';

import { useState, useEffect, useRef } from 'react';

interface VisualizationProps {
  code: string;
}

export function Visualization({ code }: VisualizationProps) {
  const [showCode, setShowCode] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (code && !showCode) {
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }
    .chart-container {
      max-width: 800px;
      margin: 0 auto;
      background: #1e293b;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    h2 {
      text-align: center;
      margin-bottom: 20px;
      color: #60a5fa;
    }
    canvas {
      max-height: 400px !important;
    }
  </style>
</head>
<body>
  <div class="chart-container">
    ${code}
  </div>
</body>
</html>`;
      setHtmlContent(fullHtml);
    }
  }, [code, showCode]);

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden mt-2">
      <div className="flex items-center justify-between bg-slate-800 px-3 py-2">
        <span className="text-xs text-slate-400">Visualization</span>
        <button
          onClick={() => setShowCode(!showCode)}
          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
        >
          {showCode ? 'Show Preview' : 'Show Code'}
        </button>
      </div>
      
      {showCode ? (
        <pre className="bg-slate-900 p-3 overflow-x-auto text-xs text-green-400 max-h-96">
          <code>{code}</code>
        </pre>
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className="w-full h-80 bg-slate-900"
          sandbox="allow-scripts"
          title="Visualization"
        />
      )}
    </div>
  );
}

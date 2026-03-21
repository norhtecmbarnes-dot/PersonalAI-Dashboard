'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
  type?: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie';
}

export function MermaidDiagram({ code, type = 'flowchart' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
        diagramMarginX: 50,
        diagramMarginY: 10,
      },
      securityLevel: 'loose',
    });

    const generateDiagram = async () => {
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
      }
    };

    if (code) {
      generateDiagram();
    }
  }, [code]);

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <p className="text-red-400 text-sm mb-2">Diagram Error:</p>
        <pre className="text-red-300 text-xs overflow-auto">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container bg-slate-800 rounded-lg p-4 overflow-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

interface TableToMermaidOptions {
  tableType?: 'flowchart' | 'sequence' | 'state';
  sourceColumn?: number;
  targetColumn?: number;
  labelColumn?: number;
}

export function tableToMermaid(tableData: string[][], options: TableToMermaidOptions = {}): string {
  const { tableType = 'flowchart', sourceColumn = 0, targetColumn = 1, labelColumn = 2 } = options;

  if (tableData.length < 2) return '';

  const headers = tableData[0];
  const rows = tableData.slice(1);

  switch (tableType) {
    case 'flowchart':
      return rowsToFlowchart(rows, sourceColumn, targetColumn, labelColumn);
    case 'sequence':
      return rowsToSequence(rows);
    case 'state':
      return rowsToState(rows);
    default:
      return rowsToFlowchart(rows, sourceColumn, targetColumn, labelColumn);
  }
}

function rowsToFlowchart(
  rows: string[][],
  sourceCol: number,
  targetCol: number,
  labelCol: number
): string {
  const lines = ['flowchart TD'];
  const nodes = new Set<string>();
  const processedNodes = new Set<string>();

  rows.forEach(row => {
    const source = row[sourceCol]?.trim();
    const target = row[targetCol]?.trim();
    const label = labelCol !== undefined ? row[labelCol]?.trim() : '';

    if (source && target) {
      nodes.add(source);
      nodes.add(target);
    }
  });

  nodes.forEach(node => {
    const safeNode = node.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!processedNodes.has(safeNode)) {
      lines.push(`    ${safeNode}["${node}"]`);
      processedNodes.add(safeNode);
    }
  });

  rows.forEach(row => {
    const source = row[sourceCol]?.trim();
    const target = row[targetCol]?.trim();
    const label = labelCol !== undefined ? row[labelCol]?.trim() : '';

    if (source && target) {
      const safeSource = source.replace(/[^a-zA-Z0-9_]/g, '_');
      const safeTarget = target.replace(/[^a-zA-Z0-9_]/g, '_');
      const arrow = label ? `--${label}-->` : `-->`;
      lines.push(`    ${safeSource} ${arrow} ${safeTarget}`);
    }
  });

  return lines.join('\n');
}

function rowsToSequence(rows: string[][]): string {
  const lines = ['sequenceDiagram'];
  const participants = new Set<string>();

  rows.forEach(row => {
    if (row.length >= 2) {
      participants.add(row[0]?.trim());
      participants.add(row[1]?.trim());
    }
  });

  participants.forEach(p => {
    lines.push(`    participant ${p}`);
  });

  rows.forEach(row => {
    if (row.length >= 3) {
      const from = row[0]?.trim();
      const to = row[1]?.trim();
      const message = row[2]?.trim();
      if (from && to && message) {
        lines.push(`    ${from}->>${to}: ${message}`);
      }
    }
  });

  return lines.join('\n');
}

function rowsToState(rows: string[][]): string {
  const lines = ['stateDiagram-v2'];
  const states = new Set<string>();
  const transitions: Array<{ from: string; to: string; label?: string }> = [];

  rows.forEach(row => {
    if (row.length >= 2) {
      const from = row[0]?.trim();
      const to = row[1]?.trim();
      const label = row[2]?.trim();
      if (from && to) {
        states.add(from);
        states.add(to);
        transitions.push({ from, to, label });
      }
    }
  });

  states.forEach(state => {
    const safeState = state.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`    ${safeState} : ${state}`);
  });

  transitions.forEach(t => {
    const safeFrom = t.from.replace(/[^a-zA-Z0-9_]/g, '_');
    const safeTo = t.to.replace(/[^a-zA-Z0-9_]/g, '_');
    const arrow = t.label ? `--${t.label}-->*` : '-->*';
    lines.push(`    ${safeFrom} ${arrow} ${safeTo}`);
  });

  return lines.join('\n');
}

export function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n');
  return lines.map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

export function parseTableHTML(html: string): string[][] {
  const rows: string[][] = [];
  const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  trMatches.forEach(tr => {
    const cells: string[] = [];
    const tdMatches = tr.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    tdMatches.forEach(td => {
      const content = td
        .replace(/<td[^>]*>/, '')
        .replace(/<\/td>/gi, '')
        .trim();
      cells.push(content);
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  return rows;
}

export const MERMAID_PROMPTS = {
  flowchart: `Create a flowchart diagram from the following data. Return ONLY valid Mermaid flowchart code.

Data:
{data}

Format: Use "flowchart TD" for top-down, "flowchart LR" for left-right.
Use ["text"] for process nodes, (("text")) for circular nodes, {["text"]} for diamond decisions.

Example:
flowchart TD
    A["Start"] --> B["Process"]
    B --> C{"Decision?"}
    C -->|Yes| D["End"]
    C -->|No| B

Return ONLY the Mermaid code, no explanation.`,

  sequence: `Create a sequence diagram from the following data. Return ONLY valid Mermaid sequence diagram code.

Data:
{data}

Format:
sequenceDiagram
    participant A as Actor/Role 1
    participant B as Actor/Role 2
    A->>B: Message
    B-->>A: Response

Return ONLY the Mermaid code, no explanation.`,

  state: `Create a state diagram from the following data. Return ONLY valid Mermaid state diagram code.

Data:
{data}

Format:
stateDiagram-v2
    State1 : State 1
    State2 : State 2
    State1 --> State2 : Transition

Return ONLY the Mermaid code, no explanation.`,
};

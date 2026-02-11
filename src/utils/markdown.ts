import { remark } from 'remark';
import remarkParse from 'remark-parse';
import stripMarkdown from 'strip-markdown';
import chalk from 'chalk';

interface MarkdownNode {
  type: string;
  children?: MarkdownNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  lang?: string;
}

// Parse markdown to AST
function parseMarkdown(content: string): MarkdownNode {
  const processor = remark().use(remarkParse);
  return processor.parse(content) as unknown as MarkdownNode;
}

// Render AST to styled terminal output
function renderNode(node: MarkdownNode, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  
  switch (node.type) {
    case 'root':
      return (node.children || []).map((child) => renderNode(child, indent)).join('\n');
    
    case 'heading': {
      const text = renderChildren(node, indent);
      const headingColors = [
        chalk.bold.yellow,
        chalk.bold.cyan,
        chalk.bold.magenta,
        chalk.bold.blue,
        chalk.bold.green,
        chalk.bold.white,
      ];
      const colorFn = headingColors[Math.min((node.depth || 1) - 1, 5)];
      const prefix = '#'.repeat(node.depth || 1) + ' ';
      return colorFn(prefix + text);
    }
    
    case 'paragraph':
      return indentStr + renderChildren(node, indent);
    
    case 'text':
      return node.value || '';
    
    case 'strong':
      return chalk.bold(renderChildren(node, indent));
    
    case 'emphasis':
      return chalk.italic(renderChildren(node, indent));
    
    case 'inlineCode':
      return chalk.bgGray.white(` ${node.value} `);
    
    case 'code': {
      const lang = node.lang ? chalk.dim(`[${node.lang}]`) : '';
      const codeContent = (node.value || '')
        .split('\n')
        .map((line) => chalk.bgGray.white('  ' + line + '  '))
        .join('\n');
      return lang + '\n' + codeContent;
    }
    
    case 'blockquote': {
      const content = renderChildren(node, indent);
      return content
        .split('\n')
        .map((line) => chalk.dim('│ ') + chalk.italic(line))
        .join('\n');
    }
    
    case 'list': {
      const items = node.children || [];
      return items
        .map((item, i) => {
          const prefix = node.ordered
            ? chalk.cyan(`${(node.start || 1) + i}. `)
            : chalk.cyan('• ');
          return indentStr + prefix + renderChildren(item, indent);
        })
        .join('\n');
    }
    
    case 'listItem':
      return renderChildren(node, indent);
    
    case 'link': {
      const text = renderChildren(node, indent);
      return chalk.underline.blue(text);
    }
    
    case 'image':
      return chalk.dim(`[Image: ${node.value || 'image'}]`);
    
    case 'thematicBreak':
      return chalk.dim('─'.repeat(40));
    
    case 'break':
      return '\n';
    
    default:
      return renderChildren(node, indent);
  }
}

function renderChildren(node: MarkdownNode, indent: number): string {
  if (!node.children) return node.value || '';
  return node.children.map((child) => renderNode(child, indent)).join('');
}

// Main function to render markdown to terminal
export function renderMarkdown(content: string): string {
  try {
    const ast = parseMarkdown(content);
    return renderNode(ast);
  } catch {
    // Fallback to plain text if parsing fails
    return content;
  }
}

// Strip markdown for preview/search
export async function stripMarkdownContent(content: string): Promise<string> {
  try {
    const result = await remark().use(stripMarkdown).process(content);
    return String(result);
  } catch {
    return content;
  }
}

// Truncate text for preview
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

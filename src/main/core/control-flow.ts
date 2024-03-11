import {
  parse,
  ControlFlowGraph,
  Block,
  printNode,
  RETURN,
  PASS,
  Module,
  Def,
  walk,
  DEF,
  MODULE,
} from '@msrvida/python-program-analysis';
import { ipcMain } from 'electron';

import { Link } from '../../interface';
import { IpcEvents } from '../../ipc-events';

export function idGenerator(max: number) {
  return (id1: number, id2: number) => max * id1 + id2;
}

export function hasReturn(block: Block) {
  return block.statements.some((s) => s.type === RETURN);
}

export function readBlocks(ast: Module): [Block[], Map<number, Link>] {
  const cfg = new ControlFlowGraph(ast);
  const { blocks } = cfg;
  const id = idGenerator(blocks.length);
  const conn: Map<number, Link> = new Map();
  blocks.forEach((block) => {
    if (hasReturn(block)) return;
    const successors = cfg.getSuccessors(block);
    if (successors.length === 1) {
      conn.set(id(block.id, successors[0].id), {
        from: block.id,
        to: successors[0].id,
      });
    } else if (successors.length === 2) {
      const [yes, no] = successors;
      conn.set(id(block.id, yes.id), {
        from: block.id,
        to: yes.id,
        label: 'yes',
      });
      // fix the else parsing bug, else only has one successor
      if (block.hint !== 'else cond')
        conn.set(id(block.id, no.id), {
          from: block.id,
          to: no.id,
          label: 'no',
        });
    } else if (successors.length > 2) throw new Error('more than 2 successors');
  });

  // 1. delete blank block
  // 1.1 find blank block
  const blankBlocks = blocks.filter(
    (b) =>
      b.statements.length === 0 &&
      b.hint !== 'conditional join' &&
      b.hint !== 'entry' &&
      b.hint !== 'while loop join',
  );
  // 1.2 reconnect the connections
  // blank block has only one successor, or throw error
  blankBlocks.forEach((b) => {
    const pre = cfg.getPredecessors(b);
    const suc = cfg.getSuccessors(b);
    if (suc.length > 1)
      throw new Error('blank block has more than 1 successor');
    if (suc.length === 0) return;
    pre.forEach((p) => {
      const conn1 = conn.get(id(p.id, b.id));
      if (conn1) conn1.to = suc[0].id;
    });
    // 1.3 delete old connections
    conn.delete(id(b.id, suc[0].id));
  });
  // 1.4 delete blank block
  blankBlocks.forEach((b) => {
    const index = blocks.indexOf(b);
    if (index > -1) blocks.splice(index, 1);
  });

  // 2. deal with else block
  // 2.1 find else block
  const elseBlocks = blocks.filter((b) => b.hint === 'else cond');
  // 2.2 reconnect the connections
  elseBlocks.forEach((b) => {
    const pre = cfg.getPredecessors(b);
    const suc = cfg.getSuccessors(b);
    if (pre.length !== 1)
      throw new Error('else block has more than 1 preccessor');
    const conn1 = conn.get(id(pre[0].id, b.id));
    if (conn1) {
      conn1.to = suc[0].id;
      console.log('conn1', conn1);
    }

    // 2.3 delete old connections
    conn.delete(id(b.id, suc[0].id));
  });
  // 2.4 delete else block
  elseBlocks.forEach((b) => {
    const index = blocks.indexOf(b);
    if (index > -1) blocks.splice(index, 1);
  });

  return [blocks, conn];
}

export function getShape(hint: string, isBlank: boolean, isStart: boolean) {
  if (isBlank || isStart) return ['((', '))'];
  switch (hint) {
    case 'if cond':
    case 'elif cond':
    case 'while loop head':
    case 'for loop head':
      return ['{', '}'];
    default:
      return ['[', ']'];
  }
}

export function toMermaid(blocks: Block[], conn: Link[]): string {
  const nodes = blocks.map((b) => {
    const str =
      b.statements
        .map(
          (s) =>
            `${s.location?.first_line}: ${
              s.type === PASS ? 'pass' : printNode(s)
            }`,
        )
        .join('\n')
        .replace(/"/g, '#quot;')
        .replace(/</g, ' < ') || (b.hint === 'entry' ? 'Start' : ' ');
    const [start, end] = getShape(b.hint, str === ' ', str === 'Start');
    return `  BLOCK_${b.id}${start}"\`${
      b.hint === 'for loop head' ? '(for loop)\n' : ''
    }${str}\`"${end}`;
  });

  const edges = conn.map((c) => {
    return `  BLOCK_${c.from} -->${c.label ? `|${c.label}|` : ''} BLOCK_${
      c.to
    }`;
  });
  return `flowchart TD\n${nodes.join('\n')}\n${edges.join('\n')}`;
}

export function findFunctionAtLine(code: string, line: number): Module {
  const funcs: Def[] = [];
  const ast = parse(code);
  walk(ast, {
    onEnterNode: (node) => {
      if (node.type === DEF && node.location!.first_line === line) {
        funcs.push(node);
      }
    },
  });
  if (funcs.length > 1)
    throw new Error('more than one function at the same line');
  if (funcs.length === 1) {
    return {
      type: MODULE,
      code: funcs[0].code,
      location: funcs[0].location,
    };
  }
  return ast;
}

export function getMermaid(code: string, funcLine: number) {
  const ast = findFunctionAtLine(code, funcLine);
  const [blocks, conn] = readBlocks(ast);
  const connArray = Array.from(conn.values());
  return toMermaid(blocks, connArray);
}

export function setupControlFlow() {
  ipcMain.handle(
    IpcEvents.CONTROL_FLOW,
    (_event, code: string, line: number) => {
      try {
        return getMermaid(code, line);
      } catch (e) {
        return '';
      }
    },
  );
}

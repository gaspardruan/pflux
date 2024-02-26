import { ipcMain } from 'electron';
import {
  parse,
  SyntaxNode,
  Def,
  DEF,
  Class,
  CLASS,
  printNode,
  Parameter,
  walk,
  Argument,
  DECORATE,
  ASSIGN,
  Module,
  NAME,
  DOT,
} from '@msrvida/python-program-analysis';

import { IpcEvents } from '../../ipc-events';
import { StructNodeInfo, NodeType } from '../../interface';

// The package has a bug, so we need to fix the name of the parameter
interface FixParamName {
  name: string;
}

// 如果参数是对象并且有name属性，返回name属性
function fixParamName(_name: string | FixParamName) {
  return typeof _name === 'object' &&
    Object.prototype.hasOwnProperty.call(_name, 'name')
    ? _name.name
    : _name;
}

function printParam(param: Parameter) {
  return (
    (param.star ? '*' : '') +
    (param.starstar ? '**' : '') +
    (param.star || param.starstar ? fixParamName(param.name) : param.name) +
    (param.default_value ? `=${printNode(param.default_value)}` : '') +
    (param.anno ? printNode(param.anno) : '')
  );
}

function printExtend(extend: SyntaxNode | Argument) {
  if (extend.type === 'arg') {
    return printNode(extend.actual);
  }
  console.log('Error: parse class extend');
  return printNode(extend as SyntaxNode);
}

function getClassSignature(node: Class) {
  return (
    node.name +
    (node.extends ? `(${node.extends.map(printExtend).join(', ')})` : '')
  );
}

function getFuncSignature(node: Def) {
  return `${node.name}(${node.params.map(printParam).join(', ')})`;
}

function getRange(node: SyntaxNode) {
  return {
    startLineNumber: node.location?.first_line || 1,
    startColumn: (node.location?.first_column || 0) + 1,
    endLineNumber: node.location?.last_line || 1,
    endColumn: (node.location?.last_column || 0) + 1,
  };
}

/**
 * Assuming that the node is a function
 * @param {Def} func
 * @returns {Array<StructNodeInfo>}
 */
function parseFunction(func: Def): Array<StructNodeInfo> {
  const result: Array<StructNodeInfo> = [];

  // 递归解析函数体
  const functionBody = func.code;
  functionBody.forEach((node) => {
    if (node.type === DEF) {
      result.push({
        type: 'function',
        text: getFuncSignature(node),
        code: parseFunction(node),
        range: getRange(node),
      });
    }
  });
  return result;
}

function getClassAttrInFunction(func: Def, attrs: Map<string, StructNodeInfo>) {
  const findAttr = (n: SyntaxNode) => {
    if (n.type === ASSIGN) {
      n.targets.forEach((target) => {
        if (
          target.type === DOT &&
          target.value.type === NAME &&
          !attrs.has(target.name)
        ) {
          attrs.set(target.name, {
            type: 'attribute',
            text: target.name,
            code: [],
            range: getRange(target),
          });
        }
      });
    }
  };
  walk(func, { onEnterNode: findAttr });
}

/**
 * Assuming that the node is a class
 * @param {Class} node
 * @returns {Array<StructNodeInfo>}
 */
function parseClass(c: Class): Array<StructNodeInfo> {
  const result: Array<StructNodeInfo> = [];
  const functions: Array<StructNodeInfo> = [];
  const attrs: Map<string, StructNodeInfo> = new Map();

  const classBody = c.code;

  classBody.forEach((node) => {
    if (node.type === DEF) {
      functions.push({
        type: 'method',
        text: getFuncSignature(node),
        code: parseFunction(node),
        range: getRange(node),
      });
      getClassAttrInFunction(node, attrs);
    } else if (node.type === DECORATE) {
      const functionDef = node.def;
      if (functionDef.type !== DEF) {
        console.log('Error: parse decorate');
        return;
      }

      let type: NodeType = 'method';

      if (
        node.decorators.some((decorator) => decorator.decorator === 'property')
      ) {
        type = 'property';
      }
      functions.push({
        type,
        text: getFuncSignature(functionDef),
        code: parseFunction(functionDef),
        range: getRange(functionDef),
      });
      getClassAttrInFunction(functionDef, attrs);
    } else if (node.type === ASSIGN) {
      node.targets.forEach((target) => {
        if (target.type === NAME) {
          if (!attrs.has(target.id)) {
            attrs.set(target.id, {
              type: 'attribute',
              text: target.id,
              code: [],
              range: getRange(node),
            });
          }
        }
      });
    }
  });
  result.push(...functions);

  // 将attrs按照key排序加入result
  const keys = Array.from(attrs.keys()).sort();
  keys.forEach((key) => {
    result.push(attrs.get(key) as StructNodeInfo);
  });

  return result;
}

function parseModule(m: Module): Array<StructNodeInfo> {
  const result: Array<StructNodeInfo> = [];

  m.code.forEach((node) => {
    if (node.type === DEF) {
      result.push({
        type: 'function',
        text: getFuncSignature(node),
        code: parseFunction(node),
        range: getRange(node),
      });
    } else if (node.type === CLASS) {
      result.push({
        type: 'class',
        text: getClassSignature(node),
        code: parseClass(node),
        range: getRange(node),
      });
    } else if (node.type === ASSIGN) {
      node.targets.forEach((target) => {
        if (target.type === 'name') {
          result.push({
            type: 'variable',
            text: target.id,
            code: [],
            range: getRange(node),
          });
        }
      });
    }
  });
  return result;
}

export function parseStruct(file: string): Array<StructNodeInfo> {
  // 处理错误
  try {
    const tree = parse(file);
    return parseModule(tree as Module);
  } catch (e) {
    return [];
  }
}

export function setupStructParse() {
  ipcMain.handle(IpcEvents.PARSE_STRUCT, (_event, code: string) => {
    return parseStruct(code);
  });
}

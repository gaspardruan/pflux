export function parseFuncSignature(funcSignature: string): string[] {
  return funcSignature
    .split('(')[1]
    .split(')')[0]
    .split(',')
    .map((param) => param.trim())
    .filter((param) => param !== '');
}

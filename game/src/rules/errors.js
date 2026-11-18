// 规则校验错误：带稳定的 code，UI 可以按 code 定位到具体表单字段。
export class RulesError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RulesError';
    this.code = code;
    this.details = details;
  }
}

export function fail(code, message, details) {
  throw new RulesError(code, message, details);
}

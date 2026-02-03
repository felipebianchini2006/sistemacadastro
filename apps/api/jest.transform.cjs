const ts = require('typescript');

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  sourceMap: true,
  inlineSources: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  esModuleInterop: true,
};

module.exports = {
  process(sourceText, sourcePath) {
    if (sourcePath.endsWith('.ts') || sourcePath.endsWith('.tsx')) {
      const result = ts.transpileModule(sourceText, {
        compilerOptions,
        fileName: sourcePath,
      });
      return {
        code: result.outputText,
        map: result.sourceMapText || undefined,
      };
    }
    return { code: sourceText };
  },
};

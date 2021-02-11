
export const isTestFile = (file = ''): string | boolean =>
/\.test/gi.test(file) ? "Test" : false;

export const isDefinitionFile = (file = ''): string | boolean =>
/\.d\./gi.test(file) ? "Test" : false;

export const flattenArrayDeep = (nestedArray: any[]): any[] =>
  nestedArray.reduce(
    (prev, current) =>
      Array.isArray(current)
        ? [...prev, ...flattenArrayDeep(current)]
        : [...prev, current],
    []
  );

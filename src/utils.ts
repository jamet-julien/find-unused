
type CheckProps = {
    ext?: string;
    file?: string;
}

export const isTestFile = ({ file = '' }:CheckProps): string | boolean =>
/\.test/gi.test(file) ? "Test" : false;

export const isComponentFile = ({ ext = '' }:CheckProps): string | boolean =>
[".jsx", ".tsx"].includes(ext) ? "React component" : false;

export const isStyleFile = ({ ext = '' }:CheckProps): string | boolean =>
[".less", ".css"].includes(ext) ? "Style" : false;

export const isScriptFile = ({ ext = '' }:CheckProps): string | boolean =>
[".ts", ".js"].includes(ext) ? "Script" : false;
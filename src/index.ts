import chalk = require("chalk");
import * as fs from "fs";
import * as path from "path";
import * as inquirer from "inquirer";

import { isTestFile, flattenArrayDeep, isDefinitionFile } from "./utils";
import Base from "./base";

class FindUnused extends Base {
    static description = "Find all components never used by your app";
    public extBetter = ".tsx";
    public listBuffer: any[] = [];
    public wasAnalysted: string[] = [];
    public fileUsedList = {};
    public rootFolder = "";
    public statReport = {
        allFile: 0,
        unusedFile: 0,
    };

    async run() {
        const response = await inquirer.prompt([
            {
                default: "src",
                message: "Whats your root folder name ?",
                name: "rootFolder",
                type: "input",
            },
            {
                default: "index.tsx",
                message: "Whats your file main ?",
                name: "mainFile",
                type: "input",
            },
        ]);

        const files = fs.readdirSync(this.startPath);
        this.rootFolder = response.rootFolder;

        if (files.includes(this.rootFolder)) {
            const startFileInfo = {
                file: response.mainFile,
                dir: path.join(this.startPath, this.rootFolder),
                exports: [],
            };

            this.listBuffer.push(startFileInfo);

            this.startAnalyze();
        } else {
            console.log("Launch command on root folder !");
        }
    }

    startAnalyze() {
        const filesUsed = this.analyzeFileChain();
        this.createUnusedReport(filesUsed);
    }

    createUnusedReport(filesUsed = []) {
        fs.writeFile(
            "./unusedreport.txt",
            this.filtreAndExtract(filesUsed)
                .map((f) => f.replace(this.startPath, "."))
                .join("\n"),
            (err) =>
                err
                    ? console.warn(err)
                    : console.log(
                          `
    ----------------------------
    | All files    = ${chalk.yellow(this.statReport.allFile)}
    | Unused files = ${chalk.green(this.statReport.unusedFile)}
    ----------------------------
          `
                      )
        );
    }

    filtreAndExtract(filesUsed = []) {
        const allFile = flattenArrayDeep(
            this.listFile(path.join(this.startPath, this.rootFolder))
        );

        const fileUsed = Object.keys(filesUsed);
        const unusedFile = allFile.filter(
            (f) =>
                !fileUsed.includes(f) && !isTestFile(f) && !isDefinitionFile(f)
        );

        this.statReport.allFile = allFile.length;
        this.statReport.unusedFile = unusedFile.length;

        return unusedFile;
    }

    listFile(dir: string): any[] {
        const nestedArray = fs.readdirSync(dir).map((file: string) => {
            const dirPath = path.join(dir, file);
            const result = fs.statSync(dirPath).isDirectory()
                ? this.listFile(dirPath)
                : dirPath;

            return result;
        });
        return nestedArray;
    }

    prepareToBuffer({ pathProject = "", exports = [] }) {
        const arrPath = pathProject.split("/");

        const file = arrPath.pop() || "";
        arrPath.shift();
        const dirFile = path.join.apply(path, arrPath);
        const dir = path.join(this.startPath, this.rootFolder, dirFile);

        return {
            file,
            dir,
            exports,
        };
    }

    analyzeFileChain(): any {
        let output = [];
        let currentFile;

        while ((currentFile = this.listBuffer.pop())) {
            const { file = "", dir = "" } = currentFile;

            const info = this.findFileInfo({ file, dir });

            this.wasAnalysted.push(path.join(dir, file));

            const importFiles = this.analyzeImport({
                dir: info.dir,
                file: info.base,
            });

            const imports = importFiles.reduce(
                (g, { pathProject, exports }): any => {
                    if (pathProject) {
                        const cleaned = this.prepareToBuffer({
                            pathProject,
                            exports,
                        });

                        if (
                            !this.wasAnalysted.includes(
                                path.join(cleaned.dir, cleaned.file)
                            )
                        ) {
                            this.listBuffer.push(cleaned);
                            return [...g, cleaned];
                        }
                    }

                    return g;
                },
                []
            );

            output.push({ file: info.base, dir: info.dir, imports });
        }
        return this.cleanOutPut(output);
    }

    cleanOutPut(output: any) {
        let cleanedOutPut: Record<string, any> = {};

        output
            .reverse()
            .map(
                ({
                    file = "",
                    dir = "",
                    imports = [],
                }: {
                    file: string;
                    dir: string;
                    imports: any[];
                }) => {
                    const info = this.findFileInfo({ dir, file });
                    const name = path.join(info.dir, info.base);

                    if (!cleanedOutPut[name]) {
                        cleanedOutPut[name] = { use: [] };
                    }

                    imports.map(
                        ({
                            dir = "",
                            file = "",
                            exports = [],
                        }: {
                            file: string;
                            dir: string;
                            exports: any[];
                        }) => {
                            const info = this.findFileInfo({ dir, file });
                            const name = path.join(info.dir, info.base);

                            if (cleanedOutPut[name]) {
                                cleanedOutPut[name] = {
                                    ...cleanedOutPut[name],
                                    use: [
                                        ...cleanedOutPut[name].use,
                                        ...exports,
                                    ],
                                };
                            }
                        }
                    );
                }
            );

        return cleanedOutPut;
    }

    findFileInfo({ file = "", dir = "" }): any {
        let ext = "";
        let dirPath = path.join(dir, file);
        let info = path.parse(dirPath);

        if (!info.ext) {
            ext =
                [
                    this.extBetter,
                    ".ts",
                    ".tsx",
                    ".js",
                    ".jsx",
                    "/index.ts",
                    "/index.tsx",
                    "/index.js",
                    "/index.jsx",
                ].find((e) => fs.existsSync(dirPath + e)) || "";
            this.extBetter = ext;
            if (ext) {
                info = path.parse(dirPath + ext);
            }
        }

        return info;
    }

    analyzeImport({ file = "", dir = "" }) {
        const dirPath = path.join(dir, file);
        try {
            const fileContents: string = fs.readFileSync(dirPath, "utf-8");
            const defaultExtract = { module: "", pathProject: "", exports: [] };

            return this.extractImportLine(fileContents).reduce(
                (g, lineImports): any => {
                    const module = {
                        ...defaultExtract,
                        ...this.extractModule(lineImports, dirPath),
                    };
                    return [...g, module];
                },
                []
            );
        } catch (e) {
            console.error(
                `\n> Don't find "${chalk.red(
                    dirPath.replace(this.startPath, "")
                )}"`
            );
            return [];
        }
    }

    extractImportLine(contents: string) {
        const matchModuleType: RegExp = new RegExp(
            `(((\t|^)(@import|import|export))[^]*?["'][^]*?["']\s?)`,
            `gim`
        );
        return contents.match(matchModuleType) || [];
    }

    extractModule(lineImports: string, currentFile = "") {
        let outPut: {
            module?: string;
            exports?: string[];
            pathProject?: string;
        } = {};

        const filePathRegex: RegExp = new RegExp(
            `("[^]*?"\s?)|('[^]*?'\s?)`,
            "gi"
        );
        const [filePath]: string[] = lineImports.match(filePathRegex) || [""];
        const importPath: string = filePath.trim().replace(/"|'/g, "");

        const lastChar = importPath.slice(-1);
        const firstChar = importPath.charAt(0);

        outPut.module = importPath;

        if ([".", "@", "/"].includes(firstChar)) {
            outPut.pathProject = this.convertToRelativePath(
                importPath,
                currentFile
            );
        }

        if (importPath.indexOf(this.rootFolder) === 0) {
            outPut.pathProject = importPath.replace(this.rootFolder, ".");
        }

        if (lastChar === "/") {
            outPut.pathProject = outPut.pathProject + "index";
            outPut.exports = this.extractNameImport(lineImports);
        }

        return outPut;
    }

    convertToRelativePath(fromModule: string, currentFile = "") {
        const { alias = {} } = this.configApp;
        const firstChar = fromModule.charAt(0);

        const convert: Record<string, (o: string) => string> = {
            "@": (outPut = "") => {
                Object.entries(alias).map(([key, value = ""]) => {
                    outPut = outPut.replace(key, value);
                });

                if (outPut.charAt(0) === "@") {
                    return "";
                }

                return outPut;
            },
            ".": (outPut = "") => {
                const count = (outPut.match(/\.\.\//g) || []).length;
                let relative = currentFile.replace(
                    `${this.startPath}/${this.rootFolder}/`,
                    "./"
                );

                if (relative.lastIndexOf(".") > relative.lastIndexOf("/")) {
                    let arrPath = relative.split("/");
                    arrPath.pop();
                    relative = arrPath.join("/") + "/";
                }

                if (count) {
                    let arrPath = relative.split("/");
                    let outpath = outPut.split("/");

                    arrPath.splice(-(count + 1));
                    outpath.splice(0, count);
                    outPut = "./" + outpath.join("/");
                    relative = arrPath.join("/") + "/";
                }

                return outPut.replace("./", relative);
            },
            "/": (outPut = "") => {
                return path.join(this.startPath, outPut);
            },
            default: (outPut = "") => outPut,
        };

        return (convert[firstChar] || convert.default)(fromModule);
    }

    extractNameImport(lineImports: string) {
        let importName: string[] = [];
        const importNameRegex: RegExp = new RegExp(
            `((import|export)[^]*?from\s?)`,
            "gi"
        );
        const [modulesName]: string[] = lineImports.match(importNameRegex) || [
            "",
        ];
        importName = modulesName
            .replace(/{|}|import|from|export/g, "")
            .split(",")
            .map((e) => e.trim());
        return importName;
    }
}

export = FindUnused;

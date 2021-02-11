import chalk = require("chalk");
import * as fs from "fs";
import * as path from "path";
import {isTestFile,isComponentFile,isStyleFile, isScriptFile} from './utils';
import Base from './base';

const flattenArrayDeep = (nestedArray: any[]): any[] =>
  nestedArray.reduce(
    (prev, current) =>
      Array.isArray(current)
        ? [...prev, ...flattenArrayDeep(current)]
        : [...prev, current],
    []
  );

class FindUnused extends Base {
  static description = 'Find all components never used by your app';
  public extBetter = '.tsx';
  public listBuffer:any[] = [];
  public wasAnalysted: string[] = [];
  public fileUsedList = {};

  async run() {
    const files = fs.readdirSync(this.startPath);
    if(files.includes('src')){

      const startFileInfo = {
        file : 'index',
        dir: path.join(this.startPath, 'src'),
        exports: []
      };

      this.listBuffer.push(startFileInfo);

      this.createJsonFileUsed();
    }else{
      console.log('Launch command on root folder !')
    }
  }

  createJsonFileUsed(){
    fs.writeFile(
      "./usedreport.json",
      JSON.stringify( this.createFileInfo(), null, 2),
      (err)=> err ?  console.warn(err) : this.createJsonFileUnused()
    )
  }

  createJsonFileUnused(){
    fs.writeFile(
      "./unusedreport.json",
      JSON.stringify( this.filtreAndExtract(), null, 2),
      (err)=> err ?  console.warn(err) : console.log(chalk.green('Finished !')))
  }


  filtreAndExtract(){
    const allFile = flattenArrayDeep(
      this.listFile(
        path.join(this.startPath, 'src')
      )
    );
    const fileUsed = Object.keys(this.fileUsedList);
    console.log(chalk.green(allFile.length));
    return allFile.filter(f=>!fileUsed.includes(f) && !isTestFile({file:f}));
  }


  listFile(dir:string):any[]{
    const nestedArray = fs.readdirSync(dir).map((file: string) => {
      const dirPath = path.join(dir, file);
      const result = fs.statSync(dirPath).isDirectory()
        ? this.listFile(dirPath)
        : dirPath;

      return result;
    });
    return nestedArray;
  }

  prepareToBuffer({ pathProject = '', exports = []}) {
    
    const arrPath = pathProject.split('/');

    const file = arrPath.pop()||'';
    arrPath.shift();
    const dirFile  = path.join.apply(path, arrPath);
    const dir = path.join(this.startPath, 'src', dirFile);

    return {
      file,
      dir,
      exports
    }
  }

  createFileInfo():any{

    let output = [];
    let currentFile;
    
    while( currentFile = this.listBuffer.pop() ){
      const {file = '', dir = ''} = currentFile;
      
      const info = this.extractFileInfo({file, dir});
      
      this.wasAnalysted.push(path.join(dir, file));

      const importFiles = this.makeImportFile( {dir : info.dir, file : info.base});

      const imports = importFiles.reduce((g , { module , pathProject, exports} ):any=>{
          if(pathProject){

            const cleaned = this.prepareToBuffer({ pathProject, exports});

            if(!this.wasAnalysted.includes(path.join(cleaned.dir, cleaned.file))){
              this.listBuffer.push(cleaned);
              return [...g, cleaned]
            }
          }
        
          return g;
      }, []);

      output.push({file : info.base, dir : info.dir, imports});
    }
    this.fileUsedList = this.cleanOutPut(output);
    return output;
  }

  cleanOutPut(output:any){
    let cleanedOutPut:Record<string, any> = {};

    output.reverse().map(({file='',dir='',imports=[]}:{file:string,dir:string,imports:any[]})=>{
        const info = this.extractFileInfo({dir, file});
        const name = path.join(info.dir, info.base);
        
        if(!cleanedOutPut[name]){
          cleanedOutPut[name] = {use:[]};
        };

       imports.map(({dir='', file='', exports=[]}:{file:string,dir:string,exports:any[]})=>{
          const info = this.extractFileInfo({dir, file});
          const name = path.join(info.dir, info.base);

          if(cleanedOutPut[name]){
            cleanedOutPut[name] = { ...cleanedOutPut[name], use : [ ...cleanedOutPut[name].use, ...exports]}
          }
        });

    });


    return cleanedOutPut;
  }

  extractFileInfo({ file = '', dir = ''}):any{

    let ext = '';
    let dirPath = path.join(dir, file);
    let info = path.parse(dirPath);
    
    if(!info.ext){
      ext = [this.extBetter, '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'].find((e)=>fs.existsSync(dirPath+e))||'';
      this.extBetter = ext;
      if(ext){
        info = path.parse(dirPath+ext);
      }
    }

    return info;
  }

  makeImportFile({ file = '', dir = ''}){

    const dirPath = path.join(dir, file);
    try{
      const fileContents: string = fs.readFileSync(dirPath, "utf-8");  
      const defaultExtract = {module : '', pathProject : '', exports : []};

      return this.getFileModule(fileContents).reduce((g, lineImports):any=>{
        const module = { ...defaultExtract, ...this.extractModule(lineImports, dirPath)};
        return [ ...g, module] ;
        
      }, []);
      
    } catch (e) {
      console.error(
          chalk.red(
              JSON.stringify(
                { file, dir, dirPath}, null, 2
              )
            )
          );
      return [];
    }
  }

  getFileModule( contents:string){
    const matchModuleType: RegExp = new RegExp(
      `(((\t|^)(@import|import|export))[^]*?["'][^]*?["']\s?)`,
      `gim`
    );
    return contents.match(matchModuleType) || [];
  }

  extractModule(lineImports:string, currentFile = ''){
    let outPut:{module?:string, exports?:string[], pathProject?:string} = {};

    const filePathRegex: RegExp = new RegExp(`("[^]*?"\s?)|('[^]*?'\s?)`, "gi");
    const [filePath]: string[] = lineImports.match(filePathRegex)||[''];
    const importPath: string = filePath.trim().replace(/"|'/g, "");
    
    const lastChar = importPath.slice(-1);
    const firstChar = importPath.charAt(0);

    outPut.module = importPath;

    if([".", "@", "/"].includes(firstChar)){
      outPut.pathProject = this.convertToRelativePath(importPath, currentFile);
    }

    if(importPath.indexOf('src') === 0){
      outPut.pathProject = importPath.replace('src', '.');
    }
    
    if(lastChar === '/'){
      outPut.pathProject = outPut.pathProject+'index';
      outPut.exports= this.extractNameImport(lineImports);
    }
  
    return outPut;
  }

  convertToRelativePath(fromModule:string, currentFile = ''){

    const { alias = {} } = this.configApp;
    const firstChar = fromModule.charAt(0);

    const convert:Record<string, (o:string)=>string> = {
      "@" : (outPut = '')=>{

        Object.entries(alias).map(([key, value = ''])=>{
          outPut = outPut.replace(key, value);
        })

        if(outPut.charAt(0)==="@"){
          return '';
        }

        return outPut;
      },
      "." : (outPut = '')=>{

        const count = (outPut.match(/\.\.\//g) || []).length;
        let relative = currentFile.replace(`${this.startPath}/src/`,'./');
        

        if(relative.lastIndexOf('.')>relative.lastIndexOf('/')){
          let arrPath = relative.split('/');
          arrPath.pop();
          relative = arrPath.join('/')+'/';
        }

        if(count){
          let arrPath = relative.split('/');
          let outpath = outPut.split('/');

          arrPath.splice(-(count+1));
          outpath.splice(0, count);
          outPut = './'+outpath.join('/');
          relative = arrPath.join('/')+'/';
        }

        return  outPut.replace('./', relative);
      },
      "/" : (outPut = '')=>{
        return path.join(this.startPath, outPut);
      },
      default : (outPut = '')=>outPut
    }


    return (convert[firstChar]||convert.default)(fromModule);
  }

  extractNameImport(lineImports : string){
    let importName:string[] = [];
    const importNameRegex: RegExp = new RegExp(`(import[^]*?from\s?)`, "gi");
    const [modulesName]: string[] = lineImports.match(importNameRegex)||[''];
    importName = modulesName.replace(/{|}|import|from/g, "").split(',').map(e=>e.trim());
    return importName;
  }

  checkFileType(file:string, ext:string){
    const fileChecker = [
      isTestFile,
      isComponentFile,
      isStyleFile,
      isScriptFile
    ];

    for( let check of fileChecker){
      const result = check({ext, file});
      if(result){
        return result;
      }
    }
    return 'Other';
  }

}

export = FindUnused

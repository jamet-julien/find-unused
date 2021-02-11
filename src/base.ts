import { cosmiconfig } from 'cosmiconfig';
import {Command} from '@oclif/command';

const exploder = cosmiconfig("findunused");

export type ConfigType = {
    alias? : Record<string, string>;
}

export default abstract class Base extends Command{
    public configApp: ConfigType = {};
    public startPath: string = '';
    
    async init() {
        const { config } = await exploder.search() || {};
        this.startPath = process.cwd();
        this.configApp = config
    }

};
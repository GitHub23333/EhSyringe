import { Observable } from 'rxjs';

import { update } from '../background/update';
import { EHTNamespaceName, TagItem, TagList } from '../interface';

interface Suggestion {
    tag: TagItem;
    score: number;

    match: {
        key?: { start: number; length: number };
        name?: { start: number; length: number };
    };
}

class Suggest {
    constructor(tagList: Observable<TagList>) {
        tagList.subscribe(data => this.tagList = data);
    }

    readonly nsScore: {
        [k in EHTNamespaceName]: number;
    } = {
            female: 5,
            male: 4.995,
            misc: 4.5,
            language: 1,
            artist: 3,
            group: 2.5,
            parody: 4,
            character: 3.5,
            reclass: 1,
            rows: 0,
        };

    readonly nsDic: { [k: string]: EHTNamespaceName } = {
        r: 'reclass',
        reclass: 'reclass',
        l: 'language',
        language: 'language',
        lang: 'language',
        p: 'parody',
        parody: 'parody',
        series: 'parody',
        c: 'character',
        char: 'character',
        character: 'character',
        g: 'group',
        group: 'group',
        creator: 'group',
        circle: 'group',
        a: 'artist',
        artist: 'artist',
        m: 'male',
        male: 'male',
        f: 'female',
        female: 'female',
    };

    private tagList: TagList;
    private markTag(tag: TagItem, term: string): Suggestion {
        const key = tag.key;
        const name = tag.name.toLowerCase();
        const keyidx = key.indexOf(term);
        const nameidx = name.indexOf(term);
        let score = 0;
        const match: Suggestion['match'] = {};
        if (keyidx >= 0) {
            score += (this.nsScore[tag.namespace] * (term.length + 1) / key.length) * (keyidx === 0 ? 2 : 1);
            match.key = { start: keyidx, length: term.length };
        }
        if (nameidx >= 0) {
            score += (this.nsScore[tag.namespace] * (term.length + 1) / name.length) * (nameidx === 0 ? 2 : 1);
            match.name = { start: nameidx, length: term.length };
        }
        return {
            tag,
            match,
            score,
        };
    }

    getSuggests(term: string, limit: number): Suggestion[] {
        if (!this.tagList.length || !term) {
            return [];
        }
        let sterm = term.toLowerCase();
        const col = sterm.indexOf(':');
        let tagList = this.tagList;
        if (col >= 1) {
            const ns = this.nsDic[sterm.substr(0, col)];
            if (ns) {
                sterm = sterm.substr(col + 1);
                tagList = tagList.filter(tag => tag.namespace === ns);
            }
        }
        return tagList
            .map(tag => this.markTag(tag, sterm))
            .filter(st => st.score > 0)
            .sort((st1, st2) => st2.score - st1.score)
            .slice(0, limit);
    }
}

const instance = new Suggest(update.tagList);

export const suggest = (term: string, limit: number) => instance.getSuggests(term, limit);

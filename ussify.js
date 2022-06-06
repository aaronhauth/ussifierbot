import {visit} from 'unist-util-visit'
import find from 'unist-util-find';

const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;

export default function ussyfy(options = {}) {
    const frequency = options?.frequency;

    if (!frequency) {
        console.warn('frequency not set');
    } else {
        console.log(`frequency is set to ${frequency}`);
    }

    return (tree, file) => {
        let wasUssified = false;
        let loosenSearch = !find(tree, node => node.type === 'WordNode' && node.data.partOfSpeech[0] === 'N');

        if (!find(tree, {type: 'WordNode'})) return tree;

        while (!wasUssified) {
            visit(tree, 'WordNode', node => {
                wordExists = true;
                const tag = node.data.partOfSpeech;
                const word = node.children[0].value;
    
                // all noun tags start with N. Also, we're gonna give foreign words the ussy treatment.
                if (tag[0] !== 'N' && tag !== 'FW' && !loosenSearch) return;
                if (Math.floor(Math.random()*frequency) !== 0) return;

                wasUssified = true;
    
                const syllables = word.match(syllableRegex);

                // skip this node if somehow we can't break the word into syllables
                if (!syllables) return word;

                // POS tags that are plural nouns always end with S, (e.g., NNPS = "Proper noun, plural", and NNS = "Noun, plural".)
                var ussyForm = tag[tag.length - 1] === 'S' && tag !== 'FW' ? 'ussies' : 'ussy';
    
                if (word[word.length-1].match(/[^a-zA-Z]/)) {
                    ussyForm += word[word.length-1];
                }
    
                console.log(syllables);
                syllables[syllables.length - 1] = syllables[syllables.length - 1][0] + ussyForm;
                console.log(word);
    
                //WordNode connects to a "TextNode". "TextNode" has a value field, which represents the string form of the word being evaluated.
                node.children[0].value = syllables.join('');
            });
            // if we make a pass and nothing has been ussified, all bets are off. 
            loosenSearch = true;
        }
    }
}
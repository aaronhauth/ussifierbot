import {visit} from 'unist-util-visit'
import find from 'unist-util-find';

const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;
const startConsonantsRegex = /^[^aeiouy]*/i;

// returns a function to be used within a retexted unified processor
export default function ussyfy(options = {}) {
    let frequency = options?.frequency;

    if (!frequency) {
        console.warn('frequency not set');
    } else {
        console.log(`frequency is set to ${frequency}`);
    }

    return (tree) => {
        let wasUssified = false;
        let loosenSearch = !find(tree, node => node.type === 'WordNode' && node.data.partOfSpeech[0] === 'N');

        if (!find(tree, {type: 'WordNode'})) return tree;

        while (!wasUssified) {
            visit(tree, 'WordNode', node => {
                const tag = node.data.partOfSpeech;
                const word = node.children[0].value;

                if (node.data.isEmote) return;
    
                // all noun tags start with N. Also, we're gonna give foreign words the ussy treatment.
                if (tag[0] !== 'N' && tag !== 'FW' && !loosenSearch) return;
                if (Math.floor(Math.random()*frequency) !== 0) return;

                const syllables = word.match(syllableRegex);

                // if the regex doesn't find anything, then kick back out
                if (syllables.length == 0) return;
                
                wasUssified = true;

                // POS tags that are plural nouns always end with S, (e.g., NNPS = "Proper noun, plural", and NNS = "Noun, plural".)
                var ussyForm = tag[tag.length - 1] === 'S' && tag !== 'FW' ? 'ussies' : 'ussy';
    
                if (word[word.length-1].match(/[^a-zA-Z]/)) {
                    ussyForm += word[word.length-1];
                }
    
                console.debug(syllables);
                const lastSyllableConsonants = syllables[syllables.length - 1].match(startConsonantsRegex)[0];
                if (lastSyllableConsonants.length === 0) {
                    syllables[syllables.length - 1] = syllables[syllables.length - 1][0] + ussyForm;
                } else {
                    syllables[syllables.length - 1] = lastSyllableConsonants + ussyForm;
                }
                console.debug(word);
    
                //WordNode connects to a "TextNode". "TextNode" has a value field, which represents the string form of the word being evaluated.
                node.children[0].value = syllables.join('');
            });
            // if we make a pass and nothing has been ussified, all bets are off. 
            loosenSearch = true;

            // we may have also had some bad luck. Ease the odds so they its a little more probable next time;
            if (frequency > 0) frequency -= 1; 
        }
    }
}
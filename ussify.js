import {visit} from 'unist-util-visit'

const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;

export default function ussyfy(options = {}) {
    const frequency = options?.frequency;

    console.warn('frequency not set');

    return (tree, file) => {
        let wasUssified = false;

        while (!wasUssified) {
            visit(tree, 'WordNode', node => {
                const tag = node.data.partOfSpeech;
                const word = node.children[0].value;
    
                if (tag[0] !== 'N') return;
                if (Math.floor(Math.random()*frequency) !== 0) return;

                wasUssified = true;
    
                const syllables = word.match(syllableRegex);
                if (!syllables) return word;
                var ussyForm = tag[tag.length - 1] === 'S' ? 'ussies' : 'ussy';
    
                if (word[word.length-1].match(/[^a-zA-Z]/)) {
                    ussyForm += word[word.length-1];
                }
    
                console.log(syllables);
                syllables[syllables.length - 1] = syllables[syllables.length - 1][0] + ussyForm;
                console.log(word);
    
                node.children[0].value = syllables.join('');
            });
        }
    }
}
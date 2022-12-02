import {visit} from 'unist-util-visit'
import find from 'unist-util-find';

// returns a function to be used within a retexted unified processor
export default function emoteTagger(options = {}) {
    let emotes = options?.emotes;

    if (!emotes) {
        console.warn('emotes not set');
    } else {
        console.log(`emotes is set to ${emotes}`);
    }

    return (tree) => {
        if (!find(tree, {type: 'WordNode'})) return tree;

        visit(tree, 'WordNode', node => {
            const word = node.children[0].value;
            node.data.isEmote = emotes.includes(word);
        });        
    }
}
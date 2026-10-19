const faq = require('../faq');

// Calibration knob: higher = fewer replies, fewer wrong ones.
const MIN_PROBABILITY = 0.6;
const MIN_SEEKS_HELP = 0.5;
const MAX_STATE_CHARS = 500;

const QUESTION_START = /^(how|what|when|where|why|who|which|is|are|can|could|does|do|did|will|would|should|any|anyone|cómo|como|qué|que|cuándo|cuando|dónde|donde|por qué|hay|se puede|puedo|alguien)(?=[\s,]|$)/i;
const QUESTION_ANYWHERE = /\b(how (do|can|to|does)|why|is there|any ?way|trouble|nothing happens|can'?t|cannot|doesn'?t|does not|won'?t|isn'?t|not working|not detected|help|no puedo|no funciona)\b/i;

const criteria = {
    ...Object.fromEntries(Object.entries(faq).map(([key, { topic }]) => [key, topic])),
    none: 'Greeting, opinion, chat, or a question about anything not listed'
};

/**
 * Local pre-filter so non-questions never reach the paid API.
 * @param {string} text
 */
const looksLikeQuestion = (text) => {
    const clean = text.replace(/<[@#:&!a-z0-9_]+>|https?:\/\/\S+/gi, ' ').trim();
    if (clean.split(/\s+/).length < 4) return false;
    return clean.includes('?') || QUESTION_START.test(clean) || QUESTION_ANYWHERE.test(clean);
};

/**
 * @param {string} text
 * @param {boolean} toUser whether the message replies to or mentions another user.
 * @returns {Promise<string | null>} the FAQ answer, or null when none applies.
 */
const findAnswer = async (text, toUser) => {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'jev-latest',
            state: { message: text.slice(0, MAX_STATE_CHARS), replying_to_or_mentioning_another_user: toUser },
            questions: {
                seeks_help: {
                    type: 'noul',
                    instructions: 'Is the author of `message` asking for help or information for themselves, rather than asking another person about that person\'s own setup, choices or experience?',
                    criteria: {
                        true: 'Wants to know how to do something, or whether something exists or works',
                        false: 'Asks someone what they use, prefer or did, or is just chatting'
                    }
                },
                faq: {
                    type: 'choice',
                    instructions: 'Which FAQ topic is `message` asking about?',
                    criteria
                }
            }
        })
    });
    if (!res.ok) throw new Error(`Jev ${res.status}: ${await res.text()}`);

    const { seeks_help, faq: { choice, probabilities } } = (await res.json()).answers;
    if (seeks_help.noul < MIN_SEEKS_HELP || choice === 'none' || probabilities[choice] < MIN_PROBABILITY) return null;
    return faq[choice].answer;
};

module.exports = { looksLikeQuestion, findAnswer };

if (require.main === module) {
    const assert = require('assert');
    assert(!looksLikeQuestion('lol nice'));
    assert(!looksLikeQuestion('what? <@123456789>'));
    assert(looksLikeQuestion('is there an official server'));
    assert(looksLikeQuestion('cómo cambio el ángulo de la cámara'));
    assert(looksLikeQuestion('I cannot find the camera angle setting?'));
    assert(!looksLikeQuestion('this drone mod is so cool'));
    assert(looksLikeQuestion('Hello I can\'t go into acro mode'));
    console.log('ok');
}

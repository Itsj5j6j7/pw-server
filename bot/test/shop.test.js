const test = require('node:test');
const assert = require('node:assert/strict');
const { itemCommands, orderItems } = require('../src/shop/items');

test('a pet gives its pet permission', () => {
    assert.deepEqual(itemCommands({ kind: 'pet', name: 'dragon' }, 'u1'),
        ['lp user u1 permission set propwash.pets.dragon']);
});

test('a trail gives its preset and the use permission', () => {
    assert.deepEqual(itemCommands({ kind: 'trail', preset: 'aurora' }, 'u1'),
        ['lp user u1 permission set propwash.trails.preset.aurora', 'lp user u1 permission set propwash.trails.use']);
});

test('a trail without a preset name uses its item name', () => {
    assert.deepEqual(itemCommands({ kind: 'trail', name: 'cloud' }, 'u1')[0],
        'lp user u1 permission set propwash.trails.preset.cloud');
});

test('orderItems splits known and unknown codes', () => {
    const catalog = { a1: { kind: 'pet', name: 'x' } };
    const order = { shop_items: [{ direct_link_code: 'a1' }, { direct_link_code: 'zz' }, {}] };
    const { known, unknown } = orderItems(order, catalog);
    assert.equal(known.length, 1);
    assert.deepEqual(unknown, ['zz', '?']);
});

test('orderItems ignores a payload without shop_items', () => {
    assert.deepEqual(orderItems({}, {}), { known: [], unknown: [] });
    assert.deepEqual(orderItems(null, {}), { known: [], unknown: [] });
});

test('a code from Object.prototype is unknown', () => {
    const { known, unknown } = orderItems({ shop_items: [{ direct_link_code: 'constructor' }] }, {});
    assert.equal(known.length, 0);
    assert.deepEqual(unknown, ['constructor']);
});

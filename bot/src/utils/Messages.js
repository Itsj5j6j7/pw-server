// Saved messages built in the assets.itofu.net panel (Components V2 JSON), fetched by id. Public, no key needed.
const API = 'https://assets.itofu.net/api/bot/messages';

const request = async (path) => {
    const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

const listMessages = async () => (await request('')) ?? [];

const getMessage = (id) => request(`/${encodeURIComponent(id)}`);

// File components only accept attachment:// URLs: each one is attached and pointed at its attachment.
const toPayload = (data) => {
    const files = [];
    const walk = (component) => {
        if (component.type === 13 && /^https?:\/\//.test(component.file?.url ?? '')) {
            const name = `${files.length}-${component.file.url.split('/').pop().split('?')[0] || 'file'}`;
            files.push({ attachment: component.file.url, name });
            component.file.url = `attachment://${name}`;
        }
        component.components?.forEach(walk);
    };
    data.components.forEach(walk);
    return { components: data.components, files };
};

module.exports = { listMessages, getMessage, toPayload };

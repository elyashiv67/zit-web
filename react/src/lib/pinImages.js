import {api} from '../api/client.js';

export const MAX_IMAGES_PER_PIN = 10;

// the server compresses phone photos itself (up to 25MB each), so files go up as they are
export async function uploadPinImages(pinId, files) {
    const form = new FormData();
    for (const file of files) form.append('images', file);
    const {pin} = await api(`/pin/${pinId}/images`, {method: 'POST', body: form});
    return pin;
}

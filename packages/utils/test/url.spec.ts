import { addParam } from '../url';

describe('utils/url.ts', () => {
    it('should add ?key=value into url', () => {
        const url = 'https://app.chatpuppy.com';
        const key = 'key';
        const value = 'value';
        const params = {
            [key]: value,
        };
        expect(addParam(url, params)).toBe(`${url}?${key}=${value}`);
    });

    it('should add &key=value into url', () => {
        const url = 'https://app.chatpuppy.com?a=a';
        const key = 'key';
        const value = 'value';
        const params = {
            [key]: value,
        };
        expect(addParam(url, params)).toBe(`${url}&${key}=${value}`);
    });
});

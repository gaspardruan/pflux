import { getEmptyContent } from '../../src/utils/editor-utils';

describe('editor-utils', () => {
  describe('getEmptyContent', () => {
    it('returns empty comments for target filename', () => {
      expect(getEmptyContent('main.py')).toBe('# main.py\n');
    });
  });
});

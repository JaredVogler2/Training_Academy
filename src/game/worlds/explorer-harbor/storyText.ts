/**
 * The words of the room for making a story that are not part of a story: what its buttons are called, for a
 * grown-up and for a screen reader. What a story says is in src/content/explorer-harbor/storymaker.json.
 */
export const storyText = {
  back: 'Back to Explorer Harbor',
  sayAgain: 'Say it again',
  /**
   * The two things to do with a story that is whole: what is written on each button, which has to fit two side
   * by side on the narrowest phone, and what each is called in full.
   */
  again: 'Again',
  againName: 'Hear it again',
  another: 'New story',
  anotherName: 'A new story',
  pages: 'The pages of the story',
  page: (number: number) =>
    number === 1
      ? 'The first page: the beginning'
      : number === 2
        ? 'The second page: what goes wrong'
        : 'The third page: how it ends',
} as const;

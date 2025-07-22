/** Lightweight syntax highlighter for @mentions */
export const highlightMentions = (text: string): string =>
  text.replace(
    /@([\w-]+)/g,
    '<span class="text-primary/80 font-medium cursor-pointer" data-tag="$1">@$1</span>'
  )
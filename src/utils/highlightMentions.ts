/** Lightweight syntax highlighter for @mentions */
export const highlightMentions = (html: string) =>
  html.replace(
    /@([\w-]+)/g,
    (_, u) =>
      `<span class="text-primary/80 font-medium cursor-pointer" data-tag="${u}">@${u}</span>`
  )
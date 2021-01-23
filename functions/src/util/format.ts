export function listEndWith(list: string[], ending: string): string {
  const {length} = list
  if (length <= 1) {
    return list.join('')
  } else if (length === 2) {
    return list.join(` ${ending} `)
  }

  const last = list[length - 1]
  const front = list.splice(0, length - 1).join(', ')
  return `${front} ${ending} ${last}`
}

export function markdownUl(list: string[]): string {
  return list.map(x => `- ${x}`).join('\n')
}

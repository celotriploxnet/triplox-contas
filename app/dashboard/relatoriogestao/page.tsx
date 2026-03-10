if (groupMode === 'agencia') {
  const list = Object.values(gestaoMap)
    .filter((g) => {
      const tipo = (g.tipo || '').toUpperCase().trim()

      if (tipo !== 'AG') return false
      if ((g.codAg || '').toUpperCase().includes('PA')) return false

      return true
    })
    .map((g) => ({
      value: g.codAg || '',
      label: `${g.codAg || '—'} - ${g.nomeAg || 'Agência sem nome'}`,
    }))
    .filter((x) => x.value)

  const unique = new Map<string, string>()
  list.forEach((item) => {
    if (!unique.has(item.value)) unique.set(item.value, item.label)
  })

  return [{ value: 'Todos', label: 'Todas as agências' }].concat(
    Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => Number(a.value) - Number(b.value))
  )
}
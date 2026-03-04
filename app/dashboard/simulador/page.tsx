'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

import { auth, db } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const ADMIN_UID = 'Z1VO0zsXyIf23YwmmGjhTm3hIBE2'
const CONFIG_DOC = { col: 'config', docId: 'comissoes_simulador' }

// ✅ Produto removido da página (mesmo se estiver salvo na config antiga do Firestore)
const HIDDEN_IDS = new Set(['conta_pj_app'])

type ItemType = 'fixed' | 'percent'

type CommissionItem = {
  id: string
  label: string
  type: ItemType
  value: number
  acelerador?: boolean
}

type FireConfig = {
  version: number
  updatedAt?: string
  items: CommissionItem[]
}

const DEFAULT_ITEMS: CommissionItem[] = [
  { id: 'conta_pf_com_deposito', label: 'Abertura Conta PF com Depósito', type: 'fixed', value: 25, acelerador: true },
  { id: 'conta_pf_sem_deposito', label: 'Abertura Conta PF sem Depósito', type: 'fixed', value: 20, acelerador: true },
  { id: 'cartao_credito_venda', label: 'Cartão de Crédito (Venda)', type: 'fixed', value: 5, acelerador: true },
  { id: 'lime', label: 'LIME', type: 'fixed', value: 15, acelerador: true },
  { id: 'cheque_especial', label: 'Cheque Especial', type: 'fixed', value: 15, acelerador: true },
  { id: 'cesta_servicos', label: 'Cesta de Serviços', type: 'fixed', value: 20, acelerador: true },

  { id: 'contas_inss', label: 'Abertura de Contas INSS (c/ transf. benefício)', type: 'fixed', value: 10 },
  { id: 'cartao_credito_ativacao', label: 'Cartão de Crédito (Ativação)', type: 'fixed', value: 40 },
  { id: 'centralizacao_salario', label: 'Centralização Salário', type: 'fixed', value: 10 },
  // ❌ REMOVIDO: { id: 'conta_pj_app', label: 'Conta PJ via app', type: 'fixed', value: 70 },
  { id: 'mobilidade', label: 'Mobilidade', type: 'fixed', value: 5 },
  { id: 'superprotegido', label: 'Seguro Superprotegido', type: 'fixed', value: 4 },

  { id: 'microsseguro', label: 'Microsseguro', type: 'fixed', value: 5 },
  { id: 'vida_viva', label: 'Seguro Vida Viva (média)', type: 'fixed', value: 12 },

  { id: 'residencial', label: 'Seguro Residencial (Faixa 1)', type: 'fixed', value: 2.28 },
  { id: 'plano_odontologico', label: 'Plano Odontológico', type: 'fixed', value: 34.49 },

  // ✅ ALTERAÇÃO PEDIDA (só texto do label)
  { id: 'credito_parcelado_lime', label: 'Crédito Pessoal (sobre valor)', type: 'percent', value: 5.0 },
  { id: 'credito_imobiliario', label: 'Crédito Imobiliário (sobre valor)', type: 'percent', value: 0.4 },
  { id: 'consignado', label: 'Consignado (sobre valor)', type: 'percent', value: 3.5 },
  { id: 'consorcio', label: 'Consórcio (sobre valor)', type: 'percent', value: 2.5 },
  { id: 'saque_aniversario_fgts', label: 'Saque Aniversário FGTS (sobre valor)', type: 'percent', value: 3.0 },
  { id: 'expresso_da_sorte', label: 'Expresso da Sorte (sobre valor)', type: 'percent', value: 9.0 },
]

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function toNumberSafe(v: any) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = toStr(v).replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function moneyBR(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function Pill({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="pill" style={style}>
      {children}
    </span>
  )
}

function isAdminUser(u: User | null) {
  if (!u) return false
  const emailOk = (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()
  const uidOk = u.uid === ADMIN_UID
  return emailOk || uidOk
}

function getAceleradorPct(contasPf: number) {
  if (contasPf >= 100) return 60
  if (contasPf >= 90) return 55
  if (contasPf >= 80) return 50
  if (contasPf >= 70) return 45
  if (contasPf >= 60) return 40
  if (contasPf >= 50) return 35
  if (contasPf >= 40) return 30
  if (contasPf >= 30) return 25
  if (contasPf >= 20) return 20
  if (contasPf >= 10) return 15
  if (contasPf >= 5) return 10
  return 0
}

export default function SimuladorPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [items, setItems] = useState<CommissionItem[]>(DEFAULT_ITEMS)
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [volMap, setVolMap] = useState<Record<string, number>>({})

  async function loadConfig() {
    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const refDoc = doc(db, CONFIG_DOC.col, CONFIG_DOC.docId)
      const snap = await getDoc(refDoc)

      if (!snap.exists()) {
        setItems(DEFAULT_ITEMS.filter((x) => !HIDDEN_IDS.has(x.id)))
        setInfo('Config não encontrada. Usando padrão ✅')
        return
      }

      const data = snap.data() as Partial<FireConfig>
      const loaded = Array.isArray(data?.items) ? data!.items : []
      if (!loaded.length) {
        setItems(DEFAULT_ITEMS.filter((x) => !HIDDEN_IDS.has(x.id)))
        setInfo('Config vazia. Usando padrão ✅')
        return
      }

      const loadedMap = new Map<string, CommissionItem>()
      loaded.forEach((x: any) => {
        const id = toStr(x.id)
        if (!id) return
        if (HIDDEN_IDS.has(id)) return
        loadedMap.set(id, {
          id,
          label: toStr(x.label),
          type: x.type === 'percent' ? 'percent' : 'fixed',
          value: toNumberSafe(x.value),
          acelerador: !!x.acelerador,
        })
      })

      const merged: CommissionItem[] = DEFAULT_ITEMS.map((def) => {
        const got = loadedMap.get(def.id)
        return got
          ? {
              ...def,
              label: got.label || def.label,
              type: got.type || def.type,
              value: Number.isFinite(got.value) ? got.value : def.value,
              acelerador: typeof got.acelerador === 'boolean' ? got.acelerador : def.acelerador,
            }
          : def
      })

      for (const [id, it] of loadedMap.entries()) {
        if (HIDDEN_IDS.has(id)) continue
        if (!merged.find((x) => x.id === id)) merged.push(it)
      }

      setItems(merged.filter((x) => !HIDDEN_IDS.has(x.id)))
      setInfo('Comissões carregadas ✅')
    } catch (e: any) {
      console.error(e)
      setError(`Falha ao carregar comissões. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig() {
    if (!user || !isAdmin) {
      setError('Sem permissão para salvar. Faça login como admin.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      setInfo('')

      const payload: FireConfig = {
        version: 1,
        updatedAt: new Date().toISOString(),
        items: items
          .filter((x) => !HIDDEN_IDS.has(x.id))
          .map((it) => ({
            id: toStr(it.id),
            label: toStr(it.label),
            type: it.type,
            value: toNumberSafe(it.value),
            acelerador: !!it.acelerador,
          })),
      }

      const refDoc = doc(db, CONFIG_DOC.col, CONFIG_DOC.docId)
      await setDoc(refDoc, payload, { merge: true })

      setInfo('Comissões salvas ✅')
      setEditMode(false)
    } catch (e: any) {
      console.error(e)
      setError(`Falha ao salvar. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setCheckingAuth(false)

      if (!u) {
        setIsAdmin(false)
        router.push('/login')
        return
      }

      setIsAdmin(isAdminUser(u))
      loadConfig()
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fixedItems = useMemo(() => items.filter((i) => i.type === 'fixed' && !HIDDEN_IDS.has(i.id)), [items])
  const percentItems = useMemo(() => items.filter((i) => i.type === 'percent' && !HIDDEN_IDS.has(i.id)), [items])

  const contasPf = useMemo(() => {
    const a = toNumberSafe(qtyMap['conta_pf_com_deposito'])
    const b = toNumberSafe(qtyMap['conta_pf_sem_deposito'])
    return a + b
  }, [qtyMap])

  const aceleradorPct = useMemo(() => getAceleradorPct(contasPf), [contasPf])

  const aceleradorBase = useMemo(() => {
    const ids = new Set(['conta_pf_com_deposito', 'conta_pf_sem_deposito', 'cartao_credito_venda', 'lime', 'cheque_especial', 'cesta_servicos'])
    let sum = 0
    for (const it of items) {
      if (it.type !== 'fixed') continue
      if (!ids.has(it.id)) continue
      sum += toNumberSafe(qtyMap[it.id]) * toNumberSafe(it.value)
    }
    return sum
  }, [items, qtyMap])

  const aceleradorBonus = useMemo(() => (aceleradorBase * aceleradorPct) / 100, [aceleradorBase, aceleradorPct])

  const total = useMemo(() => {
    let t = 0
    for (const it of items) {
      if (HIDDEN_IDS.has(it.id)) continue
      if (it.type === 'fixed') t += toNumberSafe(qtyMap[it.id]) * toNumberSafe(it.value)
      else t += (toNumberSafe(volMap[it.id]) * toNumberSafe(it.value)) / 100
    }
    return t + aceleradorBonus
  }, [items, qtyMap, volMap, aceleradorBonus])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Simulador</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          🧮 Simulador de Comissão
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Preencha quantidade (por unidade) e valor (por percentual) para simular.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Total estimado: {moneyBR(total)}</Pill>

        <Pill style={{ background: 'rgba(15,15,25,.06)', border: '1px solid rgba(15,15,25,.10)', color: 'rgba(16,16,24,.85)' }}>
          Acelerador: {aceleradorPct}% (Contas PF: {contasPf})
        </Pill>

        <Pill style={{ background: 'rgba(34,197,94,.10)', border: '1px solid rgba(34,197,94,.20)', color: 'rgba(21,128,61,.95)' }}>
          Bônus Acelerador: {moneyBR(aceleradorBonus)}
        </Pill>

        <button className="btn-primary" onClick={loadConfig} disabled={loading || checkingAuth} style={{ marginLeft: 'auto' }}>
          {checkingAuth ? 'Verificando...' : loading ? 'Carregando...' : 'Recarregar comissões'}
        </button>

        {isAdmin && (
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={() => setEditMode((v) => !v)}
              disabled={saving || loading}
              title="Ativar/Desativar edição das comissões"
            >
              {editMode ? 'Fechar edição' : 'Editar comissões'}
            </button>

            {editMode && (
              <button className="btn-primary" type="button" onClick={saveConfig} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar comissões'}
              </button>
            )}
          </>
        )}
      </div>

      {(info || error) && (
        <div className="card-soft" style={{ borderColor: error ? 'rgba(214,31,44,.25)' : undefined }}>
          {info && <p className="p-muted" style={{ fontWeight: 900 }}>{info}</p>}
          {error && <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 900 }}>{error}</p>}
        </div>
      )}

      {/* UNIDADE */}
      <div className="card" style={{ display: 'grid', gap: '.85rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">Produtos por unidade</span>
          <span className="p-muted" style={{ fontSize: 12 }}>(quantidade)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {fixedItems.map((it) => {
            const qty = toNumberSafe(qtyMap[it.id])
            const subtotal = qty * toNumberSafe(it.value)

            return (
              <div key={it.id} className="card-soft" style={{ padding: '.95rem', display: 'grid', gap: '.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ fontWeight: 900 }}>{it.label}</div>
                  <Pill>{moneyBR(subtotal)}</Pill>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                  <label>
                    <div className="label">Quantidade</div>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={String(qty || 0)}
                      onChange={(e) => setQtyMap((p) => ({ ...p, [it.id]: Math.max(0, toNumberSafe(e.target.value)) }))}
                    />
                  </label>

                  <label>
                    <div className="label">R$ por unidade</div>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={String(toNumberSafe(it.value)).replace('.', ',')}
                      disabled={!editMode}
                      onChange={(e) => {
                        if (!editMode) return
                        const v = toNumberSafe(e.target.value)
                        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, value: v } : x)))
                      }}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PERCENT */}
      <div className="card" style={{ display: 'grid', gap: '.85rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">Produtos por percentual</span>
          <span className="p-muted" style={{ fontSize: 12 }}>(valor total em R$)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {percentItems.map((it) => {
            const volume = toNumberSafe(volMap[it.id])
            const rate = toNumberSafe(it.value)
            const subtotal = (volume * rate) / 100

            return (
              <div key={it.id} className="card-soft" style={{ padding: '.95rem', display: 'grid', gap: '.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ fontWeight: 900 }}>{it.label}</div>
                  <Pill>{moneyBR(subtotal)}</Pill>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                  <label>
                    <div className="label">Valor total (R$)</div>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={String(volume || 0).replace('.', ',')}
                      onChange={(e) => setVolMap((p) => ({ ...p, [it.id]: Math.max(0, toNumberSafe(e.target.value)) }))}
                    />
                  </label>

                  <label>
                    <div className="label">% comissão</div>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={String(rate).replace('.', ',')}
                      disabled={!editMode}
                      onChange={(e) => {
                        if (!editMode) return
                        const v = toNumberSafe(e.target.value)
                        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, value: v } : x)))
                      }}
                    />
                  </label>
                </div>

                <div className="p-muted" style={{ fontSize: 12 }}>
                  {String(rate).replace('.', ',')}% sobre {moneyBR(volume)} → <b>{moneyBR(subtotal)}</b>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '.25rem' }}>
          Logado como: <b>{user.email}</b>
          {isAdmin ? ' (Admin)' : ''}
        </p>
      )}
    </section>
  )
}
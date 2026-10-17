import { useState, type FormEvent } from 'react'
import { ArrowRight, Focus, LockKeyhole, Mail, X } from 'lucide-react'
import { isRegistrationConfigured, supportEmail, supabase } from '../lib/supabase'
import type { LegalDocument } from './LegalDialog'

type AuthMode = 'sign-in' | 'sign-up' | 'reset' | 'update-password'

type AuthDialogProps = {
  initialMode?: AuthMode
  onClose: () => void
  onOpenLegal: (document: LegalDocument) => void
  onSuccess: (message: string) => void
}

function getFriendlyError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Проверь почту и пароль и попробуй ещё раз.'
  if (normalized.includes('user already registered')) return 'Аккаунт с этой почтой уже зарегистрирован. Войди в него.'
  if (normalized.includes('password should be at least')) return 'Пароль должен содержать не менее 8 символов.'
  if (normalized.includes('email not confirmed')) return 'Подтверди почту по ссылке в письме, затем войди.'
  if (normalized.includes('rate limit')) return 'Слишком много попыток. Подожди немного и попробуй снова.'
  return message
}

export default function AuthDialog({ initialMode = 'sign-up', onClose, onOpenLegal, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setErrorMessage('Аккаунты ещё не подключены. Владельцу сайта нужно добавить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.')
      return
    }
    if (mode === 'sign-up' && !isRegistrationConfigured) {
      setErrorMessage('Чтобы включить регистрацию, настрой проект Supabase и адрес поддержки VITE_SUPPORT_EMAIL.')
      return
    }

    const form = new FormData(event.currentTarget)
    const address = String(form.get('email') ?? '').trim().toLowerCase()
    const password = String(form.get('password') ?? '')
    if (!address && mode !== 'update-password') return
    setEmail(address)
    setErrorMessage('')
    setBusy(true)

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        })
        if (error) throw error
        onSuccess('Если аккаунт с этой почтой существует, мы отправили письмо для сброса пароля.')
        onClose()
      } else if (mode === 'update-password') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        onSuccess('Пароль обновлён. Теперь можно пользоваться своим аккаунтом.')
        onClose()
      } else if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
        })
        if (error) throw error
        if (!data.session) {
          onSuccess('Аккаунт создан. Перейди по ссылке в письме, чтобы подтвердить почту.')
          onClose()
        } else {
          onSuccess('Аккаунт создан. Твои планы теперь синхронизируются.')
          onClose()
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password })
        if (error) throw error
        onSuccess('Ты вошёл в свой аккаунт.')
        onClose()
      }
    } catch (error) {
      console.error('Не удалось выполнить действие с аккаунтом FocusFlow.', error)
      setErrorMessage(getFriendlyError(error instanceof Error ? error.message : 'Не удалось выполнить запрос. Попробуй ещё раз.'))
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'reset'
    ? 'Сбросить пароль'
    : mode === 'update-password'
      ? 'Задай новый пароль'
      : mode === 'sign-in'
        ? 'С возвращением'
        : 'Твоё пространство'
  const description = mode === 'reset'
    ? 'Отправим ссылку для восстановления пароля на почту.'
    : mode === 'update-password'
      ? 'Придумай новый пароль для своего аккаунта.'
      : mode === 'sign-in'
        ? 'Войди, чтобы открыть планы на всех своих устройствах.'
        : 'Создай аккаунт — твои планы будут доступны на любом устройстве.'

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div className="modal-heading">
          <span className="modal-icon"><Focus size={18} /></span>
          <button className="modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Закрыть"><X size={18} /></button>
        </div>
        <h2 id="account-title">{title}</h2>
        <p>{description}</p>
        {mode === 'sign-up' && !isRegistrationConfigured && (
          <div className="setup-notice" role="status">
            <b>Регистрация временно не подключена</b>
            <span>Владельцу нужно подключить Supabase и личный адрес поддержки. Для приватных запросов по данным не используй публичные GitHub Issues. Демо и личные списки на этом устройстве уже работают.{supportEmail ? '' : ' Инструкция есть в README проекта.'}</span>
          </div>
        )}
        <form onSubmit={submit}>
          {mode !== 'update-password' && (
            <>
              <label htmlFor="account-email">Электронная почта</label>
              <span className="account-input"><Mail size={15} /><input id="account-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required disabled={busy} /></span>
            </>
          )}
          {mode !== 'reset' && (
            <>
              <label htmlFor="account-password">{mode === 'update-password' ? 'Новый пароль' : 'Пароль'}</label>
              <span className="account-input"><LockKeyhole size={15} /><input id="account-password" name="password" type="password" placeholder="Не менее 8 символов" minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required disabled={busy} /></span>
            </>
          )}
          {errorMessage && <div className="auth-error" role="alert">{errorMessage}</div>}
          <button className="button-primary modal-submit" type="submit" disabled={busy}>
            {busy ? 'Подожди…' : mode === 'reset' ? 'Отправить ссылку' : mode === 'update-password' ? 'Сохранить новый пароль' : mode === 'sign-in' ? 'Войти' : 'Создать аккаунт'} {!busy && <ArrowRight size={15} />}
          </button>
        </form>
        <div className="auth-switches">
          {mode === 'sign-up' && <button type="button" onClick={() => { setMode('sign-in'); setErrorMessage('') }}>Уже есть аккаунт? <b>Войти</b></button>}
          {mode === 'sign-in' && <><button type="button" onClick={() => { setMode('sign-up'); setErrorMessage('') }}>Нет аккаунта? <b>Создать</b></button><button type="button" onClick={() => { setMode('reset'); setErrorMessage('') }}>Забыли пароль?</button></>}
          {mode === 'reset' && <button type="button" onClick={() => { setMode('sign-in'); setErrorMessage('') }}>Вернуться ко входу</button>}
          {mode === 'update-password' && <button type="button" onClick={onClose}>Закрыть</button>}
        </div>
        <p className="auth-legal-link">Продолжая, ты принимаешь <button type="button" onClick={() => { onClose(); onOpenLegal('terms') }}>условия использования</button> и <button type="button" onClick={() => { onClose(); onOpenLegal('privacy') }}>политику конфиденциальности</button>.</p>
      </section>
    </div>
  )
}

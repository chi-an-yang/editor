import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [locale, setLocale] = useState<'en' | 'zh-TW'>('en')

  const translations = {
    en: {
      title: 'Vite + React',
      countLabel: 'count is',
      editLine: 'Edit src/App.tsx and save to test HMR',
      readDocs: 'Click on the Vite and React logos to learn more',
      languageLabel: 'Language',
      english: 'English',
      traditionalChinese: '繁體中文',
    },
    'zh-TW': {
      title: 'Vite + React',
      countLabel: '計數為',
      editLine: '編輯 src/App.tsx 並儲存以測試 HMR',
      readDocs: '點擊 Vite 與 React 標誌以了解更多',
      languageLabel: '語言',
      english: 'English',
      traditionalChinese: '繁體中文',
    },
  } as const

  const t = translations[locale]

  return (
    <>
      <div className="language-toggle" role="group" aria-label={t.languageLabel}>
        <span className="language-label">{t.languageLabel}:</span>
        <button
          type="button"
          className={locale === 'en' ? 'active' : ''}
          onClick={() => setLocale('en')}
        >
          {t.english}
        </button>
        <button
          type="button"
          className={locale === 'zh-TW' ? 'active' : ''}
          onClick={() => setLocale('zh-TW')}
        >
          {t.traditionalChinese}
        </button>
      </div>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>{t.title}</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          {t.countLabel} {count}
        </button>
        <p>
          {t.editLine}
        </p>
      </div>
      <p className="read-the-docs">{t.readDocs}</p>
    </>
  )
}

export default App

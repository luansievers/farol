import { useState } from 'react'

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbziX04HI0zTfFkq-OyTma8hpYQyfqfKOZKJwOnSchlYrwNfrCcKcU5lKAdpnq5eqq-S/exec'

function App() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const url = `${WEBHOOK_URL}?email=${encodeURIComponent(email)}`
      await fetch(url, { mode: 'no-cors' })
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-md z-50 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-lg">🔦</span>
            </div>
            <span className="font-semibold text-xl">Farol</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium">
            Em desenvolvimento · Lista de espera aberta
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Inteligência em{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              contratos públicos
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            IA que analisa milhares de contratos públicos, detecta anomalias e transforma documentos
            técnicos em informação acessível para investigações.
          </p>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto" id="waitlist">
            {status === 'success' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400">
                ✓ Pronto! Você será notificado quando lançarmos.
              </div>
            ) : status === 'error' ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
                Erro ao enviar. Tente novamente.
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={status === 'loading'}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {status === 'loading' ? 'Enviando...' : 'Entrar na lista'}
                </button>
              </div>
            )}
          </form>
          <p className="text-slate-500 text-sm mt-4">
            Sem spam. Apenas atualizações do produto.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            O problema que resolvemos
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon="📄"
              title="Documentos inacessíveis"
              description="Editais e contratos são PDFs técnicos, longos e difíceis de interpretar."
            />
            <ProblemCard
              icon="⏱️"
              title="Análise manual lenta"
              description="Investigar um único contrato pode levar dias. São milhares publicados por mês."
            />
            <ProblemCard
              icon="🔍"
              title="Anomalias escondidas"
              description="Preços inflados e padrões suspeitos passam despercebidos no volume de dados."
            />
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Como o Farol ajuda
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Automatizamos a coleta e análise de contratos públicos do PNCP,
            transformando dados brutos em informação acionável.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon="🤖"
              title="Resumos com IA"
              description="Transformamos PDFs complexos em resumos claros: objeto, valor, prazo, fornecedor."
            />
            <FeatureCard
              icon="⚠️"
              title="Detecção de anomalias"
              description="Algoritmos identificam preços fora do padrão, fornecedores recorrentes e outros sinais."
            />
            <FeatureCard
              icon="📊"
              title="Dashboard analítico"
              description="Visualize gastos por órgão, categoria e período. Compare com histórico."
            />
            <FeatureCard
              icon="🔔"
              title="Alertas personalizados"
              description="Receba notificações sobre novos contratos de órgãos ou temas específicos."
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">
            Para quem é o Farol
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <AudienceCard
              title="Jornalistas investigativos"
              description="Encontre pautas, verifique dados e economize tempo em investigações sobre gastos públicos."
              items={['Busca por palavras-chave', 'Exportação de dados', 'Histórico completo']}
            />
            <AudienceCard
              title="Organizações de transparência"
              description="Monitore contratações públicas em escala e identifique padrões suspeitos."
              items={['Análise em lote', 'API de dados', 'Relatórios automatizados']}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Entre na lista de espera
          </h2>
          <p className="text-slate-400 mb-8">
            Seja um dos primeiros a usar o Farol. Acesso prioritário para jornalistas e ONGs.
          </p>
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            {status === 'success' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400">
                ✓ Pronto! Você será notificado quando lançarmos.
              </div>
            ) : status === 'error' ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
                Erro ao enviar. Tente novamente.
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={status === 'loading'}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {status === 'loading' ? 'Enviando...' : 'Entrar na lista'}
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-sm">🔦</span>
            </div>
            <span className="font-medium">Farol</span>
          </div>
          <p className="text-slate-500 text-sm">
            Dados públicos do PNCP · São Paulo, Brasil
          </p>
        </div>
      </footer>
    </div>
  )
}

function ProblemCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  )
}

function AudienceCard({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-left">
      <h3 className="font-semibold text-xl mb-3">{title}</h3>
      <p className="text-slate-400 mb-4">{description}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-slate-300">
            <span className="text-blue-400">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App

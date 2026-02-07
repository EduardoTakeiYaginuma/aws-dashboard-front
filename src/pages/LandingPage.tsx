import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackPageView, trackClickFreeTest } from '../utils/analytics';
import {
  ServerIcon,
  CircleStackIcon,
  CloudArrowUpIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Análise de EC2',
    description: 'Identifique instâncias subutilizadas e receba recomendações de rightsizing.',
    icon: ServerIcon,
  },
  {
    name: 'Volumes Órfãos',
    description: 'Encontre volumes EBS não anexados que estão gerando custos desnecessários.',
    icon: CircleStackIcon,
  },
  {
    name: 'Lifecycle S3',
    description: 'Mova dados antigos para Glacier e economize até 90% em storage.',
    icon: CloudArrowUpIcon,
  },
  {
    name: 'Otimização RDS',
    description: 'Reduza custos de banco de dados com instâncias dimensionadas corretamente.',
    icon: CurrencyDollarIcon,
  },
];

const benefits = [
  {
    name: 'Análise em Tempo Real',
    description: 'Monitore seus custos e recursos 24/7 com dashboards intuitivos.',
    icon: ChartBarIcon,
  },
  {
    name: 'Segurança Garantida',
    description: 'Acesso read-only à sua conta AWS, sem riscos para sua infraestrutura.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Ação Rápida',
    description: 'Implemente recomendações com um clique e veja resultados imediatos.',
    icon: BoltIcon,
  },
];

const stats = [
  { label: 'Economia Média', value: '35%' },
  { label: 'Recursos Analisados', value: '1M+' },
  { label: 'Clientes Satisfeitos', value: '500+' },
  { label: 'Economizado Total', value: '$10M+' },
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    trackPageView('landing');
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFreeTestClick = () => {
    trackClickFreeTest();
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <nav className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto" aria-label="Global">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5 flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg"></div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">CloudCost</span>
            </a>
          </div>
          <div className="lg:flex lg:flex-1 lg:justify-end">
            <Link
              to="/free-test"
              onClick={handleFreeTestClick}
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors"
            >
              Teste Grátis <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero section */}
        <div className="relative isolate overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-600 to-purple-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>
          
          <div className="mx-auto max-w-7xl px-6 pt-32 pb-24 sm:pt-40 sm:pb-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                <BoltIcon className="h-4 w-4" />
                Análise gratuita em 2 minutos
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
                Reduza seus custos na AWS em até{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">40%</span>
              </h1>
              <p className="mt-8 text-lg leading-8 text-gray-600 sm:text-xl">
                Nossa plataforma de FinOps identifica recursos ociosos, oferece recomendações inteligentes e ajuda você a economizar milhares de dólares mensalmente.
              </p>
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/free-test"
                  onClick={handleFreeTestClick}
                  className="group rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Comece sua Análise Gratuita
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
                </Link>
                <a 
                  href="#features" 
                  className="group text-base font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors px-8 py-4"
                >
                  Descubra como
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
                </a>
              </div>

              {/* Stats */}
              <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Background gradient bottom */}
          <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
            <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-purple-600 to-indigo-600 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
          </div>
        </div>

        {/* Features Carousel */}
        <div id="features" className="py-24 sm:py-32 bg-gray-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-base font-semibold leading-7 text-indigo-600">Recursos Poderosos</h2>
              <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Uma plataforma completa para otimização de custos
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                De EC2 a RDS, nossa análise cobre os principais serviços da AWS para garantir que você não desperdice nenhum centavo.
              </p>
            </div>
            
            <div className="mt-16 max-w-4xl mx-auto">
              <div className="flex justify-center space-x-3 mb-8">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeFeature === index ? 'bg-indigo-600 w-16' : 'bg-gray-300 w-8'
                    }`}
                  />
                ))}
              </div>
              
              <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl min-h-[280px]">
                {features.map((feature, index) => (
                  <div
                    key={feature.name}
                    className={`absolute inset-0 p-12 transition-all duration-500 ${
                      activeFeature === index ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                    }`}
                  >
                    {activeFeature === index && (
                      <div className="flex flex-col items-center text-center h-full justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg">
                          <feature.icon className="h-10 w-10" aria-hidden="true" />
                        </div>
                        <h3 className="mt-6 text-2xl font-bold text-gray-900">{feature.name}</h3>
                        <p className="mt-4 text-lg text-gray-600 max-w-md">{feature.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Por que escolher CloudCost?
              </h2>
            </div>
            <div className="mx-auto max-w-7xl">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {benefits.map((benefit) => (
                  <div key={benefit.name} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
                    <div className="relative bg-white p-8 rounded-2xl border border-gray-200 group-hover:border-transparent transition duration-300">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-white transition-all duration-300">
                        <benefit.icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h3 className="mt-6 text-xl font-semibold text-gray-900">{benefit.name}</h3>
                      <p className="mt-3 text-base text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-gradient-to-b from-gray-50 to-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center mb-16">
              <h2 className="text-base font-semibold leading-7 text-indigo-600">Resultados Comprovados</h2>
              <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Empresas que confiam em nós
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Junte-se a centenas de empresas que já otimizaram seus custos na AWS
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-16">
              {[
                { icon: CheckCircleIcon, title: 'Economia Imediata', description: 'Resultados visíveis no primeiro mês', color: 'green' },
                { icon: ShieldCheckIcon, title: 'Zero Riscos', description: 'Acesso read-only garantido', color: 'blue' },
                { icon: BoltIcon, title: 'Setup Rápido', description: 'Implementação em minutos', color: 'yellow' },
                { icon: ChartBarIcon, title: 'Suporte Expert', description: 'Time dedicado ao seu sucesso', color: 'purple' },
              ].map((item, index) => (
                <div key={index} className="relative group">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl mb-4 ${
                      item.color === 'green' ? 'bg-green-100 text-green-600' :
                      item.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      item.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      <item.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="mx-auto max-w-3xl">
              <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-gray-100">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-6 w-6 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl sm:text-2xl font-medium text-gray-900 mb-6">
                  "Reduzimos nossos custos AWS em 35% no primeiro trimestre. O ROI foi imediato e a plataforma é extremamente fácil de usar."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    JD
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Eduardo</div>
                    <div className="text-sm text-gray-600">CTO, ERPHunt</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800"></div>
          <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Pronto para transformar seus custos?
              </h2>
              <p className="mt-6 text-lg leading-8 text-indigo-100">
                Comece agora e veja em minutos o potencial de economia na sua conta AWS. É rápido, seguro e 100% gratuito.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/free-test"
                  onClick={handleFreeTestClick}
                  className="group rounded-xl bg-white px-8 py-4 text-base font-semibold text-indigo-600 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                >
                  Quero Economizar Agora
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
                </Link>
              </div>
              <p className="mt-6 text-sm text-indigo-200">
                ✓ Sem cartão de crédito  ✓ Sem compromisso  ✓ Resultados em 2 minutos
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 lg:px-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold text-white">CloudCost</span>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            Otimização inteligente de custos na AWS
          </p>
          <div className="mt-8 text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} CloudCost. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackPageView, trackClickFreeTest } from '../utils/analytics';

export default function LandingPage() {
  useEffect(() => {
    trackPageView('landing');
  }, []);

  const handleFreeTestClick = () => {
    trackClickFreeTest();
  };

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="landing-logo">CloudCost</div>
          <Link to="/free-test" className="btn btn-primary" onClick={handleFreeTestClick}>
            Teste Gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="landing-container">
          <h1 className="hero-title">
            Reduza ate 40% dos seus custos AWS
          </h1>
          <p className="hero-subtitle">
            Identifique recursos ociosos, receba recomendacoes inteligentes e
            economize milhares de dolares por mes com nossa plataforma de FinOps.
          </p>
          <div className="hero-cta">
            <Link to="/free-test" className="btn btn-primary btn-lg" onClick={handleFreeTestClick}>
              Comece Gratis
            </Link>
            <span className="hero-note">Nenhum cartao necessario</span>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">$2.4M+</span>
              <span className="hero-stat-label">Economia identificada</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">500+</span>
              <span className="hero-stat-label">Contas analisadas</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">15+</span>
              <span className="hero-stat-label">Servicos AWS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="section section-light">
        <div className="landing-container">
          <h2 className="section-title">O problema que voce conhece</h2>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">$</div>
              <h3>Faturas surpresa</h3>
              <p>Custos AWS que crescem sem controle, dificultando o planejamento financeiro.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">?</div>
              <h3>Falta de visibilidade</h3>
              <p>Dificil saber quais recursos estao gerando custos e quais estao ociosos.</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">!</div>
              <h3>Tempo desperdicado</h3>
              <p>Horas navegando no console AWS tentando identificar oportunidades de economia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="section">
        <div className="landing-container">
          <h2 className="section-title">Nossa solucao</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>EC2</div>
              <h3>Analise de EC2</h3>
              <p>Identifique instancias subutilizadas e receba recomendacoes de rightsizing.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#dcfce7', color: '#166534' }}>EBS</div>
              <h3>Volumes Orfaos</h3>
              <p>Encontre volumes EBS nao anexados que estao gerando custos desnecessarios.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#fef3c7', color: '#92400e' }}>S3</div>
              <h3>Lifecycle S3</h3>
              <p>Mova dados antigos para Glacier e economize ate 90% em storage.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>RDS</div>
              <h3>Otimizacao RDS</h3>
              <p>Reduza custos de banco de dados com instancias dimensionadas corretamente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section-light">
        <div className="landing-container">
          <h2 className="section-title">Como funciona</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Configure a IAM Role</h3>
              <p>Crie uma role com permissoes read-only seguindo nosso guia passo a passo.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Conecte sua conta</h3>
              <p>Informe o ARN da role e o ID da conta AWS para iniciar a analise.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Receba recomendacoes</h3>
              <p>Visualize um dashboard completo com todas as oportunidades de economia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="section cta-section">
        <div className="landing-container">
          <h2 className="cta-title">Pronto para economizar?</h2>
          <p className="cta-subtitle">Conecte sua conta AWS em 5 minutos e descubra quanto voce pode economizar.</p>
          <Link to="/free-test" className="btn btn-primary btn-lg" onClick={handleFreeTestClick}>
            Testar Agora - E Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-brand">CloudCost</div>
            <p className="footer-copy">Plataforma de otimizacao de custos AWS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

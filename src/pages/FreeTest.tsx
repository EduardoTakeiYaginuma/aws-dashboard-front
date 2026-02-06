import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  trackViewInstructions,
  trackClickConnect,
  trackConnectSuccess,
  trackConnectError
} from '../utils/analytics';
import { api } from '../api';

const TRUST_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_CLOUDCOST_ACCOUNT:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "cloudcost-external-id"
        }
      }
    }
  ]
}`;

const PERMISSIONS_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudCostReadOnly",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "ec2:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketTagging",
        "s3:GetBucketVersioning",
        "s3:ListBucket",
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "lambda:ListFunctions",
        "lambda:GetFunction",
        "elasticloadbalancing:Describe*",
        "autoscaling:Describe*",
        "dynamodb:ListTables",
        "dynamodb:DescribeTable",
        "sns:ListTopics",
        "sqs:ListQueues",
        "route53:ListHostedZones",
        "cloudfront:ListDistributions",
        "iam:ListRoles",
        "iam:ListUsers"
      ],
      "Resource": "*"
    }
  ]
}`;

export default function FreeTest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [roleArn, setRoleArn] = useState('');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    trackViewInstructions(step);
  }, [step]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    trackClickConnect();

    try {
      // Criar workspace
      const workspace = await api.createWorkspace({
        name: `AWS Account ${accountId}`,
        roleArn,
        awsAccountId: accountId,
      });

      // Testar conexao
      await api.testConnection(workspace.id);

      trackConnectSuccess(workspace.id);

      // Redirecionar para dashboard
      navigate(`/dashboard?workspace=${workspace.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar';
      setError(errorMessage);
      trackConnectError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="free-test">
      <header className="landing-header">
        <div className="landing-container">
          <a href="/" className="landing-logo">CloudCost</a>
        </div>
      </header>

      <div className="free-test-container">
        <div className="free-test-content">
          <h1>Configure sua conta AWS</h1>
          <p className="free-test-subtitle">
            Siga os passos abaixo para criar uma IAM Role com permissoes read-only.
            Isso permite que analisemos seus recursos sem fazer nenhuma alteracao.
          </p>

          {/* Progress Steps */}
          <div className="steps-progress">
            <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>3</div>
            <div className={`step-line ${step >= 4 ? 'active' : ''}`}></div>
            <div className={`step-indicator ${step >= 4 ? 'active' : ''}`}>4</div>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="step-content">
              <h2>Passo 1: Criar IAM Role</h2>
              <ol className="instruction-list">
                <li>Acesse o <a href="https://console.aws.amazon.com/iam" target="_blank" rel="noopener noreferrer">Console IAM da AWS</a></li>
                <li>No menu lateral, clique em <strong>Roles</strong></li>
                <li>Clique em <strong>Create role</strong></li>
                <li>Selecione <strong>Custom trust policy</strong></li>
              </ol>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Proximo
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="step-content">
              <h2>Passo 2: Trust Policy</h2>
              <p>Cole a seguinte policy no campo de trust policy:</p>
              <div className="code-block">
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(TRUST_POLICY, 'trust')}
                >
                  {copied === 'trust' ? 'Copiado!' : 'Copiar'}
                </button>
                <pre>{TRUST_POLICY}</pre>
              </div>
              <div className="step-buttons">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  Voltar
                </button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>
                  Proximo
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="step-content">
              <h2>Passo 3: Permissions Policy</h2>
              <p>Adicione a seguinte policy de permissoes (read-only):</p>
              <div className="code-block">
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(PERMISSIONS_POLICY, 'permissions')}
                >
                  {copied === 'permissions' ? 'Copiado!' : 'Copiar'}
                </button>
                <pre>{PERMISSIONS_POLICY}</pre>
              </div>
              <p className="note">
                Essas permissoes sao apenas de leitura. Nao fazemos nenhuma alteracao nos seus recursos.
              </p>
              <div className="step-buttons">
                <button className="btn btn-secondary" onClick={() => setStep(2)}>
                  Voltar
                </button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>
                  Proximo
                </button>
              </div>
            </div>
          )}

          {/* Step 4 - Connect */}
          {step === 4 && (
            <div className="step-content">
              <h2>Passo 4: Conectar</h2>
              <p>Apos criar a role, copie o ARN e informe abaixo:</p>

              <form onSubmit={handleConnect} className="connect-form">
                <div className="form-group">
                  <label htmlFor="roleArn">Role ARN</label>
                  <input
                    id="roleArn"
                    type="text"
                    placeholder="arn:aws:iam::123456789012:role/CloudCostRole"
                    value={roleArn}
                    onChange={(e) => setRoleArn(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="accountId">AWS Account ID</label>
                  <input
                    id="accountId"
                    type="text"
                    placeholder="123456789012"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="error-msg">{error}</div>}

                <div className="step-buttons">
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>
                    Voltar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Conectando...' : 'Conectar Conta'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar Help */}
        <aside className="free-test-sidebar">
          <div className="help-card">
            <h3>Precisa de ajuda?</h3>
            <p>A configuracao leva menos de 5 minutos e e completamente segura.</p>
            <ul>
              <li>Permissoes read-only</li>
              <li>Nenhuma alteracao nos recursos</li>
              <li>Dados criptografados</li>
              <li>Desconecte a qualquer momento</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

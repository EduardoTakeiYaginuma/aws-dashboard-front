import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  trackViewInstructions,
  trackClickConnect,
  trackConnectSuccess,
  trackConnectError
} from '../utils/analytics';
import { api } from '../api';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

// Account ID do CloudCost - a conta que vai assumir a role do cliente
const CLOUDCOST_ACCOUNT_ID = '181640953326';

// Trust Policy - permite que a conta do CloudCost assuma a role do cliente
const TRUST_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${CLOUDCOST_ACCOUNT_ID}:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "cloudcost-secure-connection"
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
      const workspace = await api.createWorkspace({
        name: `AWS Account ${accountId}`,
        roleArn,
        awsAccountId: accountId,
      });

      await api.testConnection(workspace.id);
      trackConnectSuccess(workspace.id);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg"></div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">CloudCost</span>
          </a>
          <a href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            ← Voltar ao início
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hero Section */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Conecte sua conta AWS
              </h1>
              <p className="text-lg text-gray-600">
                Crie uma IAM Role com permissões read-only para que possamos analisar seus recursos.
                O processo leva menos de 5 minutos.
              </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-12">
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full font-bold transition-all duration-300 ${
                        step >= num
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step > num ? (
                          <CheckCircleIcon className="h-6 w-6" />
                        ) : (
                          num
                        )}
                      </div>
                      <span className={`mt-2 text-xs font-medium ${
                        step >= num ? 'text-indigo-600' : 'text-gray-500'
                      }`}>
                        {num === 1 && 'Criar Role'}
                        {num === 2 && 'Adicionar Policy'}
                        {num === 3 && 'Conectar'}
                      </span>
                    </div>
                    {num < 3 && (
                      <div className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${
                        step > num ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
              {/* Step 1 - Criar Role com Trust Policy */}
              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Passo 1: Criar IAM Role
                  </h2>

                  <ol className="space-y-5 mb-8">
                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="flex-1">
                        <a
                          href="https://console.aws.amazon.com/iam/home#/roles"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          Abra o Console IAM da AWS → Roles <ArrowRightIcon className="inline h-4 w-4 ml-1" />
                        </a>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <span className="text-gray-700 flex-1">
                        Clique em <strong>"Create role"</strong>
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <span className="text-gray-700 flex-1">
                        Em "Trusted entity type", selecione <strong>"Custom trust policy"</strong>
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-700 block mb-3">
                          Apague o conteúdo padrão e cole a Trust Policy abaixo:
                        </span>
                        <div className="relative">
                          <button
                            className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow"
                            onClick={() => copyToClipboard(TRUST_POLICY, 'trust')}
                          >
                            {copied === 'trust' ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <DocumentDuplicateIcon className="h-4 w-4" />
                                Copiar
                              </>
                            )}
                          </button>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-xs leading-relaxed shadow-inner">
                            {TRUST_POLICY}
                          </pre>
                        </div>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        5
                      </div>
                      <span className="text-gray-700 flex-1">
                        Clique em <strong>"Next"</strong> para continuar
                      </span>
                    </li>
                  </ol>

                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
                    <span className="text-blue-600 text-xl">ℹ️</span>
                    <p className="text-sm text-blue-800">
                      <strong>Por que isso?</strong> A Trust Policy permite que o CloudCost acesse seus recursos usando credenciais temporárias e seguras. Não armazenamos nenhuma credencial permanente.
                    </p>
                  </div>

                  <button
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    onClick={() => setStep(2)}
                  >
                    Próximo: Adicionar Permissões <ArrowRightIcon className="inline h-5 w-5 ml-2" />
                  </button>
                </div>
              )}

              {/* Step 2 - Adicionar Permissions Policy */}
              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Passo 2: Adicionar Permissões
                  </h2>

                  <ol className="space-y-5 mb-8">
                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <span className="text-gray-700 flex-1">
                        Na tela "Add permissions", clique em <strong>"Create policy"</strong> (abre uma nova aba)
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <span className="text-gray-700 flex-1">
                        Selecione a aba <strong>"JSON"</strong>
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-700 block mb-3">
                          Apague o conteúdo e cole a policy abaixo:
                        </span>
                        <div className="relative">
                          <button
                            className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow"
                            onClick={() => copyToClipboard(PERMISSIONS_POLICY, 'permissions')}
                          >
                            {copied === 'permissions' ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <DocumentDuplicateIcon className="h-4 w-4" />
                                Copiar
                              </>
                            )}
                          </button>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-xs leading-relaxed shadow-inner max-h-64">
                            {PERMISSIONS_POLICY}
                          </pre>
                        </div>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <span className="text-gray-700 flex-1">
                        Clique em <strong>"Next"</strong>, dê o nome <strong>"CloudCostReadOnlyPolicy"</strong> e clique em <strong>"Create policy"</strong>
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        5
                      </div>
                      <span className="text-gray-700 flex-1">
                        Volte à aba da Role, clique no botão de refresh 🔄 ao lado de "Filter policies"
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        6
                      </div>
                      <span className="text-gray-700 flex-1">
                        Busque e selecione <strong>"CloudCostReadOnlyPolicy"</strong>, depois clique em <strong>"Next"</strong>
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm flex-shrink-0 mt-0.5">
                        7
                      </div>
                      <span className="text-gray-700 flex-1">
                        Em "Role name", digite <strong>"CloudCostRole"</strong> e clique em <strong>"Create role"</strong>
                      </span>
                    </li>
                  </ol>

                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
                    <ShieldCheckIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">
                      <strong>100% Seguro:</strong> Essas permissões são apenas de leitura. Não fazemos nenhuma alteração nos seus recursos.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeftIcon className="inline h-5 w-5 mr-2" />
                      Voltar
                    </button>
                    <button
                      className="flex-1 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                      onClick={() => setStep(3)}
                    >
                      Próximo: Conectar <ArrowRightIcon className="inline h-5 w-5 ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 - Conectar */}
              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Passo 3: Conectar sua Conta
                  </h2>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Como encontrar o Role ARN:</h3>
                    <ol className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-indigo-600">1.</span>
                        <span>No console IAM, clique em <strong>Roles</strong> no menu lateral</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-indigo-600">2.</span>
                        <span>Busque e clique em <strong>CloudCostRole</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold text-indigo-600">3.</span>
                        <span>Copie o <strong>ARN</strong> que aparece no topo da página</span>
                      </li>
                    </ol>
                  </div>

                  <form onSubmit={handleConnect} className="space-y-5">
                    <div>
                      <label htmlFor="accountId" className="block text-sm font-semibold text-gray-700 mb-2">
                        AWS Account ID
                      </label>
                      <input
                        id="accountId"
                        type="text"
                        placeholder="123456789012"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        required
                        maxLength={12}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-200 font-mono"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        O ID da sua conta AWS (12 dígitos). Encontre no canto superior direito do console.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="roleArn" className="block text-sm font-semibold text-gray-700 mb-2">
                        Role ARN
                      </label>
                      <input
                        id="roleArn"
                        type="text"
                        placeholder="arn:aws:iam::123456789012:role/CloudCostRole"
                        value={roleArn}
                        onChange={(e) => setRoleArn(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-200 font-mono text-sm"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Formato: arn:aws:iam::ACCOUNT_ID:role/CloudCostRole
                      </p>
                    </div>

                    {error && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="text-red-600 text-lg">⚠️</div>
                        <div>
                          <p className="text-sm text-red-800 font-medium">Erro ao conectar</p>
                          <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
                        onClick={() => setStep(2)}
                      >
                        <ArrowLeftIcon className="inline h-5 w-5 mr-2" />
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !roleArn || !accountId}
                        className="flex-1 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {loading ? (
                          <>
                            <span className="inline-block animate-spin mr-2">⏳</span>
                            Conectando...
                          </>
                        ) : (
                          <>
                            Conectar Conta AWS <ArrowRightIcon className="inline h-5 w-5 ml-2" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Help Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
                <h3 className="text-xl font-bold mb-4">Por que criar uma Role?</h3>
                <p className="text-indigo-100 mb-6">
                  IAM Roles são a forma mais segura de dar acesso à sua conta AWS. Diferente de Access Keys:
                </p>
                <ul className="space-y-3">
                  {[
                    { icon: ShieldCheckIcon, text: 'Credenciais temporárias' },
                    { icon: LockClosedIcon, text: 'Sem senhas armazenadas' },
                    { icon: CheckCircleIcon, text: 'Revogue acesso a qualquer momento' },
                    { icon: ClockIcon, text: 'Auditável via CloudTrail' },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Badge */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">100% Read-Only</div>
                    <div className="text-xs text-gray-600">Sem alterações nos recursos</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  As permissões solicitadas são apenas de leitura. Não modificamos, criamos ou excluímos nenhum recurso.
                </p>
              </div>

              {/* Quick Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h4 className="font-semibold text-amber-900 mb-3">💡 Dica</h4>
                <p className="text-sm text-amber-800">
                  {step === 1 && "A Trust Policy define QUEM pode assumir a role. No nosso caso, é a conta do CloudCost."}
                  {step === 2 && "A Permissions Policy define O QUE a role pode fazer. Usamos apenas permissões de leitura."}
                  {step === 3 && "O Role ARN é o identificador único da role. Ele sempre começa com 'arn:aws:iam::'."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

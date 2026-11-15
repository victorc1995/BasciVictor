"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  PiggyBank,
  BadgeDollarSign,
  CreditCard,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  ArrowRightLeft,
  Download,
  FileText,
  AlertCircle,
  CalendarRange,
  Clock,
  Layers,
} from "lucide-react";
import {
  CartaoBanco,
  CompraCartao,
  ContaCasa,
  ContrachequeConfirmadoMes,
  MovimentacaoPoupanca,
  Pagador,
  ParametrosSalario,
  ProjecaoMesContas,
  TABELA_RS_2026,
  calcularContrachequeRS,
  calcularProjecao6Meses,
  formatarMesAnoLabel,
  formatarMoeda,
  somarMeses,
} from "@/lib/finance-engine";
import {
  INITIAL_COMPRAS_CARTAO,
  INITIAL_CONTAS_CASA,
  INITIAL_CONTRACHEQUES,
  INITIAL_POUPANCA,
  INITIAL_SALARIO_LETICIA,
  INITIAL_SALARIO_VICTOR,
} from "@/lib/initial-data";
import { extrairComprasDePDF, extrairDadosQualquerPDF, parsearLinhasFatura } from "@/lib/pdf-parser";

type AbaAtiva = "inicio" | "poupanca" | "salarios" | "cartoes" | "contas";

export default function DashboardPage() {
  const [aba, setAba] = useState<AbaAtiva>("inicio");
  const [mesSelecionado, setMesSelecionado] = useState<string>("2026-11");
  const [carregado, setCarregado] = useState(false);

  // Estados principais (persistidos em LocalStorage + Backup JSON)
  const [contasCasa, setContasCasa] = useState<ContaCasa[]>(INITIAL_CONTAS_CASA);
  const [poupanca, setPoupanca] = useState<MovimentacaoPoupanca[]>(INITIAL_POUPANCA);
  const [salVictor, setSalVictor] = useState<ParametrosSalario>(INITIAL_SALARIO_VICTOR);
  const [salLeticia, setSalLeticia] = useState<ParametrosSalario>(INITIAL_SALARIO_LETICIA);
  const [comprasCartao, setComprasCartao] = useState<CompraCartao[]>(INITIAL_COMPRAS_CARTAO);
  const [contracheques, setContracheques] = useState<Record<string, ContrachequeConfirmadoMes>>(INITIAL_CONTRACHEQUES);

  // Modal de inclusão de contas / upload de PDF na Tela Inicial
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoInclusao, setTipoInclusao] = useState<"conta" | "fatura_pdf">("conta");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<ContaCasa["categoria"]>("Luz");
  const [novoValor, setNovoValor] = useState("");
  const [novoVencimento, setNovoVencimento] = useState("2026-11-20");
  const [novoPagador, setNovoPagador] = useState<Pagador>("DIV");

  // Upload PDF
  const [bancoPDF, setBancoPDF] = useState<CartaoBanco>("C6 Bank");
  const [statusPDF, setStatusPDF] = useState<string>("");

  // Formulário Poupança
  const [poupData, setPoupData] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [poupDesc, setPoupDesc] = useState("");
  const [poupTipo, setPoupTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [poupStatus, setPoupStatus] = useState<"CONFIRMADO" | "PREVISTO">("CONFIRMADO");
  const [poupValor, setPoupValor] = useState("");
  const [poupCat, setPoupCat] = useState<MovimentacaoPoupanca["categoria"]>("Metas / Projetos");

  // Filtro Cartões
  const [bancoFiltro, setBancoFiltro] = useState<CartaoBanco>("C6 Bank");

  // Aba 5 Contas & Projeção 6 Meses
  const [mesVisualizadoContas, setMesVisualizadoContas] = useState<string>("2026-11");
  const [bancoFaturaConf, setBancoFaturaConf] = useState<CartaoBanco>("C6 Bank");
  const [valorFaturaConf, setValorFaturaConf] = useState("");

  // Carrega dados salvos localmente
  useEffect(() => {
    const saved = localStorage.getItem("financas_victor_leticia_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.contasCasa) setContasCasa(parsed.contasCasa);
        if (parsed.poupanca) {
          const limpos = parsed.poupanca.map((p: any) => ({
            ...p,
            categoria: (p.categoria === "Carro / Creta" || p.categoria === "Carro/Creta") ? "Metas / Projetos" : p.categoria,
            status: p.status || "CONFIRMADO",
          }));
          setPoupanca(limpos);
        }
        if (parsed.salVictor) setSalVictor(parsed.salVictor);
        if (parsed.salLeticia) setSalLeticia(parsed.salLeticia);
        if (parsed.comprasCartao) setComprasCartao(parsed.comprasCartao);
        if (parsed.contracheques) setContracheques(parsed.contracheques);
      } catch (e) {
        console.error("Erro ao ler dados salvos:", e);
      }
    }
    setCarregado(true);
  }, []);

  // Salva automaticamente a cada alteração
  useEffect(() => {
    if (!carregado) return;
    localStorage.setItem(
      "financas_victor_leticia_v2",
      JSON.stringify({ contasCasa, poupanca, salVictor, salLeticia, comprasCartao, contracheques })
    );
  }, [contasCasa, poupanca, salVictor, salLeticia, comprasCartao, contracheques, carregado]);

  // Cálculos de Salários (Legislação RS 2026)
  const resVictor = useMemo(() => calcularContrachequeRS(salVictor), [salVictor]);
  const resLeticia = useMemo(() => calcularContrachequeRS(salLeticia), [salLeticia]);

  // Contracheque do Mês Selecionado (Confirmado vs Previsão)
  const contrachequeMes = contracheques[mesSelecionado] || {
    victorConfirmado: false,
    victorValorReal: resVictor.totalDisponivelMes,
    leticiaConfirmada: false,
    leticiaValorReal: resLeticia.totalDisponivelMes,
  };

  const salarioVictorFinal = contrachequeMes.victorConfirmado
    ? contrachequeMes.victorValorReal
    : resVictor.totalDisponivelMes;

  const salarioLeticiaFinal = contrachequeMes.leticiaConfirmada
    ? contrachequeMes.leticiaValorReal
    : resLeticia.totalDisponivelMes;

  const salarioLiquidoTotalCasal = salarioVictorFinal + salarioLeticiaFinal;
  const salarioPrevistoTotalCasal = resVictor.totalDisponivelMes + resLeticia.totalDisponivelMes;

  // Handlers para confirmação de contracheques
  const confirmarContrachequeVictor = (valor: number) => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          leticiaConfirmada: false,
          leticiaValorReal: resLeticia.totalDisponivelMes,
        }),
        victorConfirmado: true,
        victorValorReal: valor,
      },
    }));
  };

  const reverterContrachequeVictor = () => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          leticiaConfirmada: false,
          leticiaValorReal: resLeticia.totalDisponivelMes,
        }),
        victorConfirmado: false,
        victorValorReal: resVictor.totalDisponivelMes,
      },
    }));
  };

  const confirmarContrachequeLeticia = (valor: number) => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          victorConfirmado: false,
          victorValorReal: resVictor.totalDisponivelMes,
        }),
        leticiaConfirmada: true,
        leticiaValorReal: valor,
      },
    }));
  };

  const reverterContrachequeLeticia = () => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          victorConfirmado: false,
          victorValorReal: resVictor.totalDisponivelMes,
        }),
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.totalDisponivelMes,
      },
    }));
  };

  // Cálculos de Poupança (Confirmado vs Previsão Futura)
  const resumoPoupanca = useMemo(() => {
    const totalEntradasConfirmadas = poupanca
      .filter((p) => p.tipo === "ENTRADA" && p.status !== "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const totalSaidasConfirmadas = poupanca
      .filter((p) => p.tipo === "SAIDA" && p.status !== "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const saldoConfirmado = totalEntradasConfirmadas - totalSaidasConfirmadas;

    const totalEntradasPrevistas = poupanca
      .filter((p) => p.tipo === "ENTRADA" && p.status === "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const totalSaidasPrevistas = poupanca
      .filter((p) => p.tipo === "SAIDA" && p.status === "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const saldoPrevistoPendente = totalEntradasPrevistas - totalSaidasPrevistas;
    const saldoTotalProjetado = saldoConfirmado + saldoPrevistoPendente;

    const reservaEmergencia = 5000;
    const saldoLivreConfirmado = Math.max(0, saldoConfirmado - reservaEmergencia);
    const saldoLivreProjetado = Math.max(0, saldoTotalProjetado - reservaEmergencia);

    return {
      totalEntradasConfirmadas,
      totalSaidasConfirmadas,
      saldoConfirmado,
      saldoTotal: saldoConfirmado,
      totalEntradasPrevistas,
      totalSaidasPrevistas,
      saldoPrevistoPendente,
      saldoTotalProjetado,
      reservaEmergencia,
      saldoLivreConfirmado,
      saldoLivreProjetado,
      saldoLivreMetas: saldoLivreConfirmado,
    };
  }, [poupanca]);

  // Projeção dos Próximos 6 Meses para a Aba 5 Contas
  const projecao6Meses = useMemo(() => {
    return calcularProjecao6Meses(mesSelecionado, contasCasa, comprasCartao);
  }, [mesSelecionado, contasCasa, comprasCartao]);

  // Sincroniza mês visualizado da aba contas quando muda o mês principal
  useEffect(() => {
    setMesVisualizadoContas(mesSelecionado);
  }, [mesSelecionado]);

  // Dados do mês visualizado na Aba 5 (Contas & Projeção)
  const dadosMesVisualizado = useMemo(() => {
    const found = projecao6Meses.find((p) => p.mesAno === mesVisualizadoContas);
    if (found) return found;
    return (
      projecao6Meses[0] || {
        mesAno: mesVisualizadoContas,
        label: formatarMesAnoLabel(mesVisualizadoContas),
        totalContasFixas: 0,
        totalFaturaC6: 0,
        totalFaturaSicredi: 0,
        totalGeral: 0,
        isConfirmado: false,
        contas: [],
        parcelasProjetadas: [],
      }
    );
  }, [projecao6Meses, mesVisualizadoContas]);

  const mesConfirmadoInfo = useMemo(() => {
    return contasCasa.find(
      (c) => c.mesAno === mesVisualizadoContas && c.categoria === "Fatura Cartão" && c.status === "CONFIRMADO"
    );
  }, [contasCasa, mesVisualizadoContas]);

  // Cálculos de Cartões no Mês Selecionado
  const resumoCartoesMes = useMemo(() => {
    const doMes = comprasCartao.filter((c) => c.mesFatura === mesSelecionado);
    let vicDireto = 0;
    let leDireto = 0;
    let divTotal = 0;

    doMes.forEach((item) => {
      if (item.quemPaga === "VIC") vicDireto += item.valor;
      else if (item.quemPaga === "LE") leDireto += item.valor;
      else divTotal += item.valor;
    });

    const metadeDiv = divTotal / 2;
    return {
      vicDireto,
      leDireto,
      divTotal,
      metadeDiv,
      totalVictorCartoes: vicDireto + metadeDiv,
      totalLeticiaCartoes: leDireto + metadeDiv,
      totalGeralCartoes: vicDireto + leDireto + divTotal,
    };
  }, [comprasCartao, mesSelecionado]);

  // Cálculos de Contas da Casa + Cartões (Gasto Total de Cada Um no Mês)
  const resumoMensalCasal = useMemo(() => {
    const contasDoMes = contasCasa.filter((c) => c.mesAno === mesSelecionado);
    let casaVic = 0;
    let casaLe = 0;
    let casaDiv = 0;

    contasDoMes.forEach((c) => {
      if (c.quemPaga === "VIC") casaVic += c.valor;
      else if (c.quemPaga === "LE") casaLe += c.valor;
      else casaDiv += c.valor;
    });

    const totalGastoVictor = casaVic + casaDiv / 2 + resumoCartoesMes.totalVictorCartoes;
    const totalGastoLeticia = casaLe + casaDiv / 2 + resumoCartoesMes.totalLeticiaCartoes;
    const totalGastoCasal = totalGastoVictor + totalGastoLeticia;

    return {
      contasDoMes,
      totalGastoVictor,
      totalGastoLeticia,
      totalGastoCasal,
      saldoVictor: salarioVictorFinal - totalGastoVictor,
      saldoLeticia: salarioLeticiaFinal - totalGastoLeticia,
    };
  }, [contasCasa, mesSelecionado, resumoCartoesMes, salarioVictorFinal, salarioLeticiaFinal]);

  // Handlers
  const adicionarContaCasa = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(novoValor.replace(",", "."));
    if (!novaDescricao || isNaN(val) || val <= 0) return;

    const nova: ContaCasa = {
      id: Date.now().toString(),
      mesAno: mesSelecionado,
      descricao: novaDescricao,
      categoria: novaCategoria,
      valor: val,
      vencimento: novoVencimento,
      quemPaga: novoPagador,
      pago: false,
      status: "CONFIRMADO",
    };
    setContasCasa((prev) => [nova, ...prev]);
    setNovaDescricao("");
    setNovoValor("");
    setModalAberto(false);
  };

  const handleUploadQualquerPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusPDF("Lendo arquivo PDF e analisando dados...");
    try {
      const dados = await extrairDadosQualquerPDF(file);

      // Preenche os campos do formulário para o usuário
      if (dados.valor > 0) {
        setNovoValor(dados.valor.toFixed(2));
      }
      if (dados.vencimento) {
        setNovoVencimento(dados.vencimento);
      }
      if (dados.descricao) {
        setNovaDescricao(dados.descricao);
      }
      if (dados.categoria) {
        setNovaCategoria(dados.categoria);
      }

      // Se for fatura de cartão (C6 Bank ou Sicredi), também extrai as compras itemizadas para a aba Cartões
      if (dados.isFaturaCartao && dados.bancoCartao) {
        const banco = dados.bancoCartao;
        const compras = parsearLinhasFatura(dados.textoCompleto, banco, mesSelecionado);
        if (compras.length > 0) {
          const comIds: CompraCartao[] = compras.map((item, idx) => ({
            ...item,
            id: `${Date.now()}-${idx}`,
          }));
          setComprasCartao((prev) => [...comIds, ...prev]);
          setStatusPDF(
            `✓ Fatura de Cartão detectada: ${dados.descricao} • R$ ${dados.valor.toFixed(2)} • Vencimento: ${dados.vencimento} • ${compras.length} compras importadas para a Aba Cartões!`
          );
        } else {
          setStatusPDF(
            `✓ Fatura detectada: ${dados.descricao} • R$ ${dados.valor.toFixed(2)} • Vencimento: ${dados.vencimento}.`
          );
        }
      } else {
        setStatusPDF(
          `✓ PDF detectado com sucesso: ${dados.descricao} • R$ ${dados.valor > 0 ? dados.valor.toFixed(2) : "0,00"} • Vencimento: ${dados.vencimento || "Não identificado"}. Os campos foram preenchidos abaixo.`
        );
      }

      // Alterna automaticamente para a aba de conferência manual
      setTipoInclusao("conta");
    } catch (err) {
      console.error(err);
      setStatusPDF("Erro ao processar o PDF. Verifique se o arquivo não possui senha ou se é legível.");
    }
  };

  const adicionarMovPoupanca = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(poupValor.replace(",", "."));
    if (!poupDesc || isNaN(val) || val <= 0) return;
    setPoupanca((prev) => [
      {
        id: Date.now().toString(),
        data: poupData || new Date().toISOString().slice(0, 10),
        descricao: poupDesc,
        tipo: poupTipo,
        valor: val,
        categoria: poupCat,
        status: poupStatus,
      },
      ...prev,
    ]);
    setPoupDesc("");
    setPoupValor("");
  };

  const alternarStatusPoupanca = (id: string) => {
    setPoupanca((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "PREVISTO" ? "CONFIRMADO" : "PREVISTO" }
          : p
      )
    );
  };

  const handleConfirmarFaturaMes = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorFaturaConf.replace(",", "."));
    if (isNaN(val) || val <= 0) return;

    const novaFatura: ContaCasa = {
      id: `fat-conf-${mesVisualizadoContas}-${bancoFaturaConf}-${Date.now()}`,
      mesAno: mesVisualizadoContas,
      descricao: `Fatura ${bancoFaturaConf} (Confirmada)`,
      categoria: "Fatura Cartão",
      valor: val,
      vencimento: `${mesVisualizadoContas}-05`,
      quemPaga: "DIV",
      pago: false,
      status: "CONFIRMADO",
    };

    setContasCasa((prev) => [
      novaFatura,
      ...prev.filter(
        (c) =>
          !(
            c.mesAno === mesVisualizadoContas &&
            c.categoria === "Fatura Cartão" &&
            c.descricao.includes(bancoFaturaConf)
          )
      ),
    ]);
    setValorFaturaConf("");
  };

  const alternarPagoConta = (id: string) => {
    setContasCasa((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pago: !c.pago } : c))
    );
  };

  const alterarPagadorCompra = (id: string, novoPagador: Pagador) => {
    setComprasCartao((prev) => prev.map((c) => (c.id === id ? { ...c, quemPaga: novoPagador } : c)));
  };

  const exportarBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ contasCasa, poupanca, salVictor, salLeticia, comprasCartao, contracheques }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-financas-victor-leticia-${mesSelecionado}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header Superior */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Gestão Financeira — Victor & Letícia
            </h1>
            <p className="text-xs text-slate-400">CBMRS / BMRS • Sistema Autônomo Sem Planilha</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300">Mês Referência:</label>
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={exportarBackup}
              title="Baixar backup dos dados"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navegação das 5 Abas */}
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-800">
          {[
            { id: "inicio", label: "1. Tela Inicial", icon: Wallet },
            { id: "poupanca", label: "2. Poupança & Metas", icon: PiggyBank },
            { id: "salarios", label: "3. Salários (Legislação RS)", icon: BadgeDollarSign },
            { id: "cartoes", label: "4. Cartões (C6 & Sicredi)", icon: CreditCard },
            { id: "contas", label: "5. Contas & Projeção 6 Meses", icon: CalendarRange },
          ].map((item) => {
            const Icon = item.icon;
            const ativo = aba === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAba(item.id as AbaAtiva)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  ativo
                    ? "border-emerald-400 text-emerald-400 bg-slate-800/50"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* ========================================================= */}
        {/* ABA 1: TELA INICIAL                                       */}
        {/* ========================================================= */}
        {aba === "inicio" && (
          <div className="space-y-6">
            {/* Barra de Ação Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Resumo Geral do Mês ({mesSelecionado})</h2>
                <p className="text-sm text-slate-500">
                  Consolidado automático dos salários líquidos, faturas importadas e contas da casa.
                </p>
              </div>
              <button
                onClick={() => setModalAberto(true)}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition"
              >
                <Plus className="w-5 h-5" />
                Incluir Contas / Fatura PDF
              </button>
            </div>

            {/* 4 Cards Principais (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Salário Líquido Total (Casal)</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {formatarMoeda(salarioLiquidoTotalCasal)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Victor: {formatarMoeda(resVictor.totalDisponivelMes)} • Letícia: {formatarMoeda(resLeticia.totalDisponivelMes)}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Gastos Victor no Mês</span>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">
                  {formatarMoeda(resumoMensalCasal.totalGastoVictor)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Saldo restante: <strong className={resumoMensalCasal.saldoVictor >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatarMoeda(resumoMensalCasal.saldoVictor)}</strong>
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Gastos Letícia no Mês</span>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">
                  {formatarMoeda(resumoMensalCasal.totalGastoLeticia)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Saldo restante: <strong className={resumoMensalCasal.saldoLeticia >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatarMoeda(resumoMensalCasal.saldoLeticia)}</strong>
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Poupança Atualizada</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {formatarMoeda(resumoPoupanca.saldoConfirmado)}
                </p>
                <div className="flex justify-between items-center text-xs mt-2">
                  <span className="text-amber-600 font-medium">
                    Livre: {formatarMoeda(resumoPoupanca.saldoLivreConfirmado)}
                  </span>
                  <span className="text-slate-400">
                    Projetado: {formatarMoeda(resumoPoupanca.saldoTotalProjetado)}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de Contas da Casa do Mês */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Contas da Casa & Faturas Lançadas ({mesSelecionado})</h3>
                <span className="text-xs text-slate-500">{resumoMensalCasal.contasDoMes.length} itens</span>
              </div>
              <div className="divide-y divide-slate-100">
                {resumoMensalCasal.contasDoMes.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">Nenhuma conta lançada para este mês ainda.</p>
                ) : (
                  resumoMensalCasal.contasDoMes.map((conta) => (
                    <div key={conta.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={conta.pago}
                          onChange={() =>
                            setContasCasa((prev) =>
                              prev.map((c) => (c.id === conta.id ? { ...c, pago: !c.pago } : c))
                            )
                          }
                          className="w-4 h-4 accent-emerald-600 rounded"
                        />
                        <div>
                          <p className={`text-sm font-semibold ${conta.pago ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {conta.descricao}
                          </p>
                          <p className="text-xs text-slate-500">
                            {conta.categoria} • Vencimento: {conta.vencimento} •{" "}
                            <span className="font-semibold text-slate-700">
                              {conta.quemPaga === "DIV" ? "Dividido (50/50)" : conta.quemPaga === "VIC" ? "100% Victor" : "100% Letícia"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-800">{formatarMoeda(conta.valor)}</span>
                        <button
                          onClick={() => setContasCasa((prev) => prev.filter((c) => c.id !== conta.id))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: POUPANÇA DIRETA & PREVISÕES FUTURAS                */}
        {/* ========================================================= */}
        {aba === "poupanca" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-xs uppercase text-slate-400 font-semibold">Saldo Atual Confirmado</span>
                <p className="text-2xl font-extrabold mt-1 text-emerald-400">{formatarMoeda(resumoPoupanca.saldoConfirmado)}</p>
                <p className="text-[11px] text-slate-400 mt-1">Efetivado na conta agora</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
                <span className="text-xs uppercase text-blue-700 font-semibold">Previsões Pendentes</span>
                <p className={`text-2xl font-extrabold mt-1 ${resumoPoupanca.saldoPrevistoPendente >= 0 ? "text-blue-700" : "text-rose-600"}`}>
                  {resumoPoupanca.saldoPrevistoPendente >= 0 ? "+" : ""}{formatarMoeda(resumoPoupanca.saldoPrevistoPendente)}
                </p>
                <p className="text-[11px] text-blue-600 mt-1">Entradas e saídas futuras</p>
              </div>
              <div className="bg-slate-100 border border-slate-300 p-5 rounded-2xl">
                <span className="text-xs uppercase text-slate-600 font-semibold">Saldo Projetado Final</span>
                <p className="text-2xl font-extrabold mt-1 text-slate-900">{formatarMoeda(resumoPoupanca.saldoTotalProjetado)}</p>
                <p className="text-[11px] text-slate-500 mt-1">Confirmado + Previsões</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                <span className="text-xs uppercase text-amber-700 font-semibold">Reserva de Emergência</span>
                <p className="text-2xl font-extrabold text-amber-800 mt-1">{formatarMoeda(resumoPoupanca.reservaEmergencia)}</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Livre p/ Metas: <strong>{formatarMoeda(resumoPoupanca.saldoLivreConfirmado)}</strong>
                </p>
              </div>
            </div>

            {/* Formulário Direto na Tela com Seleção Manual de Data e Previsão Futura */}
            <form onSubmit={adicionarMovPoupanca} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={poupData}
                  onChange={(e) => setPoupData(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Diárias Op. Verão Dezembro ou Difa Banrisul"
                  value={poupDesc}
                  onChange={(e) => setPoupDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                <select
                  value={poupTipo}
                  onChange={(e) => setPoupTipo(e.target.value as "ENTRADA" | "SAIDA")}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <option value="ENTRADA">+ Entrada (Guardar)</option>
                  <option value="SAIDA">- Saída (Resgatar)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Situação / Status</label>
                <select
                  value={poupStatus}
                  onChange={(e) => setPoupStatus(e.target.value as "CONFIRMADO" | "PREVISTO")}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
                >
                  <option value="CONFIRMADO">✓ Já Entrou / Confirmado</option>
                  <option value="PREVISTO">⏳ Previsão Futura</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={poupValor}
                  onChange={(e) => setPoupValor(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm">
                Registrar
              </button>
            </form>

            {/* Histórico de Movimentações */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Extrato da Poupança & Previsões</h3>
                  <p className="text-xs text-slate-500">Valores com status "Previsão" podem ser confirmados no dia com 1 clique</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {poupanca.map((mov) => {
                  const isPrevisto = mov.status === "PREVISTO";
                  return (
                    <div key={mov.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{mov.descricao}</p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isPrevisto
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {isPrevisto ? "⏳ Previsão Futura" : "✓ Confirmado"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="date"
                            value={mov.data}
                            onChange={(e) => {
                              const novaData = e.target.value;
                              setPoupanca((prev) =>
                                prev.map((p) => (p.id === mov.id ? { ...p, data: novaData } : p))
                              );
                            }}
                            className="text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer"
                            title="Clique para editar a data deste lançamento"
                          />
                          <span className="text-xs text-slate-400">• {mov.categoria}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-base ${mov.tipo === "ENTRADA" ? "text-emerald-600" : "text-rose-600"}`}>
                          {mov.tipo === "ENTRADA" ? "+" : "-"} {formatarMoeda(mov.valor)}
                        </span>

                        {/* Botão de confirmação com 1 clique para previsões futuras */}
                        {isPrevisto ? (
                          <button
                            type="button"
                            onClick={() => alternarStatusPoupanca(mov.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1.5"
                            title="Confirmar que o valor entrou/saiu na conta hoje"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => alternarStatusPoupanca(mov.id)}
                            className="text-[11px] text-slate-400 hover:text-amber-700 border border-slate-200 hover:border-amber-300 px-2 py-1 rounded-lg"
                            title="Alternar de volta para previsão"
                          >
                            Tornar Previsão
                          </button>
                        )}

                        <button
                          onClick={() => setPoupanca((prev) => prev.filter((p) => p.id !== mov.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 3: SALÁRIOS (DIVISÃO EM 2 LADOS: VICTOR & LETÍCIA)     */}
        {/* ========================================================= */}
        {aba === "salarios" && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Salários & Previsionamento ({formatarMesAnoLabel(mesSelecionado)})</h2>
                  <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                    Legislação RS 2026
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Lado Esquerdo: Victor (CBMRS) • Lado Direito: Letícia (BMRS). Simule as regras salariais e confirme com o contracheque oficial do mês.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Disponível do Casal</span>
                  <span className="text-xl font-black text-emerald-400">{formatarMoeda(salarioLiquidoTotalCasal)}</span>
                  <span className="text-[10px] text-slate-400 block">
                    (Previsto: {formatarMoeda(salarioPrevistoTotalCasal)})
                  </span>
                </div>
              </div>
            </div>

            {/* Divisão da tela em 2 lados: Esquerdo Victor / Direito Letícia */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Lado Esquerdo: Victor (CBMRS) */}
              <SalarioCard
                titulo="Lado Esquerdo: Victor Roque — Sd CBMRS"
                cor="blue"
                params={salVictor}
                onChange={setSalVictor}
                resultado={resVictor}
                mesAnoLabel={formatarMesAnoLabel(mesSelecionado)}
                contrachequeConfirmado={contrachequeMes.victorConfirmado}
                valorRealContracheque={contrachequeMes.victorValorReal}
                onConfirmarContracheque={confirmarContrachequeVictor}
                onReverterContracheque={reverterContrachequeVictor}
              />

              {/* Lado Direito: Letícia (BMRS) */}
              <SalarioCard
                titulo="Lado Direito: Letícia Ribeiro — Sd BMRS"
                cor="purple"
                params={salLeticia}
                onChange={setSalLeticia}
                resultado={resLeticia}
                mesAnoLabel={formatarMesAnoLabel(mesSelecionado)}
                contrachequeConfirmado={contrachequeMes.leticiaConfirmada}
                valorRealContracheque={contrachequeMes.leticiaValorReal}
                onConfirmarContracheque={confirmarContrachequeLeticia}
                onReverterContracheque={reverterContrachequeLeticia}
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 4: CARTÕES DE CRÉDITO (C6 BANK & SICREDI)             */}
        {/* ========================================================= */}
        {aba === "cartoes" && (
          <div className="space-y-6">
            {/* Seletor C6 Bank vs Sicredi + Resumo de Divisão */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex gap-2">
                {(["C6 Bank", "Sicredi"] as CartaoBanco[]).map((banco) => (
                  <button
                    key={banco}
                    onClick={() => setBancoFiltro(banco)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                      bancoFiltro === banco
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {banco}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setTipoInclusao("fatura_pdf");
                  setBancoPDF(bancoFiltro);
                  setModalAberto(true);
                }}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
              >
                <Upload className="w-4 h-4" />
                Importar PDF {bancoFiltro}
              </button>
            </div>

            {/* Cards de Divisão Automática (VIC / LE / DIV 50-50) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold uppercase">Exclusivo Victor (VIC)</span>
                <p className="text-xl font-bold text-blue-600 mt-1">{formatarMoeda(resumoCartoesMes.vicDireto)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold uppercase">Exclusivo Letícia (LE)</span>
                <p className="text-xl font-bold text-purple-600 mt-1">{formatarMoeda(resumoCartoesMes.leDireto)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-400 font-semibold uppercase">Dividido (DIV Total)</span>
                <p className="text-xl font-bold text-amber-600 mt-1">{formatarMoeda(resumoCartoesMes.divTotal)}</p>
                <p className="text-xs text-slate-500">Metade p/ cada: {formatarMoeda(resumoCartoesMes.metadeDiv)}</p>
              </div>
              <div className="bg-slate-900 text-white p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Final c/ Rateio</span>
                <p className="text-sm mt-1">
                  Victor: <strong className="text-emerald-400">{formatarMoeda(resumoCartoesMes.totalVictorCartoes)}</strong>
                </p>
                <p className="text-sm">
                  Letícia: <strong className="text-emerald-400">{formatarMoeda(resumoCartoesMes.totalLeticiaCartoes)}</strong>
                </p>
              </div>
            </div>

            {/* Tabela de Lançamentos do Cartão Selecionado */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Lançamentos — {bancoFiltro} ({mesSelecionado})</h3>
                <span className="text-xs text-slate-500">Clique em VIC / LE / DIV para recalcular o rateio na hora</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Estabelecimento / Parcela</th>
                      <th className="px-6 py-3">Valor</th>
                      <th className="px-6 py-3">Quem Paga</th>
                      <th className="px-6 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comprasCartao
                      .filter((c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado)
                      .map((compra) => (
                        <tr key={compra.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{compra.dataCompra}</td>
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {compra.descricao}{" "}
                            {compra.parcelaInfo && (
                              <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {compra.parcelaInfo}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-800 whitespace-nowrap">
                            {formatarMoeda(compra.valor)}
                          </td>
                          <td className="px-6 py-3">
                            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                              {(["VIC", "LE", "DIV"] as Pagador[]).map((opcao) => (
                                <button
                                  key={opcao}
                                  onClick={() => alterarPagadorCompra(compra.id, opcao)}
                                  className={`px-2.5 py-1 text-xs font-bold transition ${
                                    compra.quemPaga === opcao
                                      ? opcao === "VIC"
                                        ? "bg-blue-600 text-white"
                                        : opcao === "LE"
                                        ? "bg-purple-600 text-white"
                                        : "bg-amber-500 text-white"
                                      : "bg-white text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {opcao}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => setComprasCartao((prev) => prev.filter((c) => c.id !== compra.id))}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 5: CONTAS DA CASA & PROJEÇÃO 6 MESES                   */}
        {/* ========================================================= */}
        {aba === "contas" && (
          <div className="space-y-6">
            {/* Header da Aba com explicação */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Contas da Casa & Projeção para 6 Meses</h2>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Previsão Futura
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Projeta automaticamente contas fixas e parcelas futuras dos cartões. Ao receber a nova fatura do mês, confirme o valor exato fechado.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModalAberto(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova Conta / Importar Fatura
                </button>
              </div>
            </div>

            {/* Linha do Tempo: Cards dos Próximos 6 Meses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-emerald-600" />
                  Visão dos Próximos 6 Meses (Vencimentos)
                </h3>
                <span className="text-xs text-slate-500">Clique em um mês para detalhar abaixo</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {projecao6Meses.map((proj) => {
                  const isMesAtivo = mesVisualizadoContas === proj.mesAno;
                  return (
                    <button
                      key={proj.mesAno}
                      type="button"
                      onClick={() => setMesVisualizadoContas(proj.mesAno)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isMesAtivo
                          ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-bold ${isMesAtivo ? "text-emerald-400" : "text-slate-600"}`}>
                          {proj.label.split("/")[0]}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            proj.isConfirmado
                              ? isMesAtivo
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-emerald-50 text-emerald-700"
                              : isMesAtivo
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {proj.isConfirmado ? "Confirmado" : "Previsto"}
                        </span>
                      </div>
                      <p className="text-lg font-extrabold mt-1">
                        {formatarMoeda(proj.totalGeral)}
                      </p>
                      <div
                        className={`mt-2 pt-2 border-t text-[11px] space-y-0.5 ${
                          isMesAtivo ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>Contas Fixas:</span>
                          <span className="font-medium">{formatarMoeda(proj.totalContasFixas)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cartões / Parc:</span>
                          <span className="font-medium">{formatarMoeda(proj.totalFaturaC6 + proj.totalFaturaSicredi)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel de Confirmação Rápida de Fatura do Mês Selecionado */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Confirmar Valor Real da Fatura de {formatarMesAnoLabel(mesVisualizadoContas)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quando a fatura do cartão fechar, insira o valor exato para substituir as estimativas deste mês por um valor confirmado.
                  </p>
                </div>

                {/* Status do mês visualizado */}
                {mesConfirmadoInfo ? (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                    <span>✓ Fatura Fechada Confirmada: {formatarMoeda(mesConfirmadoInfo.valor)}</span>
                    <button
                      onClick={() => setContasCasa((prev) => prev.filter((c) => c.id !== mesConfirmadoInfo.id))}
                      className="text-emerald-700 hover:text-rose-600 ml-2"
                      title="Excluir confirmação e voltar para estimativa das parcelas"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
                    ⏳ Em Estimativa / Previsão das parcelas
                  </span>
                )}
              </div>

              {/* Formulário de Confirmação */}
              <form onSubmit={handleConfirmarFaturaMes} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mês de Vencimento</label>
                  <input
                    type="month"
                    value={mesVisualizadoContas}
                    onChange={(e) => setMesVisualizadoContas(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cartão / Banco</label>
                  <select
                    value={bancoFaturaConf}
                    onChange={(e) => setBancoFaturaConf(e.target.value as CartaoBanco)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="C6 Bank">C6 Bank</option>
                    <option value="Sicredi">Sicredi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Fechado Real (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={valorFaturaConf}
                    onChange={(e) => setValorFaturaConf(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
                >
                  Confirmar Valor do Mês
                </button>
              </form>
            </div>

            {/* Listas Detalhadas de Contas e Parcelas do Mês Selecionado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Contas Fixas do Mês */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Contas Fixas da Casa ({formatarMesAnoLabel(mesVisualizadoContas)})
                  </h4>
                  <span className="text-xs font-bold text-slate-600">
                    Total: {formatarMoeda(dadosMesVisualizado.totalContasFixas)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {dadosMesVisualizado.contas.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma conta fixa lançada para este mês.
                    </div>
                  ) : (
                    dadosMesVisualizado.contas.map((c) => (
                      <div key={c.id} className="px-6 py-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{c.descricao}</p>
                          <p className="text-xs text-slate-500">
                            Venc: {c.vencimento.split("-").reverse().join("/")} • {c.categoria} •{" "}
                            {c.quemPaga === "DIV" ? "50/50" : c.quemPaga === "VIC" ? "Victor" : "Letícia"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{formatarMoeda(c.valor)}</span>
                          <button
                            onClick={() => alternarPagoConta(c.id)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                              c.pago
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {c.pago ? "Pago" : "Pendente"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Coluna 2: Parcelas Futuras Projetadas dos Cartões */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Parcelas dos Cartões Previstas ({formatarMesAnoLabel(mesVisualizadoContas)})
                  </h4>
                  <span className="text-xs font-bold text-emerald-600">
                    Total: {formatarMoeda(dadosMesVisualizado.totalFaturaC6 + dadosMesVisualizado.totalFaturaSicredi)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {dadosMesVisualizado.parcelasProjetadas.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma parcela parcelada ativa prevista para este mês.
                    </div>
                  ) : (
                    dadosMesVisualizado.parcelasProjetadas.map((p) => (
                      <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.descricao}</p>
                          <p className="text-xs text-slate-500">
                            {p.banco} • {p.titularCartao} • Parcela {p.parcelaAtual}/{p.totalParcelas}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">{formatarMoeda(p.valor)}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              p.quemPaga === "VIC"
                                ? "bg-blue-50 text-blue-700"
                                : p.quemPaga === "LE"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {p.quemPaga}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: INCLUIR CONTAS DA CASA OU FATURA PDF               */}
      {/* ========================================================= */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-800">Incluir Contas / Faturas</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            {/* Seletor de Tipo */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTipoInclusao("conta")}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  tipoInclusao === "conta" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Preenchimento Manual / Conferência
              </button>
              <button
                type="button"
                onClick={() => setTipoInclusao("fatura_pdf")}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  tipoInclusao === "fatura_pdf" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                📄 Importar Qualquer PDF
              </button>
            </div>

            {statusPDF && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span className="font-medium leading-relaxed">{statusPDF}</span>
              </div>
            )}

            {tipoInclusao === "conta" ? (
              <form onSubmit={adicionarContaCasa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as ContaCasa["categoria"])}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Luz">Luz (Energia Elétrica - CEEE / Equatorial / RGE)</option>
                    <option value="Água">Água / Saneamento (Corsan / DMAE)</option>
                    <option value="Internet">Internet Residencial (Vero / Fibra)</option>
                    <option value="Telefone">Telefone / Celular (Vivo / Claro / Tim)</option>
                    <option value="Aluguel">Aluguel / Condomínio / IPTU</option>
                    <option value="Carro">Carro / Seguro / IPVA / Financiamento</option>
                    <option value="Fatura Cartão">Fatura de Cartão (C6 Bank / Sicredi)</option>
                    <option value="Outros">Outros Boletos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conta de Luz CEEE"
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Valor a Pagar (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Vencimento</label>
                    <input
                      type="date"
                      value={novoVencimento}
                      onChange={(e) => setNovoVencimento(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quem Paga?</label>
                  <select
                    value={novoPagador}
                    onChange={(e) => setNovoPagador(e.target.value as Pagador)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="DIV">Dividido (50% Victor / 50% Letícia)</option>
                    <option value="VIC">100% Victor</option>
                    <option value="LE">100% Letícia</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md shadow-emerald-600/20 transition">
                    Salvar Conta no Mês
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="font-semibold text-slate-700 mb-1">💡 Leitor Inteligente de Contas & Faturas:</p>
                  <p>Envie o PDF de qualquer boleto (Luz, Água, Internet, Telefone, Carro, Aluguel ou Fatura de Cartão). O sistema extrai automaticamente o <strong>valor a pagar</strong>, a <strong>data de vencimento</strong> e a <strong>categoria</strong>.</p>
                </div>

                <label className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                  <FileText className="w-10 h-10 text-emerald-600 mb-3 group-hover:scale-110 transition transform" />
                  <span className="text-sm font-bold text-slate-800">Clique para selecionar qualquer conta em PDF</span>
                  <span className="text-xs text-slate-500 mt-1 max-w-sm">
                    Luz (CEEE), Água (Corsan), Vero, Vivo, Claro, Financiamento, Boletos gerais ou Faturas (C6/Sicredi).
                  </span>
                  <span className="mt-3 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    Extração automática instantânea
                  </span>
                  <input type="file" accept="application/pdf" onChange={handleUploadQualquerPDF} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Reutilizável da Aba 3 (Contracheque Militar RS)
function SalarioCard({
  titulo,
  cor,
  params,
  onChange,
  resultado,
  mesAnoLabel,
  contrachequeConfirmado,
  valorRealContracheque,
  onConfirmarContracheque,
  onReverterContracheque,
}: {
  titulo: string;
  cor: "blue" | "purple";
  params: ParametrosSalario;
  onChange: (p: ParametrosSalario) => void;
  resultado: ReturnType<typeof calcularContrachequeRS>;
  mesAnoLabel: string;
  contrachequeConfirmado: boolean;
  valorRealContracheque: number;
  onConfirmarContracheque: (valor: number) => void;
  onReverterContracheque: () => void;
}) {
  const badgeColor = cor === "blue" ? "bg-blue-600" : "bg-purple-600";
  const [inputVal, setInputVal] = useState<string>(() => resultado.totalDisponivelMes.toFixed(2));

  // Sincroniza o valor sugerido se mudar a simulação e não estiver confirmado
  useEffect(() => {
    if (!contrachequeConfirmado) {
      setInputVal(resultado.totalDisponivelMes.toFixed(2));
    }
  }, [resultado.totalDisponivelMes, contrachequeConfirmado]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className={`${badgeColor} text-white px-6 py-4 flex items-center justify-between`}>
        <h3 className="font-bold text-base">{titulo}</h3>
        <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">Tabela RS 2026</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Parâmetros Editáveis */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subsídio Base (R$)</label>
            <input
              type="number"
              step="0.01"
              value={params.subsídioBase}
              onChange={(e) => onChange({ ...params, subsídioBase: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Substituição de Posto</label>
            <select
              value={params.tipoSubstituicao}
              onChange={(e) =>
                onChange({
                  ...params,
                  tipoSubstituicao: e.target.value as ParametrosSalario["tipoSubstituicao"],
                  diasSubstituicao: e.target.value === "NENHUMA" ? 0 : 30,
                })
              }
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            >
              <option value="NENHUMA">Sem Substituição</option>
              <option value="2_SGT">Substituição 2º Sgt</option>
              <option value="1_SGT">Substituição 1º Sgt</option>
              <option value="1_TEN">Substituição 1º Ten</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Substit.</label>
            <input
              type="number"
              min={0}
              max={30}
              value={params.diasSubstituicao}
              onChange={(e) => onChange({ ...params, diasSubstituicao: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Horas-Extra (Qtd)</label>
            <input
              type="number"
              min={0}
              value={params.horasExtrasQtd}
              onChange={(e) => onChange({ ...params, horasExtrasQtd: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Férias (1/3)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={params.diasFerias}
              onChange={(e) => onChange({ ...params, diasFerias: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Diárias (Qtd)</label>
            <input
              type="number"
              min={0}
              value={params.diariasQtd}
              onChange={(e) => onChange({ ...params, diariasQtd: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Acordo Banrisul (R$)</label>
            <input
              type="number"
              step="0.01"
              value={params.descontoBanrisul}
              onChange={(e) => onChange({ ...params, descontoBanrisul: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Outros Consignados (GBOEX)</label>
            <input
              type="number"
              step="0.01"
              value={params.outrosDescontosFixos}
              onChange={(e) => onChange({ ...params, outrosDescontosFixos: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1">
          <input
            type="checkbox"
            checked={params.incluirValeRefeicao}
            onChange={(e) => onChange({ ...params, incluirValeRefeicao: e.target.checked })}
            className="w-4 h-4 accent-emerald-600"
          />
          Incluir Auxílio-Refeição RS (Dia 20 — {formatarMoeda(TABELA_RS_2026.VALE_REFEICAO_MENSAL)})
        </label>

        {/* Demonstrativo Detalhado */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>(+) Subsídio Base:</span>
            <span className="font-semibold">{formatarMoeda(resultado.subsidio)}</span>
          </div>
          {resultado.valorSubstituicao > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) Substituição ({params.diasSubstituicao} dias):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorSubstituicao)}</span>
            </div>
          )}
          {resultado.valorHorasExtras > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) Horas-Extra ({params.horasExtrasQtd}h GSE):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorHorasExtras)}</span>
            </div>
          )}
          {resultado.valorFeriasTerco > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) 1/3 Férias ({params.diasFerias} dias):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorFeriasTerco)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-800">
            <span>Total Bruto Tributável:</span>
            <span>{formatarMoeda(resultado.totalBrutoTributavel)}</span>
          </div>

          <div className="flex justify-between text-rose-600">
            <span>(-) IPE Previdência Militar (SPSMER):</span>
            <span>- {formatarMoeda(resultado.ipePrev)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) IPE Saúde (3,6%):</span>
            <span>- {formatarMoeda(resultado.ipeSaude)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) IRRF (Tabela 2026 + Redutor Lei 15.270):</span>
            <span>- {formatarMoeda(resultado.irrf)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) Consignados / Banrisul / GBOEX:</span>
            <span>- {formatarMoeda(resultado.descontosConsignados)}</span>
          </div>

          <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
            <span>Líquido em Conta (Contracheque):</span>
            <span className="text-emerald-600">{formatarMoeda(resultado.liquidoFolha)}</span>
          </div>

          {(resultado.valeRefeicaoIndenizatorio > 0 || resultado.valorDiarias > 0) && (
            <div className="pt-1 space-y-1 text-slate-600">
              {resultado.valeRefeicaoIndenizatorio > 0 && (
                <div className="flex justify-between">
                  <span>(+) Vale-Refeição (Dia 20 - Isento):</span>
                  <span>+ {formatarMoeda(resultado.valeRefeicaoIndenizatorio)}</span>
                </div>
              )}
              {resultado.valorDiarias > 0 && (
                <div className="flex justify-between">
                  <span>(+) Diárias ({params.diariasQtd} diárias - Isento):</span>
                  <span>+ {formatarMoeda(resultado.valorDiarias)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Disponível no Mês:</span>
                <span>{formatarMoeda(resultado.totalDisponivelMes)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirmação do Contracheque Real do Mês */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Contracheque Oficial ({mesAnoLabel})
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                contrachequeConfirmado
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}
            >
              {contrachequeConfirmado ? "✓ Confirmado no Mês" : "⏳ Previsão / Simulador"}
            </span>
          </div>

          {contrachequeConfirmado ? (
            <div className="space-y-2 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-900 font-semibold">Valor Real Recebido:</span>
                <span className="text-base font-black text-emerald-700">
                  {formatarMoeda(valorRealContracheque)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-emerald-200/60">
                <span>Previsão Calculada: {formatarMoeda(resultado.totalDisponivelMes)}</span>
                <span className={valorRealContracheque >= resultado.totalDisponivelMes ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                  Diferença: {formatarMoeda(valorRealContracheque - resultado.totalDisponivelMes)}
                </span>
              </div>
              <button
                type="button"
                onClick={onReverterContracheque}
                className="w-full mt-2 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition"
              >
                Editar ou Voltar para Previsão Calculada
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Insira o valor líquido exato que veio no contracheque para confirmar e consolidar o mês.
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(inputVal.replace(",", "."));
                    if (!isNaN(val) && val > 0) onConfirmarContracheque(val);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-sm"
                >
                  Confirmar Valor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

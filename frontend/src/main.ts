import { classifyDomain, synthesizeMultiIssue } from './api/client';
import { renderDomainCheckModal, renderResults } from './utils/render-v2';
import { SEED_CASES } from './utils/seed-cases';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://legal-topology.jhaladik.workers.dev';

async function handleAnalyze(question: string): Promise<void> {
  const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
  const btnText = analyzeBtn.querySelector('.btn-text') as HTMLSpanElement;
  const btnLoader = analyzeBtn.querySelector('.btn-loader') as HTMLSpanElement;

  analyzeBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline';

  try {
    console.log('[Frontend] Step 1: Domain classification');
    const domainResult = await classifyDomain(API_BASE_URL, question);

    console.log('[Frontend] Domain check result:', domainResult);

    if (domainResult.recommendation === 'reject') {
      renderDomainCheckModal(
        'Mimo rozsah systému',
        `<p><strong>Důvod:</strong> ${domainResult.reasoning}</p>
         <p><strong>Detekované oblasti:</strong> ${domainResult.detected_domains.join(', ')}</p>
         <p>Tento systém analyzuje pouze otázky českého civilního práva (§1-3081 NOZ).</p>`,
        [{ text: 'Zpět', action: 'close', style: 'secondary' }]
      );
      return;
    }

    if (domainResult.recommendation === 'clarify') {
      renderDomainCheckModal(
        'Potřebujeme upřesnění',
        `<p><strong>Důvod:</strong> ${domainResult.reasoning}</p>
         <p><strong>Detekované oblasti:</strong> ${domainResult.detected_domains.join(', ')}</p>
         <p>Prosím upřesněte svůj dotaz, aby bylo jasné, zda spadá do civilního práva.</p>`,
        [
          { text: 'Upravit dotaz', action: 'close', style: 'secondary' },
          { text: 'Analyzovat stejně', action: 'proceed', style: 'primary', handler: () => proceedWithAnalysis(question) }
        ]
      );
      return;
    }

    console.log('[Frontend] Domain check passed, proceeding with analysis');
    await proceedWithAnalysis(question);

  } catch (error: any) {
    console.error('[Frontend] Analysis failed:', error);
    alert(`Chyba při analýze: ${error.message}`);
  } finally {
    analyzeBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
}

async function proceedWithAnalysis(question: string): Promise<void> {
  const modal = document.getElementById('domainCheckModal');
  if (modal) modal.style.display = 'none';

  console.log('[Frontend] Step 2: Multi-issue synthesis');
  const result = await synthesizeMultiIssue(API_BASE_URL, question);

  console.log('[Frontend] Analysis complete:', result);

  renderResults(result);

  const resultsSection = document.getElementById('resultsSection');
  if (resultsSection) {
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function initSeedCases(): void {
  const seedCasesContainer = document.getElementById('seedCases');
  if (!seedCasesContainer) return;

  seedCasesContainer.addEventListener('click', async (e) => {
    const card = (e.target as HTMLElement).closest('.case-card') as HTMLElement;
    if (!card) return;

    const caseId = card.dataset.case;
    if (!caseId) return;

    const seedCase = SEED_CASES.find(c => c.id === caseId);
    if (!seedCase) return;

    console.log('[Frontend] Seed case selected:', caseId);

    const queryInput = document.getElementById('queryInput') as HTMLTextAreaElement;
    if (queryInput) {
      queryInput.value = seedCase.description;
      queryInput.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

function initQueryForm(): void {
  const form = document.getElementById('queryForm') as HTMLFormElement;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const queryInput = document.getElementById('queryInput') as HTMLTextAreaElement;
    const question = queryInput.value.trim();

    if (!question) {
      alert('Prosím zadejte popis právní situace.');
      return;
    }

    console.log('[Frontend] Custom query submitted:', question);
    await handleAnalyze(question);
  });
}

console.log('[Frontend] Initializing Legal Topology frontend');
console.log('[Frontend] API Base URL:', API_BASE_URL);

initSeedCases();
initQueryForm();
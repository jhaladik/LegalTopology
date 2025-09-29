// Using 'any' type for result to handle both V1 and V2 response formats

interface ModalButton {
  text: string;
  action: string;
  style: 'primary' | 'secondary';
  handler?: () => void;
}

export function renderDomainCheckModal(
  title: string,
  bodyHtml: string,
  buttons: ModalButton[]
): void {
  const modal = document.getElementById('domainCheckModal');
  if (!modal) return;

  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');

  if (modalTitle) modalTitle.textContent = title;
  if (modalBody) modalBody.innerHTML = bodyHtml;

  if (modalFooter) {
    modalFooter.innerHTML = buttons
      .map((btn, idx) =>
        `<button class="btn btn-${btn.style}" data-action="${btn.action}" data-index="${idx}">${btn.text}</button>`
      )
      .join('');

    buttons.forEach((btn, idx) => {
      const btnElement = modalFooter.querySelector(`[data-index="${idx}"]`);
      if (btnElement) {
        btnElement.addEventListener('click', () => {
          if (btn.handler) {
            btn.handler();
          } else if (btn.action === 'close') {
            modal.style.display = 'none';
          }
        });
      }
    });
  }

  modal.style.display = 'flex';

  const overlay = modal.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
}

export function renderResults(result: any): void {
  const resultsContent = document.getElementById('resultsContent');
  if (!resultsContent) return;

  // Check if this is V2 response (has topological_analysis) or V1 response
  const isV2 = 'topological_analysis' in result;

  let html = '';

  if (isV2) {
    // V2 Tension-based rendering
    html = `
      <div class="results-header">
        <h3>⚡ Topologická analýza právních napětí</h3>
        <div class="results-meta">
          <span>⚖️ ${result.topological_analysis.tensions.length} napětí</span>
          <span>📜 ${result.metadata.total_statutes} paragrafů</span>
          <span>🔍 ${result.metadata.total_cases} rozhodnutí</span>
          <span>⏱️ ${(result.metadata.processing_time_ms / 1000).toFixed(1)}s</span>
        </div>
      </div>

      <div class="tier tier-executive">
        <div class="tier-header">
          <h4>🎯 Identifikovaná právní napětí</h4>
          <p class="tier-description">Komplexita: ${result.topological_analysis.complexity}</p>
        </div>
        <div class="tier-content">
          ${result.topological_analysis.tensions.map((tension: any, idx: number) => `
            <div class="issue-card">
              <h5>${idx + 1}. ${tension.competing_values.join(' vs. ')}</h5>
              <p class="issue-description">
                <strong>Typ napětí:</strong> ${formatTensionType(tension.tension_type)}<br>
                <strong>Síla:</strong> <span class="tension-strength">${(tension.strength * 100).toFixed(0)}%</span>
              </p>
              ${tension.reasoning ? `<p class="tension-reasoning"><em>${tension.reasoning}</em></p>` : ''}
            </div>
          `).join('')}

          <div class="issue-section">
            <h6>⚡ Konkurující doktríny</h6>
            ${result.topological_analysis.competing_doctrines.map((d: any) => `
              <div class="doctrine-card">
                <strong>${d.doctrine}</strong>
                <span class="doctrine-weight">(váha: ${(d.weight * 100).toFixed(0)}%)</span>
                <p class="doctrine-reasoning">${d.reasoning}</p>
                <p class="doctrine-sections">Relevantní §§: ${d.relevant_sections.join(', ')}</p>
              </div>
            `).join('')}
          </div>

          ${result.topological_analysis.temporal_factors.duration ? `
            <div class="issue-section">
              <h6>⏰ Časové faktory</h6>
              <p>Trvání: <strong>${result.topological_analysis.temporal_factors.duration}</strong></p>
              <p>Vytváří očekávání: ${result.topological_analysis.temporal_factors.creates_expectation ? 'Ano' : 'Ne'}</p>
            </div>
          ` : ''}

          ${result.topological_analysis.power_dynamics.weaker_party ? `
            <div class="issue-section">
              <h6>⚖️ Mocenská dynamika</h6>
              <p>Slabší strana: <strong>${result.topological_analysis.power_dynamics.weaker_party}</strong></p>
              <p>Úroveň asymetrie: ${result.topological_analysis.power_dynamics.asymmetry_level}</p>
            </div>
          ` : ''}

          <div class="issue-section">
            <h6>🔬 Test absurdity</h6>
            <div class="absurdity-test">
              <p class="absurdity-without">Bez primární doktríny: ${result.topological_analysis.absurdity_test.without_primary_doctrine}</p>
              <p class="absurdity-confirms">→ Potvrzuje doktrínu: <strong>${result.topological_analysis.absurdity_test.confirms_doctrine}</strong></p>
            </div>
          </div>
        </div>
      </div>

      <div class="tier tier-legal">
        <div class="tier-header">
          <h4>⚖️ Právní základ</h4>
          <p class="tier-description">Relevantní paragrafy a judikatura</p>
        </div>
        <div class="tier-content">
          <div class="issue-section">
            <h6>📜 Klíčové paragrafy NOZ (${result.statutory_foundation.length})</h6>
            <ul>
              ${result.statutory_foundation.slice(0, 10).map((s: any) => `
                <li>
                  <strong>${s.section}</strong> (relevance: ${(s.relevance * 100).toFixed(0)}%)
                  <br><em>${s.text.substring(0, 200)}${s.text.length > 200 ? '...' : ''}</em>
                  <br><small>Zdroj: ${s.source?.join(', ') || 'neznámý'}</small>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="issue-section">
            <h6>🔎 Relevantní judikatura (${result.case_law.length})</h6>
            <ul>
              ${result.case_law.slice(0, 5).map((c: any) => `
                <li>
                  <strong>${c.case_id}</strong> - ${c.court || 'Neznámý soud'}
                  <br>(váha: ${c.weight.toFixed(2)}, relevance: ${(c.relevance * 100).toFixed(0)}%)
                  <br><em>${c.text.substring(0, 300)}${c.text.length > 300 ? '...' : ''}</em>
                  ${c.cluster ? `<br><small>Doktrína: ${c.cluster}</small>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>

          ${result.doctrine_clusters && result.doctrine_clusters.length > 0 ? `
            <div class="issue-section">
              <h6>🧩 Identifikované právní doktríny (${result.doctrine_clusters.length})</h6>
              ${result.doctrine_clusters.map((cluster: any) => `
                <div class="doctrine-cluster">
                  <strong>Doktrína ${cluster.doctrine_id}</strong>
                  <p>Počet rozhodnutí: ${cluster.member_count}</p>
                  <p>Společné §§: ${cluster.common_sections.join(', ')}</p>
                  ${cluster.supreme_court_anchor ? `<p>NS precedent: ${cluster.supreme_court_anchor}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="tier tier-deep">
        <div class="tier-header">
          <h4>🧩 Strategická syntéza</h4>
          <p class="tier-description">Analýza skrze právní napětí (${result.metadata.model})</p>
        </div>
        <div class="tier-content">
          ${formatText(result.analysis)}
        </div>
      </div>
    `;
  } else {
    // V1 Classic rendering (fallback)
    html = `
      <div class="results-header">
        <h3>Výsledky analýzy</h3>
        <div class="results-meta">
          <span>🔍 ${result.query_decomposition?.total_issues || 0} právních otázek</span>
          <span>📜 ${result.metadata?.total_statutes || 0} paragrafů</span>
          <span>⚖️ ${result.metadata?.total_cases || 0} rozhodnutí</span>
        </div>
      </div>

      <div class="tier tier-legal">
        <div class="tier-header">
          <h4>⚖️ Právní základ</h4>
          <p class="tier-description">Relevantní paragrafy a judikatura</p>
        </div>
        <div class="tier-content">
          <div class="issue-section">
            <h6>📜 Klíčové paragrafy NOZ</h6>
            <ul>
              ${(result.statutory_foundation || []).slice(0, 10).map((s: any) => `
                <li>
                  <strong>${s.section}</strong> (relevance: ${(s.relevance * 100).toFixed(0)}%)
                  <br><em>${s.text.substring(0, 200)}${s.text.length > 200 ? '...' : ''}</em>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="tier tier-deep">
        <div class="tier-header">
          <h4>🧩 Právní analýza</h4>
        </div>
        <div class="tier-content">
          ${formatText(result.analysis || 'Analýza není k dispozici')}
        </div>
      </div>
    `;
  }

  html += `
    <div class="results-actions">
      <button class="btn btn-secondary" onclick="window.print()">📄 Exportovat PDF</button>
      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(window.location.href)">🔗 Sdílet odkaz</button>
      <button class="btn btn-primary">💬 Konzultace s právníkem</button>
    </div>
  `;

  resultsContent.innerHTML = html;
}

function formatTensionType(type: string): string {
  const tensionNames: Record<string, string> = {
    formal_vs_factual: 'Forma vs. faktický stav',
    protection_vs_autonomy: 'Ochrana slabšího vs. autonomie',
    time_creates_rights: 'Čas vytváří práva',
    substance_over_form: 'Substance nad formou',
    good_faith_vs_strict_law: 'Dobrá víra vs. přísné právo',
    economic_efficiency_vs_fairness: 'Efektivita vs. spravedlnost',
    prevention_vs_reparation: 'Prevence vs. reparace',
    individual_vs_collective: 'Individuální vs. kolektivní',
    certainty_vs_flexibility: 'Jistota vs. flexibilita',
    restitution_vs_stability: 'Restituce vs. stabilita'
  };
  return tensionNames[type] || type;
}

function formatText(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Main headings (##)
    if (trimmed.startsWith('## ')) {
      if (inList) {
        html += '</ol>';
        inList = false;
      }
      html += `<h3 class="analysis-heading">${escapeHtml(trimmed.substring(3))}</h3>`;
    }
    // Sub-headings (###)
    else if (trimmed.startsWith('### ')) {
      if (inList) {
        html += '</ol>';
        inList = false;
      }
      html += `<h4 class="analysis-subheading">${escapeHtml(trimmed.substring(4))}</h4>`;
    }
    // Numbered lists (1. 2. 3.)
    else if (/^\d+\.\s/.test(trimmed)) {
      if (!inList) {
        html += '<ol class="analysis-list">';
        inList = true;
      }
      html += `<li>${escapeHtml(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
    }
    // Bullet points (-)
    else if (trimmed.startsWith('- ')) {
      if (inList) {
        html += '</ol>';
        inList = false;
      }
      if (!html.endsWith('</ul>')) {
        html += '<ul class="analysis-list">';
      }
      html += `<li>${escapeHtml(trimmed.substring(2))}</li>`;
      if (!line.endsWith('- ')) {
        html += '</ul>';
      }
    }
    // Regular paragraphs
    else {
      if (inList) {
        html += '</ol>';
        inList = false;
      }
      // Bold text (**text**)
      let formatted = escapeHtml(trimmed);
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<p class="analysis-paragraph">${formatted}</p>`;
    }
  }

  if (inList) {
    html += '</ol>';
  }

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
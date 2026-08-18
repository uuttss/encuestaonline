/**
 * Encuesta de Satisfacción - Curso Antigravity
 * Lógica del formulario del cliente (segura: sin credenciales ni tokens expuestos).
 */

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'antigravity_survey_responses';

  // --- Elementos del DOM ---
  const form = document.getElementById('surveyForm');
  const successCard = document.getElementById('successCard');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = submitBtn.querySelector('.btn-text');
  const submitBtnIcon = submitBtn.querySelector('.btn-icon');
  const resetBtn = document.getElementById('resetBtn');

  // Inputs
  const idEstudianteInput = document.getElementById('id_estudiante');
  const comentariosInput = document.getElementById('comentarios_adicionales');
  const charCurrent = document.getElementById('charCurrent');
  const radioInputs = document.querySelectorAll('input[type="radio"]');

  // Barra de progreso
  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercent = document.getElementById('progressPercent');

  // Modal y Resultados
  const savedCountBadge = document.getElementById('savedCountBadge');
  const viewResultsBtn = document.getElementById('viewResultsBtn');
  const openResultsFromSuccessBtn = document.getElementById('openResultsFromSuccessBtn');
  const newResponseBtn = document.getElementById('newResponseBtn');
  const responsesModal = document.getElementById('responsesModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const responsesTableBody = document.getElementById('responsesTableBody');
  const noResponsesMessage = document.getElementById('noResponsesMessage');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  // Métricas
  const metricTotal = document.getElementById('metricTotal');
  const metricSatisfaccion = document.getElementById('metricSatisfaccion');
  const metricClaridad = document.getElementById('metricClaridad');
  const metricAplicabilidad = document.getElementById('metricAplicabilidad');

  // Toast
  const toast = document.getElementById('toast');

  // Diccionario de etiquetas descriptivas
  const labelsMap = {
    nivel_satisfaccion: {
      '1': '1 - Muy insatisfecho',
      '2': '2 - Insatisfecho',
      '3': '3 - Neutral',
      '4': '4 - Satisfecho',
      '5': '5 - Muy satisfecho'
    },
    claridad_contenido: {
      '1': '1 - Muy poco claro',
      '2': '2 - Poco claro',
      '3': '3 - Aceptable',
      '4': '4 - Claro',
      '5': '5 - Muy claro'
    },
    aplicabilidad_practica: {
      '1': '1 - Nada aplicable',
      '2': '2 - Poco aplicable',
      '3': '3 - Moderada',
      '4': '4 - Bastante aplicable',
      '5': '5 - Muy aplicable'
    }
  };

  // --- Funciones de Almacenamiento Local ---
  function getStoredResponses() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error leyendo localStorage:', e);
      return [];
    }
  }

  function saveResponse(responseObj) {
    const list = getStoredResponses();
    list.unshift(responseObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    updateSavedBadge();
  }

  function updateSavedBadge() {
    const count = getStoredResponses().length;
    if (savedCountBadge) {
      savedCountBadge.textContent = count;
    }
  }

  function showToast(message, duration = 3500) {
    if (!toast) return;
    toast.innerHTML = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  // --- Cálculo del Progreso del Formulario ---
  function updateProgress() {
    const hasId = idEstudianteInput.value.trim().length > 0;
    const hasSat = document.querySelector('input[name="nivel_satisfaccion"]:checked') !== null;
    const hasClar = document.querySelector('input[name="claridad_contenido"]:checked') !== null;
    const hasApp = document.querySelector('input[name="aplicabilidad_practica"]:checked') !== null;

    let completed = 0;
    if (hasId) completed++;
    if (hasSat) completed++;
    if (hasClar) completed++;
    if (hasApp) completed++;

    const percent = Math.round((completed / 4) * 100);
    progressBarFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
  }

  // --- Gestión de Errores Visuales ---
  function clearSectionError(elementOrName) {
    let section;
    if (typeof elementOrName === 'string') {
      const input = document.querySelector(`[name="${elementOrName}"]`);
      section = input ? input.closest('.form-section') : null;
    } else {
      section = elementOrName.closest('.form-section');
    }
    if (section) {
      section.classList.remove('has-error');
    }
  }

  function setSectionError(sectionId) {
    const errorElem = document.getElementById(sectionId);
    if (errorElem) {
      const section = errorElem.closest('.form-section');
      if (section) {
        section.classList.add('has-error');
      }
    }
  }

  // --- Listeners en tiempo real ---
  idEstudianteInput.addEventListener('input', () => {
    if (idEstudianteInput.value.trim().length > 0) {
      clearSectionError(idEstudianteInput);
    }
    updateProgress();
  });

  comentariosInput.addEventListener('input', () => {
    charCurrent.textContent = comentariosInput.value.length;
  });

  radioInputs.forEach(radio => {
    radio.addEventListener('change', () => {
      clearSectionError(radio.name);
      updateProgress();
    });
  });

  // --- Envío Seguro del Formulario al Backend ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;

    // 1. Validar ID Estudiante
    const idVal = idEstudianteInput.value.trim();
    if (!idVal) {
      setSectionError('error_id_estudiante');
      isValid = false;
    } else {
      clearSectionError('id_estudiante');
    }

    // 2. Validar Nivel de Satisfacción
    const satVal = document.querySelector('input[name="nivel_satisfaccion"]:checked')?.value;
    if (!satVal) {
      setSectionError('error_nivel_satisfaccion');
      isValid = false;
    } else {
      clearSectionError('nivel_satisfaccion');
    }

    // 3. Validar Claridad del Contenido
    const clarVal = document.querySelector('input[name="claridad_contenido"]:checked')?.value;
    if (!clarVal) {
      setSectionError('error_claridad_contenido');
      isValid = false;
    } else {
      clearSectionError('claridad_contenido');
    }

    // 4. Validar Aplicabilidad Práctica
    const appVal = document.querySelector('input[name="aplicabilidad_practica"]:checked')?.value;
    if (!appVal) {
      setSectionError('error_aplicabilidad_practica');
      isValid = false;
    } else {
      clearSectionError('aplicabilidad_practica');
    }

    if (!isValid) {
      const firstError = document.querySelector('.form-section.has-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showToast('⚠️ Por favor completa todas las preguntas obligatorias.');
      return;
    }

    // Estado visual de carga
    submitBtn.disabled = true;
    submitBtnText.textContent = 'Enviando respuestas...';
    submitBtnIcon.textContent = '⏳';

    const payload = {
      id_estudiante: idVal,
      nivel_satisfaccion: parseInt(satVal, 10),
      claridad_contenido: parseInt(clarVal, 10),
      aplicabilidad_practica: parseInt(appVal, 10),
      comentarios_adicionales: comentariosInput.value.trim()
    };

    let serverResponse = null;

    try {
      // Envío seguro al endpoint de la API del servidor
      const res = await fetch('/api/submit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      serverResponse = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = serverResponse.errors 
          ? serverResponse.errors.join('<br>') 
          : (serverResponse.error || `Error ${res.status}`);
        showToast(`⚠️ ${errorMsg}`, 5000);
      } else {
        showToast('✨ ¡Muchas gracias! Tu respuesta ha sido enviada con éxito.');
      }
    } catch (err) {
      console.warn('Servidor offline o inaccesible:', err);
      showToast('💾 Guardado en tu navegador (modo local).');
    } finally {
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Enviar Encuesta';
      submitBtnIcon.textContent = '🚀';
    }

    // Guardar en almacenamiento local para consulta rápida
    const localEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleString('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      id_estudiante: idVal,
      nivel_satisfaccion: parseInt(satVal, 10),
      claridad_contenido: parseInt(clarVal, 10),
      aplicabilidad_practica: parseInt(appVal, 10),
      comentarios_adicionales: comentariosInput.value.trim()
    };

    saveResponse(localEntry);

    // Mostrar resumen en tarjeta de confirmación
    renderSubmissionSummary(localEntry);

    // Cambiar vista a confirmación
    form.classList.add('hidden');
    successCard.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Resetear Formulario ---
  form.addEventListener('reset', () => {
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('has-error'));
    charCurrent.textContent = '0';
    setTimeout(updateProgress, 10);
  });

  // --- Renderizar Resumen tras Enviar ---
  function renderSubmissionSummary(entry) {
    const summaryGrid = document.getElementById('summaryGrid');
    if (!summaryGrid) return;

    summaryGrid.innerHTML = `
      <div class="summary-item">
        <div class="summary-label">Estudiante</div>
        <div class="summary-value">${escapeHtml(entry.id_estudiante)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Fecha y Hora</div>
        <div class="summary-value">${entry.formattedDate}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Satisfacción General</div>
        <div class="summary-value">${labelsMap.nivel_satisfaccion[entry.nivel_satisfaccion]}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Claridad del Contenido</div>
        <div class="summary-value">${labelsMap.claridad_contenido[entry.claridad_contenido]}</div>
      </div>
      <div class="summary-item full-width">
        <div class="summary-label">Aplicabilidad Práctica</div>
        <div class="summary-value">${labelsMap.aplicabilidad_practica[entry.aplicabilidad_practica]}</div>
      </div>
      <div class="summary-item full-width">
        <div class="summary-label">Comentarios Adicionales</div>
        <div class="summary-value">${entry.comentarios_adicionales ? escapeHtml(entry.comentarios_adicionales) : '<em style="color:var(--text-subtle)">Sin comentarios adicionales</em>'}</div>
      </div>
    `;
  }

  // --- Botón Nueva Respuesta ---
  newResponseBtn.addEventListener('click', () => {
    form.reset();
    form.classList.remove('hidden');
    successCard.classList.add('hidden');
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Modal y Renderizado de Tabla ---
  function openModal() {
    renderResponsesTable();
    responsesModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    responsesModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  viewResultsBtn.addEventListener('click', openModal);
  if (openResultsFromSuccessBtn) {
    openResultsFromSuccessBtn.addEventListener('click', openModal);
  }
  closeModalBtn.addEventListener('click', closeModal);
  responsesModal.addEventListener('click', (e) => {
    if (e.target === responsesModal) {
      closeModal();
    }
  });

  function getScoreBadgeClass(score) {
    if (score >= 4) return 'score-high';
    if (score === 3) return 'score-mid';
    return 'score-low';
  }

  function renderResponsesTable() {
    const list = getStoredResponses();
    responsesTableBody.innerHTML = '';

    if (list.length === 0) {
      noResponsesMessage.classList.remove('hidden');
      metricTotal.textContent = '0';
      metricSatisfaccion.textContent = '0.0';
      metricClaridad.textContent = '0.0';
      metricAplicabilidad.textContent = '0.0';
      return;
    }

    noResponsesMessage.classList.add('hidden');

    const total = list.length;
    const avgSat = (list.reduce((acc, cur) => acc + cur.nivel_satisfaccion, 0) / total).toFixed(1);
    const avgClar = (list.reduce((acc, cur) => acc + cur.claridad_contenido, 0) / total).toFixed(1);
    const avgApp = (list.reduce((acc, cur) => acc + cur.aplicabilidad_practica, 0) / total).toFixed(1);

    metricTotal.textContent = total;
    metricSatisfaccion.textContent = `${avgSat} ★`;
    metricClaridad.textContent = `${avgClar} ★`;
    metricAplicabilidad.textContent = `${avgApp} ★`;

    list.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.formattedDate}</td>
        <td><strong>${escapeHtml(item.id_estudiante)}</strong></td>
        <td>
          <span class="score-badge ${getScoreBadgeClass(item.nivel_satisfaccion)}">
            ${item.nivel_satisfaccion} / 5
          </span>
        </td>
        <td>
          <span class="score-badge ${getScoreBadgeClass(item.claridad_contenido)}">
            ${item.claridad_contenido} / 5
          </span>
        </td>
        <td>
          <span class="score-badge ${getScoreBadgeClass(item.aplicabilidad_practica)}">
            ${item.aplicabilidad_practica} / 5
          </span>
        </td>
        <td class="comment-cell" title="${escapeHtml(item.comentarios_adicionales || '')}">
          ${item.comentarios_adicionales ? escapeHtml(item.comentarios_adicionales) : '<span style="color:var(--text-subtle);">-</span>'}
        </td>
      `;
      responsesTableBody.appendChild(tr);
    });
  }

  // --- Exportar Datos (CSV / JSON) ---
  exportCsvBtn.addEventListener('click', () => {
    const list = getStoredResponses();
    if (list.length === 0) {
      showToast('⚠️ No hay respuestas para exportar.');
      return;
    }

    const headers = ['ID', 'Fecha', 'ID Estudiante', 'Nivel Satisfaccion (1-5)', 'Claridad Contenido (1-5)', 'Aplicabilidad Practica (1-5)', 'Comentarios'];
    const rows = list.map(item => [
      item.id,
      `"${item.formattedDate}"`,
      `"${item.id_estudiante.replace(/"/g, '""')}"`,
      item.nivel_satisfaccion,
      item.claridad_contenido,
      item.aplicabilidad_practica,
      `"${(item.comentarios_adicionales || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `encuesta_antigravity_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    showToast('📥 Archivo CSV descargado.');
  });

  exportJsonBtn.addEventListener('click', () => {
    const list = getStoredResponses();
    if (list.length === 0) {
      showToast('⚠️ No hay respuestas para exportar.');
      return;
    }

    const jsonString = JSON.stringify(list, null, 2);
    downloadFile(jsonString, `encuesta_antigravity_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showToast('💾 Archivo JSON descargado.');
  });

  clearAllBtn.addEventListener('click', () => {
    const list = getStoredResponses();
    if (list.length === 0) return;

    if (confirm('¿Estás seguro de que deseas eliminar todas las respuestas guardadas en este navegador?')) {
      localStorage.removeItem(STORAGE_KEY);
      updateSavedBadge();
      renderResponsesTable();
      showToast('🗑️ Respuestas locales eliminadas.');
    }
  });

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Inicialización ---
  updateSavedBadge();
  updateProgress();
});

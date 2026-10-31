import './style.css';

const form = document.querySelector('#question-form');
const questionInput = document.querySelector('#question');
const clientInput = document.querySelector('#client-id');
const conversation = document.querySelector('#conversation');
const errorOutput = document.querySelector('#form-error');
const submitButton = form.querySelector('button');
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const pergunta = questionInput.value.trim();
  if (!pergunta) return;

  errorOutput.textContent = '';
  appendMessage(pergunta, 'user');
  setLoading(true);

  try {
    const response = await fetch(`${API_URL}/perguntar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id_cliente: clientInput.value, pergunta }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Não foi possível consultar agora.');
    appendMessage(body.resposta, 'assistant', body.fontes);
    questionInput.value = '';
  } catch (error) {
    errorOutput.textContent = error instanceof Error ? error.message : 'Não foi possível consultar agora.';
  } finally {
    setLoading(false);
    questionInput.focus();
  }
});

function appendMessage(text, role, sources = []) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  article.append(paragraph);

  if (sources.length) {
    const sourceGroup = document.createElement('div');
    sourceGroup.className = 'sources';
    sourceGroup.setAttribute('aria-label', 'Fontes da resposta');
    const label = document.createElement('span');
    label.textContent = 'Fontes';
    sourceGroup.append(label);
    sources.forEach((source) => {
      const badge = document.createElement('code');
      badge.textContent = source;
      sourceGroup.append(badge);
    });
    article.append(sourceGroup);
  }

  conversation.append(article);
  article.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function setLoading(loading) {
  submitButton.disabled = loading;
  clientInput.disabled = loading;
  questionInput.disabled = loading;
  submitButton.querySelector('span').textContent = loading ? 'Consultando…' : 'Enviar';
}

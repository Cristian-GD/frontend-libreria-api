const BASE_HOST = 'https://libreria-api-1ybu.onrender.com';
const API_URL = `${BASE_HOST}/api/v1`;

let currentFilter = {
  genero: '',
  search: '',
  disponible: '',
};

// Elementos del DOM
const libroForm = document.getElementById('libroForm');
const libroIdInput = document.getElementById('libroIdInput');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const librosGrid = document.getElementById('librosGrid');
const apiStatus = document.getElementById('apiStatus');
const detailModal = document.getElementById('detailModal');
const detailBody = document.getElementById('detailBody');
const closeModalBtn = document.getElementById('closeModalBtn');

// Parseo seguro de respuestas (soporta 204 No Content sin cuerpo)
async function parseResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text };
  }
}

// --- VERIFICAR SALUD DEL SERVIDOR (GET /health) ---
async function checkHealth() {
  try {
    const res = await fetch(`${BASE_HOST}/health`);
    if (res.ok) {
      apiStatus.textContent = 'API Conectada';
      apiStatus.classList.remove('error');
    } else {
      throw new Error('Health check falló');
    }
  } catch {
    apiStatus.textContent = 'Sin conexión con la API';
    apiStatus.classList.add('error');
  }
}

// --- 1. LISTAR Y FILTRAR LIBROS (GET /api/v1/libro) ---
async function loadLibros(overrides = {}) {
  currentFilter = { ...currentFilter, ...overrides };

  const params = new URLSearchParams();
  if (currentFilter.genero) params.append('genero', currentFilter.genero);
  if (currentFilter.search) params.append('search', currentFilter.search);
  if (currentFilter.disponible !== '') params.append('disponible', currentFilter.disponible);

  const queryString = params.toString();
  const endpoint = queryString ? `${API_URL}/libro?${queryString}` : `${API_URL}/libro`;

  try {
    const res = await fetch(endpoint);
    const data = await parseResponse(res);

    if (!res.ok) {
      librosGrid.innerHTML = `<p class="empty-msg">${data?.message || 'Error al consultar libros.'}</p>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      librosGrid.innerHTML = '<p class="empty-msg">No hay libros registrados con esos filtros.</p>';
      return;
    }

    librosGrid.innerHTML = data
      .map(
        (libro) => `
        <article class="libro-card">
          <div>
            <span class="badge">${libro.genero}</span>
            <span class="badge ${libro.disponible ? 'disponible' : 'prestado'}">
              ${libro.disponible ? 'Disponible' : 'No disponible'}
            </span>
            <h3 style="margin-top: 0.5rem;">${libro.titulo}</h3>
            <p class="autor">Por: <strong>${libro.autor}</strong></p>
          </div>

          <div class="libro-meta">
            <span>Año: ${libro.anioPublicacion}</span> • 
            <span>${libro.paginas} págs.</span>
          </div>

          <div class="libro-actions">
            <button
              type="button"
              class="btn-primary"
              data-action="toggle"
              data-id="${libro._id}"
              data-disponible="${!libro.disponible}">
              ${libro.disponible ? 'Prestar' : 'Devolver'}
            </button>
            <button
              type="button"
              class="btn-icon"
              title="Consultar detalle"
              data-action="view"
              data-id="${libro._id}">
              👁️
            </button>
            <button
              type="button"
              class="btn-icon btn-edit"
              title="Editar libro"
              data-action="edit"
              data-id="${libro._id}">
              ✏️
            </button>
            <button
              type="button"
              class="btn-icon btn-delete"
              title="Eliminar libro"
              data-action="delete"
              data-id="${libro._id}">
              🗑️
            </button>
          </div>
        </article>
      `
      )
      .join('');
  } catch (error) {
    console.error('Error al cargar libros:', error);
    librosGrid.innerHTML =
      '<p class="empty-msg">No se pudo conectar con la API en Render. Si estaba inactiva, espera unos segundos y recarga la página.</p>';
  }
}

// --- 2. CREAR (POST) O ACTUALIZAR (PUT) LIBRO ---
libroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  const idEdicion = libroIdInput.value.trim();
  const payload = {
    titulo: document.getElementById('tituloInput').value.trim(),
    autor: document.getElementById('autorInput').value.trim(),
    genero: document.getElementById('generoInput').value,
    anioPublicacion: Number(document.getElementById('anioInput').value),
    paginas: Number(document.getElementById('paginasInput').value),
    disponible: document.getElementById('disponibleInput').checked,
  };

  const url = idEdicion ? `${API_URL}/libro/${idEdicion}` : `${API_URL}/libro`;
  const method = idEdicion ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await parseResponse(res);

    if (res.ok) {
      resetFormMode();
      await loadLibros();
    } else {
      alert(data?.message || 'Error al guardar los datos del libro');
    }
  } catch (error) {
    console.error(`Error en ${method} /libro:`, error);
    alert('Error de red al comunicarse con el servidor.');
  } finally {
    submitBtn.disabled = false;
  }
});

// Funciones auxiliares para modo Edición
function enterEditMode(libro) {
  libroIdInput.value = libro._id;
  document.getElementById('tituloInput').value = libro.titulo;
  document.getElementById('autorInput').value = libro.autor;
  document.getElementById('generoInput').value = libro.genero;
  document.getElementById('anioInput').value = libro.anioPublicacion;
  document.getElementById('paginasInput').value = libro.paginas;
  document.getElementById('disponibleInput').checked = libro.disponible;

  formTitle.textContent = 'Editar Libro';
  submitBtn.textContent = 'Guardar Cambios';
  cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormMode() {
  libroForm.reset();
  libroIdInput.value = '';
  formTitle.textContent = 'Registrar Nuevo Libro';
  submitBtn.textContent = '+ Guardar Libro';
  cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', resetFormMode);

// --- 3. ACCIONES DE TARJETA (GET /:id, PUT /:id, PATCH /:id/disponibilidad, DELETE /:id) ---
librosGrid.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const { action, id } = btn.dataset;
  if (!id) return;

  // A) Consultar detalle por ID (GET /api/v1/libro/:id)
  if (action === 'view') {
    try {
      const res = await fetch(`${API_URL}/libro/${id}`);
      const libro = await parseResponse(res);

      if (!res.ok) {
        alert(libro?.message || 'No se pudo consultar el libro');
        return;
      }

      detailBody.innerHTML = `
        <p><strong>ID:</strong> <code>${libro._id}</code></p>
        <p><strong>Título:</strong> ${libro.titulo}</p>
        <p><strong>Autor:</strong> ${libro.autor}</p>
        <p><strong>Género:</strong> ${libro.genero}</p>
        <p><strong>Año de publicación:</strong> ${libro.anioPublicacion}</p>
        <p><strong>Páginas:</strong> ${libro.paginas}</p>
        <p><strong>Estado:</strong> ${libro.disponible ? 'Disponible' : 'No disponible'}</p>
        <p><strong>Creado:</strong> ${new Date(libro.createdAt).toLocaleString()}</p>
        <p><strong>Actualizado:</strong> ${new Date(libro.updatedAt).toLocaleString()}</p>
      `;
      detailModal.classList.remove('hidden');
    } catch (error) {
      console.error('Error en GET /libro/:id:', error);
      alert('Error al consultar el detalle del libro.');
    }
  }

  // B) Cargar datos en el formulario para editar (GET /:id -> PUT /:id)
  if (action === 'edit') {
    try {
      const res = await fetch(`${API_URL}/libro/${id}`);
      const libro = await parseResponse(res);

      if (!res.ok) {
        alert(libro?.message || 'No se pudo cargar el libro para editar');
        return;
      }

      enterEditMode(libro);
    } catch (error) {
      console.error('Error al cargar libro para edición:', error);
      alert('Error de red al obtener el libro.');
    }
  }

  // C) Cambiar disponibilidad (PATCH /api/v1/libro/:id/disponibilidad)
  if (action === 'toggle') {
    const nuevoEstado = btn.dataset.disponible === 'true';
    btn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/libro/${id}/disponibilidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponible: nuevoEstado }),
      });
      const data = await parseResponse(res);

      if (res.ok) {
        await loadLibros();
      } else {
        alert(data?.message || 'No se pudo actualizar la disponibilidad');
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Error en PATCH disponibilidad:', error);
      alert('Error de red al cambiar disponibilidad.');
      btn.disabled = false;
    }
  }

  // D) Eliminar libro (DELETE /api/v1/libro/:id)
  if (action === 'delete') {
    if (!confirm('¿Eliminar este libro del catálogo?')) return;
    btn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/libro/${id}`, {
        method: 'DELETE',
      });
      const data = await parseResponse(res);

      if (res.ok) {
        if (libroIdInput.value === id) resetFormMode();
        await loadLibros();
      } else {
        alert(data?.message || 'No se pudo eliminar el libro');
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Error en DELETE /libro/:id:', error);
      alert('Error de red al eliminar el libro.');
      btn.disabled = false;
    }
  }
});

// Cerrar modal de detalle
closeModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) detailModal.classList.add('hidden');
});

// --- 4. FILTROS Y BÚSQUEDA ---
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    loadLibros({ genero: btn.dataset.genero || '' });
  });
});

const searchInput = document.getElementById('searchInput');
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadLibros({ search: e.target.value.trim() });
  }, 300);
});

document.getElementById('disponibilidadFilter').addEventListener('change', (e) => {
  loadLibros({ disponible: e.target.value });
});

// Inicializar aplicación
checkHealth();
loadLibros();
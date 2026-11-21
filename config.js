const API_URL = 'https://libreria-api-1ybu.onrender.com/api/v1';

let currentFilter = {
  genero: '',
  search: '',
  disponible: '',
};


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
    const libros = await res.json();

    const grid = document.getElementById('librosGrid');
    if (!libros.length) {
      grid.innerHTML = '<p class="empty-msg">No hay libros registrados con esos filtros.</p>';
      return;
    }

    grid.innerHTML = libros
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
              class="btn-primary" 
              onclick="toggleDisponibilidad('${libro._id}', ${!libro.disponible})">
              ${libro.disponible ? 'Marcar prestado' : 'Marcar disponible'}
            </button>
            <button 
              class="btn-delete-libro" 
              title="Eliminar libro" 
              onclick="deleteLibro('${libro._id}')">
              ✕
            </button>
          </div>
        </article>
      `
      )
      .join('');
  } catch (error) {
    console.error('Error al cargar libros:', error);
    document.getElementById('librosGrid').innerHTML =
      '<p class="empty-msg">Error al conectar con el servidor.</p>';
  }
}


document.getElementById('libroForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const titulo = document.getElementById('tituloInput').value.trim();
  const autor = document.getElementById('autorInput').value.trim();
  const genero = document.getElementById('generoInput').value.trim();
  const anioPublicacion = Number(document.getElementById('anioInput').value);
  const paginas = Number(document.getElementById('paginasInput').value);
  const disponible = document.getElementById('disponibleInput')?.checked ?? true;

  const res = await fetch(`${API_URL}/libro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titulo,
      autor,
      genero,
      anioPublicacion,
      paginas,
      disponible,
    }),
  });

  if (res.ok) {
    e.target.reset();
    loadLibros();
  } else {
    const err = await res.json();
    alert(err.message || 'Error al guardar el libro');
  }
});


async function toggleDisponibilidad(id, nuevoEstado) {
  const res = await fetch(`${API_URL}/libro/${id}/disponibilidad`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disponible: nuevoEstado }),
  });

  if (res.ok) {
    loadLibros();
  } else {
    const err = await res.json();
    alert(err.message || 'No se pudo actualizar la disponibilidad');
  }
}


async function deleteLibro(id) {
  if (!confirm('¿Eliminar este libro del catálogo?')) return;

  const res = await fetch(`${API_URL}/libro/${id}`, { method: 'DELETE' });
  if (res.ok) {
    loadLibros();
  } else {
    const err = await res.json();
    alert(err.message || 'No se pudo eliminar el libro');
  }
}


document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    loadLibros({ genero: btn.dataset.genero || '' });
  });
});


const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    loadLibros({ search: e.target.value.trim() });
  });
}


const disponibilidadFilter = document.getElementById('disponibilidadFilter');
if (disponibilidadFilter) {
  disponibilidadFilter.addEventListener('change', (e) => {
    loadLibros({ disponible: e.target.value });
  });
}

loadLibros();
export function mostrarAlerta(elemento, mensaje, tipo) {
  let icon = "";
  if (tipo === "success") icon = '<i class="fa-solid fa-check-circle"></i> ';
  if (tipo === "error")
    icon = '<i class="fa-solid fa-circle-exclamation"></i> ';
  if (tipo === "info") icon = '<i class="fa-solid fa-circle-info"></i> ';

  const claseAlerta =
    tipo === "success"
      ? "alert-success"
      : tipo === "error"
      ? "alert-error"
      : "alert-info";

  elemento.innerHTML = `<div class="alert ${claseAlerta}">${icon}${mensaje}</div>`;
}

export function cerrarModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// Expose for HTML onclick
window.cerrarModal = cerrarModal;

window.onclick = function (event) {
  const modalEditar = document.getElementById("modalEditar");
  const modalStock = document.getElementById("modalStock");
  if (modalEditar && event.target === modalEditar)
    modalEditar.style.display = "none";
  if (modalStock && event.target === modalStock)
    modalStock.style.display = "none";
};

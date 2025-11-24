export function createModalContainer() {
  if (!document.getElementById("customModalContainer")) {
    const div = document.createElement("div");
    div.id = "customModalContainer";
    div.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: none; align-items: center;
            justify-content: center; z-index: 9999;
        `;
    div.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.2); animation: fadeIn 0.3s;">
                <div id="customModalIcon" style="font-size: 3rem; margin-bottom: 15px;"></div>
                <h3 id="customModalTitle" style="margin: 0 0 10px; color: #333;"></h3>
                <p id="customModalMessage" style="color: #666; margin-bottom: 20px; line-height: 1.5;"></p>
                <div id="customModalButtons" style="display: flex; justify-content: center; gap: 10px;"></div>
            </div>
        `;
    document.body.appendChild(div);

    // Add keyframe animation
    const style = document.createElement("style");
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);
  }
}

export function showMessageModal(title, message, type = "info") {
  createModalContainer();
  const container = document.getElementById("customModalContainer");
  const icon = document.getElementById("customModalIcon");
  const titleEl = document.getElementById("customModalTitle");
  const msgEl = document.getElementById("customModalMessage");
  const btns = document.getElementById("customModalButtons");

  titleEl.textContent = title;
  msgEl.textContent = message;

  let iconHtml = "";
  let btnColor = "#3b82f6"; // blue default

  if (type === "success") {
    iconHtml =
      '<i class="fa-solid fa-circle-check" style="color: #22c55e;"></i>';
    btnColor = "#22c55e";
  } else if (type === "error") {
    iconHtml =
      '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i>';
    btnColor = "#ef4444";
  } else if (type === "warning") {
    iconHtml =
      '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>';
    btnColor = "#f59e0b";
  } else {
    iconHtml =
      '<i class="fa-solid fa-circle-info" style="color: #3b82f6;"></i>';
  }

  icon.innerHTML = iconHtml;

  btns.innerHTML = `
        <button id="customModalOkBtn" style="background: ${btnColor}; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: opacity 0.2s;">
            Aceptar
        </button>
    `;

  const btn = document.getElementById("customModalOkBtn");
  btn.onclick = () => {
    container.style.display = "none";
  };
  btn.onmouseover = () => (btn.style.opacity = "0.9");
  btn.onmouseout = () => (btn.style.opacity = "1");

  container.style.display = "flex";
}

export function showConfirmModal(
  title,
  message,
  onConfirm,
  confirmText = "Sí, continuar",
  cancelText = "Cancelar"
) {
  createModalContainer();
  const container = document.getElementById("customModalContainer");
  const icon = document.getElementById("customModalIcon");
  const titleEl = document.getElementById("customModalTitle");
  const msgEl = document.getElementById("customModalMessage");
  const btns = document.getElementById("customModalButtons");

  titleEl.textContent = title;
  msgEl.textContent = message;
  icon.innerHTML =
    '<i class="fa-solid fa-circle-question" style="color: #6366f1;"></i>';

  btns.innerHTML = `
        <button id="customModalCancelBtn" style="background: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
            ${cancelText}
        </button>
        <button id="customModalConfirmBtn" style="background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
            ${confirmText}
        </button>
    `;

  const btnCancel = document.getElementById("customModalCancelBtn");
  const btnConfirm = document.getElementById("customModalConfirmBtn");

  btnCancel.onclick = () => {
    container.style.display = "none";
  };

  btnConfirm.onclick = () => {
    container.style.display = "none";
    if (onConfirm) onConfirm();
  };

  container.style.display = "flex";
}

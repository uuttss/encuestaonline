# Encuesta de Satisfacción - Curso Antigravity

Aplicación web moderna, responsiva y segura para recopilar opiniones y evaluaciones de estudiantes sobre el curso de **Antigravity**.

---

## 🚀 Características

- **Diseño Moderno:** Tema oscuro con glassmorphism, micro-animaciones y soporte responsive completo para móviles y tablets.
- **Validación en Vivo:** Barra de progreso interactiva y validación inmediata de campos.
- **Backend Seguro en Node.js:** 
  - 0 credenciales ni tokens expuestos en el código cliente.
  - Validación y sanitización estricta de datos en el servidor.
  - Protección contra spam y DoS (Rate Limiting por IP).
  - Protección contra Directory Traversal.
- **Integración con Webhook de n8n:** Envío automático de datos para automatización de correos electrónicos y notificaciones.
- **Persistencia Local:** Historial de respuestas en el navegador con visor modal de estadísticas y exportación a **CSV** y **JSON**.

---

## 📋 Preguntas del Formulario

1. `id_estudiante`: Identificador de texto del alumno.
2. `nivel_satisfaccion`: Escala del 1 (*Muy insatisfecho*) al 5 (*Muy satisfecho*).
3. `claridad_contenido`: Escala del 1 (*Muy poco claro*) al 5 (*Muy claro*).
4. `aplicabilidad_practica`: Escala del 1 (*Nada aplicable*) al 5 (*Muy aplicable*).
5. `comentarios_adicionales`: Campo de texto libre para feedback y sugerencias.

---

## 🛠️ Instalación y Uso

### 1. Clonar el repositorio
```bash
git clone https://github.com/uuttss/encuestaonline.git
cd encuestaonline
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo y añade la URL de tu webhook:
```bash
cp .env.example .env
```

Edita `.env`:
```env
PORT=3000
N8N_WEBHOOK_URL=https://tu-instancia.app.n8n.cloud/webhook/tu-id
```

### 3. Iniciar el Servidor
```bash
node server.js
```

Abre en tu navegador: **`http://localhost:3000`**

---

## 🔒 Seguridad

- Las credenciales y webhooks se gestionan exclusivamente desde el servidor backend a través de variables de entorno (`.env`).
- El archivo `.env` está excluido del control de versiones mediante `.gitignore`.

export function printReport(title: string, empresa: string | null, bodyHtml: string): void {
  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) {
    alert('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.');
    return;
  }

  const date = new Date().toLocaleDateString('es-CO', { dateStyle: 'long' });
  const time = new Date().toLocaleTimeString('es-CO', { timeStyle: 'short' });
  const period = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — NexoPyme AI</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;background:#fff;padding:48px 56px;font-size:13px;line-height:1.5}
.report-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #2563eb}
.brand{font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#1e293b}
.brand .nexo{color:#2563eb}
.brand .ai{background:#2563eb;color:#fff;padding:1px 6px;border-radius:4px;font-size:12px;margin-left:2px}
.report-title{font-size:26px;font-weight:800;color:#1e293b;margin-top:8px}
.report-period{font-size:12px;color:#64748b;margin-top:4px}
.meta{text-align:right}
.meta .empresa{font-size:16px;font-weight:700;color:#1e293b;margin-bottom:4px}
.meta .gen-date{font-size:11px;color:#64748b}
.section{margin-top:32px}
.section-title{font-size:16px;font-weight:700;color:#1e293b;padding-bottom:8px;border-bottom:2px solid #e2e8f0;margin-bottom:16px}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.stat-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.stat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
.stat-label{font-size:11px;color:#64748b;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
.stat-value{font-size:22px;font-weight:800;color:#1e293b}
.stat-sub{font-size:11px;color:#64748b;margin-top:3px}
p{color:#475569;margin-bottom:8px;line-height:1.7}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead tr{background:#f1f5f9}
th{padding:9px 12px;text-align:left;font-weight:600;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e2e8f0}
td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:12px}
tr:last-child td{border-bottom:none}
.badge{display:inline-block;padding:2px 9px;border-radius:9999px;font-size:11px;font-weight:600}
.badge-red{background:#fef2f2;color:#dc2626}
.badge-amber{background:#fffbeb;color:#d97706}
.badge-green{background:#f0fdf4;color:#16a34a}
.badge-blue{background:#eff6ff;color:#2563eb}
.list-items{list-style:none;display:flex;flex-direction:column;gap:8px}
.list-items li{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#475569}
.list-items li::before{content:"•";color:#2563eb;font-weight:700;flex-shrink:0}
.rec-card{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px}
.rec-title{font-weight:700;color:#1e293b;margin-bottom:4px}
.rec-meta{font-size:11px;color:#64748b;margin-bottom:0}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.semaforo{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}
.dot-green{background:#22c55e}
.dot-amber{background:#f59e0b}
.dot-red{background:#ef4444}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8}
@media print{
  body{padding:24px 32px}
  @page{margin:1.5cm;size:A4}
}
</style>
</head>
<body>
<div class="report-header">
  <div>
    <div class="brand"><span class="nexo">Nexo</span>Pyme<span class="ai">AI</span></div>
    <div class="report-title">${title}</div>
    <div class="report-period">Período: ${period}</div>
  </div>
  <div class="meta">
    <div class="empresa">${empresa ?? 'Mi Empresa'}</div>
    <div class="gen-date">Generado: ${date} · ${time}</div>
  </div>
</div>

${bodyHtml}

<div class="footer">
  <span>Generado automáticamente por NexoPyme AI</span>
  <span>${new Date().getFullYear()} · Todos los derechos reservados</span>
</div>
<script>
  window.onload = function() {
    window.focus();
    window.print();
  };
</script>
</body>
</html>`);
  win.document.close();
}

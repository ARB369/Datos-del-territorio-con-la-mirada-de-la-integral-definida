(function () {
  "use strict";

  // ---- Tabla 1: datos originales de la hoja filtrada (no se modifican) ----
  var DATOS = [
    { t: 0,  q: 4400.40, fecha: "24 ago 2026", hora: "06:00" },
    { t: 6,  q: 4490.98, fecha: "24 ago 2026", hora: "12:00" },
    { t: 12, q: 4367.20, fecha: "24 ago 2026", hora: "18:00" },
    { t: 24, q: 4694.34, fecha: "25 ago 2026", hora: "06:00" },
    { t: 30, q: 4782.09, fecha: "25 ago 2026", hora: "12:00" },
    { t: 36, q: 4738.86, fecha: "25 ago 2026", hora: "18:00" }
  ];
  var SEG = 3600; // segundos en una hora

  var estado = { completo: false, desdeCero: true };

  // ---- Formato numérico en español ----
  function num(x, dec) {
    return x.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function entero(x) {
    return Math.round(x).toLocaleString("es-CO");
  }

  // ---- Áreas por segmento (regla del trapecio = integral exacta del segmento recto) ----
  function areas() {
    var a = [];
    for (var i = 0; i < DATOS.length - 1; i++) {
      var dt = DATOS[i + 1].t - DATOS[i].t;
      a.push({ i: i, dt: dt, area: dt * (DATOS[i].q + DATOS[i + 1].q) / 2 });
    }
    return a;
  }
  var AREAS = areas();

  function resumen() {
    var n = estado.completo ? AREAS.length : 1;
    var area = 0;
    for (var i = 0; i < n; i++) area += AREAS[i].area;
    return { n: n, area: area, vol: area * SEG, tFin: DATOS[n].t };
  }

  // ================= GRÁFICA =================
  var W = 860, H = 470, ML = 92, MR = 26, MT = 26, MB = 66;
  var svg = document.getElementById("grafica");

  function el(tag, attrs, texto) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function dibujar() {
    while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild);

    var qs = DATOS.map(function (d) { return d.q; });
    var qMax = Math.max.apply(null, qs), qMin = Math.min.apply(null, qs);
    var y0, y1;
    if (estado.desdeCero) {
      y0 = 0;
      y1 = Math.ceil(qMax / 500) * 500 + 200;
    } else {
      var m = (qMax - qMin) * 0.25;
      y0 = Math.floor((qMin - m) / 50) * 50;
      y1 = Math.ceil((qMax + m) / 50) * 50;
    }

    var x0 = 0, x1 = 36;
    function X(t) { return ML + (t - x0) / (x1 - x0) * (W - ML - MR); }
    function Y(q) { return H - MB - (q - y0) / (y1 - y0) * (H - MB - MT); }

    // rejilla horizontal + etiquetas del eje vertical
    var pasos = 6;
    for (var k = 0; k <= pasos; k++) {
      var q = y0 + (y1 - y0) * k / pasos;
      var y = Y(q);
      svg.appendChild(el("line", { x1: ML, y1: y, x2: W - MR, y2: y, "class": "rejilla" }));
      svg.appendChild(el("text", { x: ML - 10, y: y + 4, "text-anchor": "end", "class": "etiqueta-eje" }, num(q, 0)));
    }
    // rejilla vertical en cada tiempo registrado
    DATOS.forEach(function (d) {
      svg.appendChild(el("line", { x1: X(d.t), y1: MT, x2: X(d.t), y2: H - MB, "class": "rejilla" }));
      svg.appendChild(el("text", { x: X(d.t), y: H - MB + 22, "text-anchor": "middle", "class": "etiqueta-eje" }, d.t));
    });

    var r = resumen();

    // región sombreada bajo los segmentos del intervalo elegido
    var base = Y(y0);
    var d = "M " + X(0) + " " + base;
    for (var i = 0; i <= r.n; i++) d += " L " + X(DATOS[i].t) + " " + Y(DATOS[i].q);
    d += " L " + X(r.tFin) + " " + base + " Z";
    svg.appendChild(el("path", { d: d, "class": "region" }));

    // divisiones internas de los trapecios
    for (var i = 1; i < r.n; i++) {
      svg.appendChild(el("line", { x1: X(DATOS[i].t), y1: base, x2: X(DATOS[i].t), y2: Y(DATOS[i].q), "class": "divisoria" }));
    }

    // trazo apagado: resto de los segmentos fuera del intervalo
    if (r.n < AREAS.length) {
      var dr = "M " + X(DATOS[r.n].t) + " " + Y(DATOS[r.n].q);
      for (var i = r.n + 1; i < DATOS.length; i++) dr += " L " + X(DATOS[i].t) + " " + Y(DATOS[i].q);
      svg.appendChild(el("path", { d: dr, "class": "trazo-apagado" }));
    }

    // trazo activo
    var da = "M " + X(DATOS[0].t) + " " + Y(DATOS[0].q);
    for (var i = 1; i <= r.n; i++) da += " L " + X(DATOS[i].t) + " " + Y(DATOS[i].q);
    svg.appendChild(el("path", { d: da, "class": "trazo" }));

    // puntos con su valor
    DATOS.forEach(function (p, i) {
      var activo = i <= r.n;
      svg.appendChild(el("circle", { cx: X(p.t), cy: Y(p.q), r: 5, "class": "punto" + (activo ? " punto-activo" : "") }));
      svg.appendChild(el("text", { x: X(p.t), y: Y(p.q) - 14, "text-anchor": "middle", "class": "valor", opacity: activo ? 1 : .5 }, num(p.q, 2)));
    });

    // ejes
    svg.appendChild(el("line", { x1: ML, y1: H - MB, x2: W - MR, y2: H - MB, "class": "eje" }));
    svg.appendChild(el("line", { x1: ML, y1: MT, x2: ML, y2: H - MB, "class": "eje" }));
    svg.appendChild(el("text", { x: ML + (W - ML - MR) / 2, y: H - 18, "text-anchor": "middle", "class": "titulo-eje" }, "Tiempo transcurrido t (horas)"));
    svg.appendChild(el("text", { x: 22, y: MT + (H - MB - MT) / 2, "text-anchor": "middle", "class": "titulo-eje", transform: "rotate(-90 22 " + (MT + (H - MB - MT) / 2) + ")" }, "Caudal Q (m³/s)"));
  }

  // ================= TEXTOS =================
  function pintarProcedimiento() {
    var r = resumen();
    var caja = document.getElementById("procedimiento");
    var Q0 = DATOS[0].q, Q1 = DATOS[1].q, dt = DATOS[1].t - DATOS[0].t;
    var m = (Q1 - Q0) / dt;

    if (!estado.completo) {
      caja.innerHTML =
        "<p>El primer segmento une los puntos (0 · " + num(Q0, 2) + ") y (" + dt + " · " + num(Q1, 2) + "), de modo que la función es lineal en ese intervalo.</p>" +
        '<div class="mate">f(t) = Q<span>₀</span> + ((Q<span>₁</span> − Q<span>₀</span>) / Δt) · t = ' + num(Q0, 2) + " + " + num(m, 6) + " t,&nbsp;&nbsp; 0 ≤ t ≤ " + dt + "</div>" +
        "<p>Se comprueba que f(0) = " + num(Q0, 2) + " y f(" + dt + ") = " + num(Q1, 2) + ", los dos caudales registrados.</p>" +
        '<div class="mate">V<span>₁</span> = 3600 · ∫<span>₀</span><sup>' + dt + "</sup> f(t) dt = 3600 · [ " + num(Q0, 2) + " t + " + num(m / 2, 6) + " t² ]<span>₀</span><sup>" + dt + "</sup></div>" +
        '<div class="mate">= 3600 · ( ' + num(Q0 * dt, 2) + " + " + num(m / 2 * dt * dt, 2) + " ) = 3600 · " + num(r.area, 2) + " = " + entero(r.vol) + " m³</div>" +
        '<p class="tenue">El factor 3600 convierte las horas del eje horizontal en segundos, para que m³/s · s quede en m³.</p>';
    } else {
      caja.innerHTML =
        "<p>En el periodo completo la función es lineal por tramos: cada par de registros consecutivos define un segmento distinto. La integral se separa en los cinco tramos y cada uno aporta el área de un trapecio.</p>" +
        '<div class="mate">V = 3600 · ∫<span>₀</span><sup>36</sup> f(t) dt = 3600 · Σ (t<span>ᵢ₊₁</span> − t<span>ᵢ</span>) · (Q<span>ᵢ</span> + Q<span>ᵢ₊₁</span>) / 2</div>' +
        '<div class="mate">= 3600 · ( ' + AREAS.map(function (a) { return num(a.area, 2); }).join(" + ") + " )</div>" +
        '<div class="mate">= 3600 · ' + num(r.area, 2) + " = " + entero(r.vol) + " m³</div>" +
        '<p class="tenue">El tramo de 12 a 24 horas dura 12 horas porque entre el registro de las 18:00 del 24 de agosto y el de las 06:00 del 25 de agosto pasan doce horas sin medición intermedia.</p>';
    }
  }

  function pintarTabla1() {
    var cuerpo = document.getElementById("cuerpo-tabla1");
    cuerpo.innerHTML = "";
    var r = resumen();
    DATOS.forEach(function (d, i) {
      var tr = document.createElement("tr");
      if (i <= r.n) tr.className = "marcada";
      tr.innerHTML = "<td>" + d.fecha + " · " + d.hora + "</td><td>" + d.t + "</td><td>" + num(d.q, 2) + "</td>";
      cuerpo.appendChild(tr);
    });
  }

  function pintarSegmentos() {
    var r = resumen();
    var cuerpo = document.getElementById("cuerpo-segmentos");
    cuerpo.innerHTML = "";
    AREAS.forEach(function (a, i) {
      var tr = document.createElement("tr");
      var dentro = i < r.n;
      if (dentro) tr.className = "marcada";
      tr.innerHTML = "<td>t = " + DATOS[i].t + " a " + DATOS[i + 1].t + " h</td><td>" + a.dt + "</td><td>" +
        num(a.area, 2) + "</td><td>" + entero(a.area * SEG) + "</td>";
      if (!dentro) tr.style.opacity = .42;
      cuerpo.appendChild(tr);
    });
    document.getElementById("pie-rotulo").textContent = estado.completo ? "Total de 0 a 36 h" : "Total de 0 a 6 h";
    document.getElementById("pie-area").textContent = num(r.area, 2);
    document.getElementById("pie-vol").textContent = entero(r.vol);
  }

  function pintarResultado() {
    var r = resumen();
    document.getElementById("rotulo-resultado").textContent = estado.completo
      ? "Volumen del periodo completo, de 0 a 36 horas"
      : "Volumen del primer intervalo, de 0 a 6 horas";
    document.getElementById("cifra").textContent = entero(r.vol);
    document.getElementById("glosa").textContent = estado.completo
      ? "Es el agua que pasó por la estación El Banco durante las 36 horas que cubren los seis registros, entre las 06:00 del 24 de agosto y las 18:00 del 25 de agosto de 2026. Equivale al área bajo los cinco segmentos, convertida a metros cúbicos."
      : "Es el agua que pasó por la estación El Banco durante las primeras seis horas, entre el primer y el segundo registro. Equivale al área bajo el primer segmento, convertida a metros cúbicos.";
    document.getElementById("nota-escala").textContent = estado.desdeCero
      ? "El eje vertical arranca en 0, así que la región sombreada representa fielmente el área que se integra."
      : "El eje vertical está ampliado para ver las variaciones del caudal. En esta vista la región sombreada ya no representa el área completa, aunque el volumen calculado sigue siendo el mismo.";
  }

  function pintarChequeo() {
    var manual = 96026904;
    var calc = AREAS[0].area * SEG;
    document.getElementById("chequeo").textContent = entero(calc) + " m³";
    document.getElementById("diferencia").textContent = entero(Math.abs(calc - manual)) + " m³";
  }

  function actualizar() {
    document.getElementById("btn-primero").setAttribute("aria-pressed", String(!estado.completo));
    document.getElementById("btn-completo").setAttribute("aria-pressed", String(estado.completo));
    document.getElementById("btn-cero").setAttribute("aria-pressed", String(estado.desdeCero));
    document.getElementById("btn-zoom").setAttribute("aria-pressed", String(!estado.desdeCero));
    dibujar();
    pintarResultado();
    pintarProcedimiento();
    pintarTabla1();
    pintarSegmentos();
  }

  document.getElementById("btn-primero").addEventListener("click", function () { estado.completo = false; actualizar(); });
  document.getElementById("btn-completo").addEventListener("click", function () { estado.completo = true; actualizar(); });
  document.getElementById("btn-cero").addEventListener("click", function () { estado.desdeCero = true; actualizar(); });
  document.getElementById("btn-zoom").addEventListener("click", function () { estado.desdeCero = false; actualizar(); });

  pintarChequeo();
  actualizar();
})();

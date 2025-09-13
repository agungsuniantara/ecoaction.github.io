(function ($, window, document) {
  "use strict";

  const LS_TITIK = "eco_titik";
  const LS_CHALLENGE = "eco_challenges";
  const LS_TESTI = "eco_testi";

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function seedTitikIfEmpty() {
    const exists = lsGet(LS_TITIK, []);
    if (!exists.length) {
      const seed = [
        {
          nama: "Bank Sampah Kerta",
          lat: -8.659,
          lng: 115.216,
          kategori: "Bank Sampah",
        },
        {
          nama: "Taman Kota Hijau",
          lat: -8.674,
          lng: 115.217,
          kategori: "Taman Kota",
        },
      ];
      lsSet(LS_TITIK, seed);
    }
  }

  function renderTitik() {
    const $ul = $("#listTitik");
    if (!$ul.length) return;
    const data = lsGet(LS_TITIK, []);
    $ul.empty();
    data.forEach((t, idx) => {
      const li = $(
        `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
            <div class="fw-semibold">${escapeHtml(t.nama)}</div>
            <div class="text-muted small">${escapeHtml(t.kategori)} • (${
          t.lat
        }, ${t.lng})</div>
        </div>
        <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" data-goto="${idx}">Lihat</button>
            <button class="btn btn-outline-danger" data-del="${idx}">Hapus</button>
        </div>
        </li>`
      );
      $ul.append(li);
    });
  }

  $(document).on("click", "#listTitik button[data-goto]", function () {
    const idx = Number($(this).data("goto"));
    const data = lsGet(LS_TITIK, []);
    const t = data[idx];
    if (!t) return;
    $("#mapFrame").attr(
      "src",
      `https://www.google.com/maps?q=${t.lat},${t.lng}&z=15&output=embed`
    );
  });

  $(document).on("click", "#listTitik button[data-del]", function () {
    const idx = Number($(this).data("del"));
    const data = lsGet(LS_TITIK, []);
    if (idx >= 0 && idx < data.length) {
      data.splice(idx, 1);
      lsSet(LS_TITIK, data);
      renderTitik();
    }
  });

  $(document).on("submit", "#formTitik", function (e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(this).entries());
    const item = {
      nama: (f.nama || "").toString().trim(),
      lat: Number(f.lat),
      lng: Number(f.lng),
      kategori: (f.kategori || "").toString().trim(),
    };
    const data = lsGet(LS_TITIK, []);
    data.push(item);
    lsSet(LS_TITIK, data);
    this.reset();
    renderTitik();
  });

  const POINTS = { plastik: 5, pohon: 7, bersih: 6, hemat: 4 };

  function renderLeaderboard() {
    const $lb = $("#leaderboard");
    if (!$lb.length) return;
    const arr = lsGet(LS_CHALLENGE, []);
    const scores = {};
    arr.forEach((it) => {
      const who = (it.nama || "Anonim").trim() || "Anonim";
      scores[who] = (scores[who] || 0) + (POINTS[it.jenis] || 0);
    });

    const sorted = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    $lb.empty();
    sorted.forEach(([nama, score]) =>
      $lb.append(
        `<li class="list-group-item d-flex justify-content-between"><span>${escapeHtml(
          nama
        )}</span><strong>${score} pts</strong></li>`
      )
    );
  }

  function renderPreviewAksi() {
    const $pv = $("#previewAksi");
    if (!$pv.length) return;
    const arr = lsGet(LS_CHALLENGE, []);
    $pv.empty();
    arr
      .slice(-6)
      .reverse()
      .forEach((it) => {
        const label = jenisLabel(it.jenis);
        const img = it.foto
          ? `<img src="${it.foto}" class="w-100 rounded-3" style="height:160px;object-fit:cover;" alt="bukti aksi">`
          : "";
        $pv.append(
          `<div class="col-sm-6 col-lg-4"><div class="card p-2">${img}<div class="small mt-2">${escapeHtml(
            it.nama || "Anonim"
          )} • ${escapeHtml(label)}</div></div></div>`
        );
      });
  }

  function jenisLabel(code) {
    switch (code) {
      case "plastik":
        return "7 Hari Tanpa Kantong Plastik";
      case "pohon":
        return "Tanam 1 Pohon";
      case "bersih":
        return "Bersih-bersih Sekolah";
      case "hemat":
        return "Hemat Listrik Sepekan";
      default:
        return code || "-";
    }
  }

  $(document).on("submit", "#formChallenge", async function (e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(this).entries());
    const file = document.getElementById("fotoAksi")?.files?.[0];
    let foto64 = "";
    if (file) {
      foto64 = await fileToBase64(file);
    }
    const arr = lsGet(LS_CHALLENGE, []);
    arr.push({
      nama: (f.nama || "Anonim").toString().trim() || "Anonim",
      jenis: (f.jenis || "").toString(),
      foto: foto64,
      ts: Date.now(),
    });
    lsSet(LS_CHALLENGE, arr);
    this.reset();
    renderPreviewAksi();
    renderLeaderboard();
  });

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
  }

  $(document).on("submit", "#formCarbon", function (e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(this).entries());
    const km = Number(f.km || 0);
    const kwh = Number(f.kwh || 0);
    const plastik = Number(f.plastik || 0);

    const weekly = km * 0.18 + plastik * 0.05;
    const monthly = kwh * 0.75 + weekly * 4;

    $("#carbonResult").text(
      `${weekly.toFixed(1)} kg CO₂/minggu • ${monthly.toFixed(
        1
      )} kg CO₂/bulan (perkiraan)`
    );

    const saran = [];
    if (km > 30)
      saran.push("Coba naik angkutan umum/berbagi tumpangan 2x seminggu.");
    if (kwh > 200)
      saran.push("Ganti lampu ke LED & matikan perangkat standby.");
    if (plastik > 5)
      saran.push("Bawa tas belanja & tumbler untuk kurangi plastik.");
    $("#carbonTips").text(saran.join(" "));
  });

  function renderTesti() {
    const $box = $("#testiList");
    if (!$box.length) return;
    const arr = lsGet(LS_TESTI, []);
    $box.empty();
    arr
      .slice(-6)
      .reverse()
      .forEach((t) =>
        $box.append(
          `<div class="border-bottom py-2"><strong>${escapeHtml(
            t.nama || "Anonim"
          )}</strong> (${
            t.sekolah ? escapeHtml(t.sekolah) : "-"
          }) — ${escapeHtml(t.pesan || "")}</div>`
        )
      );
  }

  $(document).on("submit", "#formTesti", function (e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(this).entries());
    const arr = lsGet(LS_TESTI, []);
    arr.push({
      nama: (f.nama || "Anonim").toString().trim() || "Anonim",
      sekolah: (f.sekolah || "-").toString().trim() || "-",
      pesan: (f.pesan || "").toString().trim(),
      ts: Date.now(),
    });
    lsSet(LS_TESTI, arr);
    this.reset();
    renderTesti();
  });

  function renderBarChart() {
    const $svg = $("#barChart");
    if (!$svg.length) return;

    const data = [22, 30, 18, 26, 35, 40, 28, 34, 38, 45, 42, 50];
    const labels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    const rect = $svg[0].getBoundingClientRect();
    const w = Math.max(600, Math.floor(rect.width) || 600);
    const h = Math.max(320, Math.floor(rect.height) || 320);
    const pad = 40;
    const maxV = Math.max.apply(null, data) * 1.2;
    const bw = (w - pad * 2) / data.length;

    $svg.empty().attr("viewBox", `0 0 ${w} ${h}`);

    appendSvg($svg, "line", {
      x1: pad,
      y1: h - pad,
      x2: w - pad,
      y2: h - pad,
      stroke: "#999",
    });
    appendSvg($svg, "line", {
      x1: pad,
      y1: pad,
      x2: pad,
      y2: h - pad,
      stroke: "#999",
    });

    data.forEach((v, i) => {
      const x = pad + i * bw + 8;
      const bh = (v / maxV) * (h - pad * 2);
      const y = h - pad - bh;

      appendSvg($svg, "rect", {
        x: x,
        y: y,
        width: bw - 16,
        height: bh,
        rx: 6,
        class: "bar",
      });
      appendSvg($svg, "text", {
        x: x + (bw - 16) / 2,
        y: h - pad + 14,
        "text-anchor": "middle",
        "font-size": 10,
      }).text(labels[i]);
      appendSvg($svg, "text", {
        x: x + (bw - 16) / 2,
        y: y - 4,
        "text-anchor": "middle",
        "font-size": 10,
      }).text(v);
    });
  }

  function appendSvg($parent, tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
    $parent[0].appendChild(el);
    return $(el);
  }

  function escapeHtml(str) {
    return (str == null ? "" : String(str))
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  $(function () {
    seedTitikIfEmpty();
    renderTitik();

    renderPreviewAksi();
    renderLeaderboard();

    renderTesti();
    renderBarChart();

    if ($("#chat").length) {
      const BOT_RULES = [
        {
          k: ["pilah", "sampah"],
          a: "Pisahkan organik (sisa makanan, daun) dan anorganik (plastik, kaca, logam). Sediakan 2–3 tempat sampah terpisah di rumah/sekolah.",
        },
        {
          k: ["tanam", "pohon"],
          a: "Menanam pohon membantu serap CO₂, hasilkan O₂, sejukkan lingkungan, dan cegah erosi tanah.",
        },
        {
          k: ["plastik", "kurangi"],
          a: "Bawa tas kain, tumbler, dan kotak makan. Tolak sedotan & kantong plastik sekali pakai saat tidak diperlukan.",
        },
        {
          k: ["hemat", "listrik"],
          a: "Matikan lampu saat tidak dipakai, cabut charger, gunakan lampu LED, atur suhu AC 24–26°C.",
        },
        {
          k: ["bank", "sampah"],
          a: "Coba buka halaman Peta Aksi untuk menambahkan/menemukan lokasi bank sampah terdekat.",
        },
        {
          k: ["daur", "ulang"],
          a: "Bersihkan dan keringkan kemasan sebelum didaur ulang. Ikuti ketentuan lokal untuk jenis plastik yang diterima.",
        },
        {
          k: ["kompos"],
          a: "Mulai kompos rumah dari sisa dapur (kulit buah, sayur). Hindari daging & minyak. Jaga rasio basah-kering agar tidak bau.",
        },
      ];
      const BOT_FALLBACK =
        'Tips umum: kurangi plastik sekali pakai, hemat listrik, dan dukung kegiatan bersih-bersih lingkungan. Coba tanya tentang "pilah sampah", "tanam pohon", "hemat listrik", atau "bank sampah".';

      function botReply(q) {
        const qt = q.toLowerCase();
        for (const rule of BOT_RULES) {
          if (rule.k.every((word) => qt.includes(word))) return rule.a;
        }
        return BOT_FALLBACK;
      }
      function appendMsg(sender, text) {
        const cls = sender === "user" ? "bubble-user" : "bubble-bot";
        const $chat = $("#chat");
        const escapedText = escapeHtml(text);
        $chat.append(`<div class="${cls}">${escapedText}</div>`);
        $chat.scrollTop($chat[0].scrollHeight);
      }
      appendMsg(
        "bot",
        "Halo! Saya EcoBot 🌿. Tanyakan apa pun tentang aksi ramah lingkungan."
      );
      $("#chatForm").on("submit", function (e) {
        e.preventDefault();
        const val = $("#chatInput").val().trim();
        if (!val) return;
        appendMsg("user", val);
        setTimeout(() => appendMsg("bot", botReply(val)), 350);
        $("#chatInput").val("").focus();
      });
    }

    if ($("#quizModal").length) {
      const quizData = [
        {
          question: "1. Apa itu Daur Ulang?",
          options: [
            "Menggunakan barang yang tidak dipakai",
            "Menggunakan barang yang tadi dipakai",
            "Mengolah barang menjadi barang baru",
            "Memberi tujuan ulang barang yang ada",
          ],
          answer: 2,
        },
        {
          question: "2. Manakah dari berikut yang termasuk sampah organik?",
          options: ["Botol plastik", "Sisa sayuran", "Kaleng minuman", "Kaca"],
          answer: 1,
        },
        {
          question: "3. 'Reduce' dalam prinsip 3R berarti...",
          options: [
            "Mengurangi produksi sampah",
            "Memakai ulang barang",
            "Mendaur ulang sampah",
            "Memperbaiki barang rusak",
          ],
          answer: 0,
        },
      ];
      let currentQuestionIndex = 0;
      let score = 0;

      const $quizModal = $("#quizModal");
      const $questionView = $("#quiz-question-view");
      const $resultView = $("#quiz-result-view");
      const $question = $("#quiz-question");
      const $options = $("#quiz-options");

      function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        $questionView.removeClass("d-none");
        $resultView.addClass("d-none");
        showQuestion();
      }
      function showQuestion() {
        const q = quizData[currentQuestionIndex];
        $question.text(q.question);
        $options.empty();
        q.options.forEach((option, index) => {
          const altClass =
            index < 2 ? "quiz-option-default-alt" : "quiz-option-default";
          $options.append(
            `<div class="quiz-option ${altClass}" data-index="${index}">${option}</div>`
          );
        });
      }
      $options.on("click", ".quiz-option", function () {
        if ($(this).hasClass("disabled")) return;
        const selectedIndex = $(this).data("index");
        const correctIndex = quizData[currentQuestionIndex].answer;
        $options.find(".quiz-option").addClass("disabled");
        if (selectedIndex === correctIndex) {
          score++;
          $(this)
            .removeClass("quiz-option-default quiz-option-default-alt")
            .addClass("correct");
        } else {
          $(this)
            .removeClass("quiz-option-default quiz-option-default-alt")
            .addClass("incorrect");
          $options
            .find(`.quiz-option[data-index="${correctIndex}"]`)
            .removeClass("quiz-option-default quiz-option-default-alt")
            .addClass("correct");
        }
        setTimeout(() => {
          currentQuestionIndex++;
          if (currentQuestionIndex < quizData.length) {
            showQuestion();
          } else {
            showResult();
          }
        }, 1500);
      });
      function showResult() {
        $questionView.addClass("d-none");
        $resultView.removeClass("d-none");
        const totalPoints = `${score * 25}/${quizData.length * 25}`;
        const grade = score === quizData.length ? "A" : score > 1 ? "B" : "C";
        $("#quiz-score").text(totalPoints);
        $("#quiz-grade").text(grade);
      }
      $("#quiz-retry-btn").on("click", function () {
        startQuiz();
      });
      $quizModal.on("shown.bs.modal", function () {
        startQuiz();
      });
    }
  });
})(jQuery, window, document);

import { classifyAccess, lookupCountry } from "./gate.js";
import { questions } from "./questions.js";

const SESSION_KEY = "hk-policy-survey-session";
const app = document.querySelector("#app");

const state = {
  step: 0,
  answers: {},
  note: "",
};

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(value) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // Session storage can be unavailable. The answers still exist only in this page.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shell(title, body, extraClass = "") {
  app.innerHTML = `
    <article class="card ${extraClass}">
      <p class="mark">服务评价</p>
      <h1>${title}</h1>
      ${body}
    </article>
  `;
}

function showWeChatBlock() {
  shell(
    "请用手机微信打开",
    `<p class="lead">这段问卷只在手机微信里打开。请用手机打开微信，再点这个链接。</p>
     <p>电脑浏览器、手机自带浏览器，以及电脑上的微信，都进不去。</p>`,
    "block"
  );
}

function showHongKongBlock() {
  shell(
    "香港地区无法打开",
    `<p class="lead">当前网络显示您在香港。这个页面不向香港地区开放。</p>`,
    "block"
  );
}

function showGeoUnknown() {
  shell(
    "暂时无法确认所在地区",
    `<p class="lead">暂时无法确认您所在的地区，问卷因此不会打开。</p>
     <p>请检查网络后再试。</p>
     <button type="button" id="retry" class="primary">重试</button>`,
    "block"
  );
  document.querySelector("#retry").addEventListener("click", () => {
    checkGeo();
  });
}

function showChecking() {
  shell("正在确认所在地区", `<p class="lead">确认完成后才会显示问卷。</p>`, "pending");
}

function showIntro() {
  shell(
    "香港保单服务体验",
    `<p class="lead">这是给已经买过香港保单的内地客户用的。只问办理和售后，这里不能买保险，也不会推荐产品。</p>
     <p>请只评价您已经办过的那次服务。不要填写姓名、证件号或完整保单号。</p>
     <button type="button" id="start" class="primary">开始评价</button>`
  );
  document.querySelector("#start").addEventListener("click", () => {
    state.step = 0;
    renderQuestion();
  });
}

function renderQuestion() {
  const question = questions[state.step];
  const selected = state.answers[question.id] || "";
  const options = question.options
    .map((option) => {
      const pressed = option === selected ? "true" : "false";
      return `<button type="button" class="option" data-value="${escapeHtml(option)}" aria-pressed="${pressed}">${escapeHtml(option)}</button>`;
    })
    .join("");
  const note =
    state.step === questions.length - 1
      ? `<label class="note" for="note">还想补充的一句（选填）
           <textarea id="note" maxlength="200" placeholder="不要写姓名、证件号或完整保单号">${escapeHtml(state.note)}</textarea>
         </label>`
      : "";
  const back = state.step > 0 ? `<button type="button" id="back" class="ghost">上一题</button>` : `<span></span>`;

  shell(
    question.prompt,
    `<p class="progress"><span>第 ${state.step + 1} 题</span><span>共 ${questions.length} 题</span></p>
     <div class="bar" aria-hidden="true"><span style="width:${((state.step + 1) / questions.length) * 100}%"></span></div>
     <div class="options" role="group" aria-label="${escapeHtml(question.prompt)}">${options}</div>
     ${note}
     <p id="need" class="warn" hidden>请先选一项。</p>
     <div class="actions">${back}<button type="button" id="next" class="primary">${state.step === questions.length - 1 ? "提交" : "下一题"}</button></div>
     <p class="fine">本页不办理投保。</p>`
  );

  app.querySelectorAll(".option").forEach((button) => {
    button.addEventListener("click", () => {
      state.answers[question.id] = button.dataset.value;
      writeSession({ phase: "draft", answers: state.answers, note: state.note, step: state.step });
      renderQuestion();
    });
  });

  const noteField = document.querySelector("#note");
  if (noteField) {
    noteField.addEventListener("input", () => {
      state.note = noteField.value.slice(0, 200);
      writeSession({ phase: "draft", answers: state.answers, note: state.note, step: state.step });
    });
  }

  document.querySelector("#back")?.addEventListener("click", () => {
    state.step -= 1;
    renderQuestion();
  });

  document.querySelector("#next").addEventListener("click", () => {
    if (!state.answers[question.id]) {
      document.querySelector("#need").hidden = false;
      return;
    }
    if (state.step === questions.length - 1) {
      submit();
      return;
    }
    state.step += 1;
    writeSession({ phase: "draft", answers: state.answers, note: state.note, step: state.step });
    renderQuestion();
  });
}

function submit() {
  const saved = {
    phase: "submitted",
    answers: state.answers,
    note: state.note,
    at: new Date().toISOString(),
  };
  writeSession(saved);
  showSuccess(saved);
}

function showSuccess(saved) {
  const lines = questions
    .map(
      (question) =>
        `<li><span>${escapeHtml(question.prompt)}</span><strong>${escapeHtml(saved.answers[question.id] || "")}</strong></li>`
    )
    .join("");
  const note = saved.note
    ? `<li><span>补充</span><strong>${escapeHtml(saved.note)}</strong></li>`
    : "";
  shell(
    "已记下您的评价",
    `<p class="lead">答案只留在这次浏览器会话里，没有上传。</p>
     <p>关闭这个页面后，记录就会消失。</p>
     <ol class="summary">${lines}${note}</ol>
     <button type="button" id="again" class="ghost">重新填写</button>`
  );
  document.querySelector("#again").addEventListener("click", () => {
    state.step = 0;
    state.answers = {};
    state.note = "";
    writeSession({ phase: "draft", answers: {}, note: "", step: 0 });
    showIntro();
  });
}

async function checkGeo() {
  showChecking();
  try {
    const country = await lookupCountry();
    if (country === "HK") {
      showHongKongBlock();
      return;
    }
    const saved = readSession();
    if (saved?.phase === "submitted") {
      showSuccess(saved);
      return;
    }
    if (saved?.phase === "draft") {
      state.answers = saved.answers || {};
      state.note = saved.note || "";
      state.step = Number.isInteger(saved.step) ? saved.step : 0;
      renderQuestion();
      return;
    }
    showIntro();
  } catch {
    showGeoUnknown();
  }
}

function start() {
  if (classifyAccess(navigator.userAgent) !== "allow") {
    showWeChatBlock();
    return;
  }
  checkGeo();
}

start();

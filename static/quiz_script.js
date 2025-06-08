const MIN_SPEED = 0.5;
const MAX_SPEED = 2;

function randomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

class Blob {
  constructor(el) {
    this.el = el;
    const boundingRect = this.el.getBoundingClientRect();
    this.size = boundingRect.width;
    this.initialX = randomNumber(0, window.innerWidth - this.size);
    this.initialY = randomNumber(0, window.innerHeight - this.size);
    this.el.style.top = `${this.initialY}px`;
    this.el.style.left = `${this.initialX}px`;
    this.vx = randomNumber(MIN_SPEED, MAX_SPEED) * (Math.random() > 0.5 ? 1 : -1);
    this.vy = randomNumber(MIN_SPEED, MAX_SPEED) * (Math.random() > 0.5 ? 1 : -1);
    this.x = this.initialX;
    this.y = this.initialY;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x >= window.innerWidth - this.size || this.x <= 0) this.vx *= -1;
    if (this.y >= window.innerHeight - this.size || this.y <= 0) this.vy *= -1;
    this.el.style.transform = `translate(${this.x - this.initialX}px, ${this.y - this.initialY}px)`;
  }
}

function initBlobs() {
  const blobEls = document.querySelectorAll('.blob');
  const blobs = Array.from(blobEls).map(el => new Blob(el));
  function update() {
    requestAnimationFrame(update);
    blobs.forEach(blob => blob.update());
  }
  requestAnimationFrame(update);
}

initBlobs();

const questions = [
  "我覺得想哭", "我覺得心情不好", "我覺得比以前容易發脾氣",
  "我睡不好", "我覺得不想吃東西", "我覺得胸口悶悶的",
  "我覺得不輕鬆、不舒服", "我覺得身體疲勞虛弱、無力", "我覺得很煩",
  "我覺得記憶力不好", "我覺得做事時無法專心", "我覺得想事情或做事時，比平常要緩慢",
  "我覺得比以前較沒信心", "我覺得較會往壞處想", "我覺得想不開、甚至想死",
  "我覺得對什麼都失去興趣", "我覺得身體不舒服（如：頭痛、頭暈、心悸或肚子不舒服等）",
  "我覺得自己很沒用"
];

const options = ["每週不到一天", "每週１-２天", "每週３-４天", "每週５-７天"];

const form = document.getElementById("depression-form");
const questionContainer = document.getElementById("question-container");
const progressIndicator = document.getElementById("progress");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-btn");

let currentQuestion = 0;
const answers = new Array(questions.length).fill(null);

function renderQuestion(index) {
  const q = questions[index];
  questionContainer.innerHTML = `
    <div class="question">
      <p>${index + 1}. ${q}</p>
      <div class="options">
        ${options.map((opt, i) => `
          <label>
            <input type="radio" name="q${index}" value="${i}" ${answers[index] == i ? 'checked' : ''} />
            ${opt}
          </label>
        `).join("")}
      </div>
    </div>
  `;

  // 顯示進度
  progressIndicator.innerText = `第 ${index + 1} 題，共 ${questions.length} 題`;

  // 顯示按鈕
  prevBtn.style.display = index === 0 ? "none" : "inline-block";
  nextBtn.style.display = index === questions.length - 1 ? "none" : "inline-block";
  submitBtn.style.display = index === questions.length - 1 ? "inline-block" : "none";
}

form.addEventListener("click", (e) => {
  if (e.target.name && e.target.name.startsWith("q")) {
    const qIndex = parseInt(e.target.name.slice(1), 10);
    answers[qIndex] = parseInt(e.target.value, 10);
  }
});

prevBtn.addEventListener("click", () => {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion(currentQuestion);
  }
});

nextBtn.addEventListener("click", () => {
  if (answers[currentQuestion] === null) {
    alert("請選擇一個選項再繼續！");
    return;
  }
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion(currentQuestion);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (answers.includes(null)) {
    alert("請完成所有題目再送出！");
    return;
  }

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    });

    const data = await res.json();
    document.getElementById("score").innerText = `您的總分為：${data.score}`;
    document.getElementById("advice").innerText = data.advice;

    const resultSection = document.getElementById("result");
    resultSection.classList.remove("hidden");

    // 可選：新增輔導資源或重新填寫按鈕
    resultSection.innerHTML += `
      <div class="actions">
        <a href="/" class="button">回首頁</a>
        <a href="/depression-test.html" class="button">重新填寫</a>
        <a href="https://mentalhealth.org.tw/" target="_blank" class="button">尋求協助</a>
      </div>
    `;

    window.scrollTo({ top: resultSection.offsetTop, behavior: 'smooth' });
  } catch (err) {
    alert("伺服器錯誤，請稍後再試！");
    console.error(err);
  }
});

renderQuestion(currentQuestion);

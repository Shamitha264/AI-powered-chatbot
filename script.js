const Container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector(".file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const previewImg = fileUploadWrapper.querySelector(".file-preview");
const deleteChatsBtn = document.querySelector("#delete-chats-button");
const Themetoggle = document.querySelector("#theme-toggle-btn");
const cancelBtn = document.getElementById("cancel-file-btn");

const API_KEY = "AIzaSyD9LwiLgMkmvFXLsdOR5lLf5kxhe_NdUX0";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory = [];
const userData = { message: "", file: {} };

const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};



document.addEventListener('DOMContentLoaded', function () {
  const inputField = document.querySelector('.prompt-input');
  const suggestions = document.querySelector('.suggestions');
//to hide suggestion 
  inputField.addEventListener('input', function () {
    if (inputField.value.trim() !== '') {
      suggestions.style.display = 'none';
    } else {
      suggestions.style.display = 'flex'; // or 'block', depending on your layout
    }
  });
});


const scrollToBottom = () => {
  Container.scrollTo({ top: Container.scrollHeight, behavior: "smooth" });
};

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};
//abort
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])
    ]
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    console.log(error);
  } finally {
    userData.file = {};
  }
};

const handleFormsSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding");

  const userMsgDiv = document.createElement("div");
  userMsgDiv.classList.add("message", "user-message");

  const textP = document.createElement("p");
  textP.classList.add("message-text");
  textP.textContent = userMessage;
  userMsgDiv.appendChild(textP);
//img
  if (userData.file.data) {
    if (userData.file.isImage) {
      const img = document.createElement("img");
      img.src = `data:${userData.file.mime_type};base64,${userData.file.data}`;
      img.classList.add("img-attachment");
      userMsgDiv.appendChild(img);
    } else {
      const fileP = document.createElement("p");
      fileP.classList.add("file-attachment");
      fileP.innerHTML = `<span class="material-symbols-rounded">description</span>${userData.file.fileName}`;
      userMsgDiv.appendChild(fileP);
    }
  }

  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const botMsgHTML = `<img src="gemini.png" class="avatar"><p class="message-text">just a second.. </p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};
//input file
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    previewImg.src = e.target.result;
    previewImg.style.display = "block";
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage
    };
  };

  reader.readAsDataURL(file);
});
//cancel
cancelBtn.addEventListener("click", () => {
  userData.file = {};
  fileInput.value = "";
  previewImg.src = "";
  previewImg.style.display = "none";
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});
//stop
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
  const loadingBotMsg = chatsContainer.querySelector(".bot-message.loading");
  if (loadingBotMsg) {
    loadingBotMsg.classList.remove("loading");
  }
});
//delete
document.addEventListener("DOMContentLoaded", () => {
  const deleteChatsBtn = document.querySelector("#delete-chats-btn");
  if (deleteChatsBtn) {
    deleteChatsBtn.addEventListener("click", () => {
      chatHistory.length = 0;
      chatsContainer.innerHTML = "";
      document.body.classList.remove("bot-responding");
    });
  } else {
    console.warn("Delete chats button (#delete-chats-btn) not found in DOM.");
  }
});
//theme
Themetoggle.addEventListener("click", () => {
  const islightTheme = document.body.classList.toggle("light-theme");
  Themetoggle.textContent = islightTheme ? "dark_mode" : "light mode";
});

promptForm.addEventListener("submit", handleFormsSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());



